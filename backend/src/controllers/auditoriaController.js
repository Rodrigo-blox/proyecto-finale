const { Auditoria, Usuario } = require('../models');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');

const registrarCambio = async (tabla, registro_id, accion, datos_anteriores, datos_nuevos, usuario_id) => {
  try {
    await Auditoria.create({
      tabla,
      registro_id,
      accion,
      datos_anteriores: datos_anteriores ? JSON.stringify(datos_anteriores) : null,
      datos_nuevos: datos_nuevos ? JSON.stringify(datos_nuevos) : null,
      cambiado_por: usuario_id,
      fecha: new Date()
    });
  } catch (error) {
    console.error('Error al registrar auditoría:', error);
  }
};

const obtenerHistorialCambios = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      tabla,
      registro_id,
      accion,
      usuario_id,
      fecha_desde,
      fecha_hasta
    } = req.query;

    const offset = (page - 1) * limit;

    let whereCondition = {};

    if (tabla) {
      whereCondition.tabla = tabla;
    }

    if (registro_id) {
      whereCondition.registro_id = registro_id;
    }

    if (accion) {
      whereCondition.accion = accion;
    }

    if (usuario_id) {
      whereCondition.cambiado_por = usuario_id;
    }

    if (fecha_desde || fecha_hasta) {
      whereCondition.fecha = {};
      if (fecha_desde) {
        whereCondition.fecha[Op.gte] = new Date(fecha_desde);
      }
      if (fecha_hasta) {
        whereCondition.fecha[Op.lte] = new Date(fecha_hasta);
      }
    }

    const auditorias = await Auditoria.findAndCountAll({
      where: whereCondition,
      include: [{
        model: Usuario,
        as: 'usuario',
        attributes: ['id', 'nombre', 'correo', 'rol']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['fecha', 'DESC']]
    });

    const auditoriasFormateadas = auditorias.rows.map(auditoria => {
      let datos_anteriores = null;
      let datos_nuevos = null;

      try {
        datos_anteriores = auditoria.datos_anteriores ? JSON.parse(auditoria.datos_anteriores) : null;
      } catch (e) {
        datos_anteriores = auditoria.datos_anteriores;
      }

      try {
        datos_nuevos = auditoria.datos_nuevos ? JSON.parse(auditoria.datos_nuevos) : null;
      } catch (e) {
        datos_nuevos = auditoria.datos_nuevos;
      }

      return {
        id: auditoria.id,
        tabla: auditoria.tabla,
        registro_id: auditoria.registro_id,
        accion: auditoria.accion,
        datos_anteriores,
        datos_nuevos,
        fecha: auditoria.fecha,
        usuario: auditoria.usuario
      };
    });

    res.json({
      success: true,
      data: auditoriasFormateadas,
      pagination: {
        total: auditorias.count,
        pages: Math.ceil(auditorias.count / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener historial de cambios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const obtenerHistorialPorRegistro = async (req, res) => {
  try {
    const { tabla, registro_id } = req.params;
    const { limit = 50 } = req.query;

    const auditorias = await Auditoria.findAll({
      where: {
        tabla,
        registro_id
      },
      include: [{
        model: Usuario,
        as: 'usuario',
        attributes: ['id', 'nombre', 'correo', 'rol']
      }],
      limit: parseInt(limit),
      order: [['fecha', 'DESC']]
    });

    const historialFormateado = auditorias.map(auditoria => {
      let datos_anteriores = null;
      let datos_nuevos = null;

      try {
        datos_anteriores = auditoria.datos_anteriores ? JSON.parse(auditoria.datos_anteriores) : null;
      } catch (e) {
        datos_anteriores = auditoria.datos_anteriores;
      }

      try {
        datos_nuevos = auditoria.datos_nuevos ? JSON.parse(auditoria.datos_nuevos) : null;
      } catch (e) {
        datos_nuevos = auditoria.datos_nuevos;
      }

      const cambios = [];
      if (datos_anteriores && datos_nuevos && typeof datos_anteriores === 'object' && typeof datos_nuevos === 'object') {
        Object.keys(datos_nuevos).forEach(campo => {
          if (datos_anteriores[campo] !== datos_nuevos[campo]) {
            cambios.push({
              campo,
              valor_anterior: datos_anteriores[campo],
              valor_nuevo: datos_nuevos[campo]
            });
          }
        });
      }

      return {
        id: auditoria.id,
        accion: auditoria.accion,
        cambios,
        fecha: auditoria.fecha,
        usuario: auditoria.usuario
      };
    });

    res.json({
      success: true,
      data: historialFormateado,
      total: historialFormateado.length
    });
  } catch (error) {
    console.error('Error al obtener historial del registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const obtenerEstadisticasAuditoria = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, usuario_id } = req.query;

    let whereCondition = {};

    if (usuario_id) {
      whereCondition.cambiado_por = usuario_id;
    }

    if (fecha_desde || fecha_hasta) {
      whereCondition.fecha = {};
      if (fecha_desde) {
        whereCondition.fecha[Op.gte] = new Date(fecha_desde);
      }
      if (fecha_hasta) {
        whereCondition.fecha[Op.lte] = new Date(fecha_hasta);
      }
    }

    const estadisticasPorAccion = await Auditoria.findAll({
      where: whereCondition,
      attributes: [
        'accion',
        [Auditoria.sequelize.fn('COUNT', Auditoria.sequelize.col('Auditoria.id')), 'cantidad']
      ],
      group: ['accion']
    });

    const estadisticasPorTabla = await Auditoria.findAll({
      where: whereCondition,
      attributes: [
        'tabla',
        [Auditoria.sequelize.fn('COUNT', Auditoria.sequelize.col('Auditoria.id')), 'cantidad']
      ],
      group: ['tabla']
    });

    const estadisticasPorUsuario = await Auditoria.findAll({
      where: whereCondition,
      attributes: [
        'cambiado_por',
        [Auditoria.sequelize.fn('COUNT', Auditoria.sequelize.col('Auditoria.id')), 'cantidad']
      ],
      include: [{
        model: Usuario,
        as: 'usuario',
        attributes: ['nombre', 'correo']
      }],
      group: ['cambiado_por', 'usuario.id', 'usuario.nombre', 'usuario.correo']
    });

    const total = await Auditoria.count({ where: whereCondition });

    res.json({
      success: true,
      data: {
        total_cambios: total,
        por_accion: estadisticasPorAccion.reduce((acc, stat) => {
          acc[stat.accion] = parseInt(stat.dataValues.cantidad);
          return acc;
        }, {}),
        por_tabla: estadisticasPorTabla.reduce((acc, stat) => {
          acc[stat.tabla] = parseInt(stat.dataValues.cantidad);
          return acc;
        }, {}),
        por_usuario: estadisticasPorUsuario.map(stat => ({
          usuario_id: stat.cambiado_por,
          nombre: stat.usuario.nombre,
          correo: stat.usuario.correo,
          cantidad: parseInt(stat.dataValues.cantidad)
        }))
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de auditoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const obtenerTablasAuditadas = async (req, res) => {
  try {
    const tablas = await Auditoria.findAll({
      attributes: [
        'tabla',
        [Auditoria.sequelize.fn('COUNT', Auditoria.sequelize.col('Auditoria.id')), 'total_cambios'],
        [Auditoria.sequelize.fn('MAX', Auditoria.sequelize.col('Auditoria.fecha')), 'ultimo_cambio']
      ],
      group: ['tabla'],
      order: [['tabla', 'ASC']]
    });

    const tablasFormateadas = tablas.map(tabla => ({
      nombre: tabla.tabla,
      total_cambios: parseInt(tabla.dataValues.total_cambios),
      ultimo_cambio: tabla.dataValues.ultimo_cambio
    }));

    res.json({
      success: true,
      data: tablasFormateadas
    });
  } catch (error) {
    console.error('Error al obtener tablas auditadas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const exportarAExcel = async (req, res) => {
  try {
    const {
      tabla,
      registro_id,
      accion,
      usuario_id,
      fecha_desde,
      fecha_hasta
    } = req.query;

    let whereCondition = {};

    if (tabla) {
      whereCondition.tabla = tabla;
    }

    if (registro_id) {
      whereCondition.registro_id = registro_id;
    }

    if (accion) {
      whereCondition.accion = accion;
    }

    if (usuario_id) {
      whereCondition.cambiado_por = usuario_id;
    }

    if (fecha_desde || fecha_hasta) {
      whereCondition.fecha = {};
      if (fecha_desde) {
        whereCondition.fecha[Op.gte] = new Date(fecha_desde);
      }
      if (fecha_hasta) {
        whereCondition.fecha[Op.lte] = new Date(fecha_hasta);
      }
    }

    const auditorias = await Auditoria.findAll({
      where: whereCondition,
      include: [{
        model: Usuario,
        as: 'usuario',
        attributes: ['id', 'nombre', 'correo', 'rol']
      }],
      order: [['fecha', 'DESC']],
      limit: 10000
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Auditoría');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Fecha', key: 'fecha', width: 20 },
      { header: 'Tabla', key: 'tabla', width: 15 },
      { header: 'Registro ID', key: 'registro_id', width: 40 },
      { header: 'Acción', key: 'accion', width: 12 },
      { header: 'Usuario', key: 'usuario_nombre', width: 25 },
      { header: 'Correo Usuario', key: 'usuario_correo', width: 30 },
      { header: 'Rol Usuario', key: 'usuario_rol', width: 15 },
      { header: 'Cambios', key: 'cambios', width: 60 }
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF000000' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    auditorias.forEach(auditoria => {
      let datos_anteriores = null;
      let datos_nuevos = null;

      try {
        datos_anteriores = auditoria.datos_anteriores ? JSON.parse(auditoria.datos_anteriores) : null;
      } catch (e) {
        datos_anteriores = auditoria.datos_anteriores;
      }

      try {
        datos_nuevos = auditoria.datos_nuevos ? JSON.parse(auditoria.datos_nuevos) : null;
      } catch (e) {
        datos_nuevos = auditoria.datos_nuevos;
      }

      let cambiosTexto = '';
      if (auditoria.accion === 'CREATE') {
        cambiosTexto = 'Registro creado';
      } else if (auditoria.accion === 'DELETE') {
        cambiosTexto = 'Registro eliminado';
      } else if (auditoria.accion === 'UPDATE' && datos_anteriores && datos_nuevos) {
        const cambios = [];
        Object.keys(datos_nuevos).forEach(campo => {
          if (datos_anteriores[campo] !== datos_nuevos[campo]) {
            cambios.push(`${campo}: ${datos_anteriores[campo]} → ${datos_nuevos[campo]}`);
          }
        });
        cambiosTexto = cambios.join(' | ');
      }

      worksheet.addRow({
        id: auditoria.id,
        fecha: new Date(auditoria.fecha).toLocaleString('es-ES'),
        tabla: auditoria.tabla,
        registro_id: auditoria.registro_id,
        accion: auditoria.accion,
        usuario_nombre: auditoria.usuario?.nombre || 'N/A',
        usuario_correo: auditoria.usuario?.correo || 'N/A',
        usuario_rol: auditoria.usuario?.rol || 'N/A',
        cambios: cambiosTexto
      });
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=auditoria_${Date.now()}.xlsx`);
    res.setHeader('Content-Length', buffer.length);

    return res.end(buffer, 'binary');
  } catch (error) {
    console.error('Error al exportar auditoría a Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar el archivo Excel'
    });
  }
};

module.exports = {
  registrarCambio,
  obtenerHistorialCambios,
  obtenerHistorialPorRegistro,
  obtenerEstadisticasAuditoria,
  obtenerTablasAuditadas,
  exportarAExcel
};