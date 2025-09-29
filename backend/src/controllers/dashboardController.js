const { NAP, Puerto, Cliente, Conexion, Plan, Mantenimiento, Usuario } = require('../models');
const { Op } = require('sequelize');

const obtenerEstadisticasGenerales = async (req, res) => {
  try {
    const totalNAPs = await NAP.count();
    const totalClientes = await Cliente.count();
    const totalPlanes = await Plan.count();
    const totalConexiones = await Conexion.count();

    const conexionesActivas = await Conexion.count({
      where: { estado: 'ACTIVA' }
    });

    const conexionesSuspendidas = await Conexion.count({
      where: { estado: 'SUSPENDIDA' }
    });

    const conexionesFinalizadas = await Conexion.count({
      where: { estado: 'FINALIZADA' }
    });

    const totalPuertos = await Puerto.count();
    const puertosLibres = await Puerto.count({
      where: { estado: 'LIBRE' }
    });
    const puertosOcupados = await Puerto.count({
      where: { estado: 'OCUPADO' }
    });
    const puertosMantenimiento = await Puerto.count({
      where: { estado: 'MANTENIMIENTO' }
    });

    const napsActivos = await NAP.count({
      where: { estado: 'ACTIVO' }
    });
    const napsMantenimiento = await NAP.count({
      where: { estado: 'MANTENIMIENTO' }
    });
    const napsSaturados = await NAP.count({
      where: { estado: 'SATURADO' }
    });

    const porcentajeOcupacion = totalPuertos > 0
      ? Math.round((puertosOcupados / totalPuertos) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        resumen: {
          total_naps: totalNAPs,
          total_clientes: totalClientes,
          total_planes: totalPlanes,
          total_conexiones: totalConexiones,
          conexiones_activas: conexionesActivas,
          porcentaje_ocupacion: porcentajeOcupacion
        },
        naps: {
          total: totalNAPs,
          activos: napsActivos,
          mantenimiento: napsMantenimiento,
          saturados: napsSaturados
        },
        puertos: {
          total: totalPuertos,
          libres: puertosLibres,
          ocupados: puertosOcupados,
          mantenimiento: puertosMantenimiento,
          porcentaje_ocupacion: porcentajeOcupacion
        },
        conexiones: {
          total: totalConexiones,
          activas: conexionesActivas,
          suspendidas: conexionesSuspendidas,
          finalizadas: conexionesFinalizadas
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas generales:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const obtenerAlertas = async (req, res) => {
  try {
    const alertas = [];

    const napsSaturados = await NAP.findAll({
      where: { estado: 'SATURADO' },
      attributes: ['id', 'codigo', 'ubicacion', 'total_puertos']
    });

    for (const nap of napsSaturados) {
      alertas.push({
        tipo: 'NAP_SATURADO',
        nivel: 'CRITICO',
        mensaje: `NAP ${nap.codigo} está saturado`,
        detalle: `Ubicación: ${nap.ubicacion}`,
        nap_id: nap.id,
        fecha: new Date()
      });
    }

    const napsMantenimiento = await NAP.findAll({
      where: { estado: 'MANTENIMIENTO' },
      attributes: ['id', 'codigo', 'ubicacion']
    });

    for (const nap of napsMantenimiento) {
      alertas.push({
        tipo: 'NAP_MANTENIMIENTO',
        nivel: 'ADVERTENCIA',
        mensaje: `NAP ${nap.codigo} en mantenimiento`,
        detalle: `Ubicación: ${nap.ubicacion}`,
        nap_id: nap.id,
        fecha: new Date()
      });
    }

    const napsProximosSaturacion = await NAP.findAll({
      attributes: ['id', 'codigo', 'ubicacion', 'total_puertos'],
      include: [{
        model: Puerto,
        as: 'puertos',
        attributes: ['estado']
      }]
    });

    for (const nap of napsProximosSaturacion) {
      const puertosOcupados = nap.puertos.filter(p => p.estado === 'OCUPADO').length;
      const porcentajeOcupacion = (puertosOcupados / nap.total_puertos) * 100;

      if (porcentajeOcupacion >= 80 && porcentajeOcupacion < 100) {
        alertas.push({
          tipo: 'NAP_PROXIMO_SATURACION',
          nivel: 'ADVERTENCIA',
          mensaje: `NAP ${nap.codigo} próximo a saturación (${Math.round(porcentajeOcupacion)}%)`,
          detalle: `Ubicación: ${nap.ubicacion}, ${puertosOcupados}/${nap.total_puertos} puertos ocupados`,
          nap_id: nap.id,
          fecha: new Date()
        });
      }
    }

    const mantenimientosRecientes = await Mantenimiento.findAll({
      where: {
        tipo: 'CORRECTIVO',
        fecha: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
        }
      },
      include: [{ model: NAP, as: 'nap', attributes: ['codigo', 'ubicacion'] }]
    });

    for (const mantenimiento of mantenimientosRecientes) {
      alertas.push({
        tipo: 'MANTENIMIENTO_CORRECTIVO',
        nivel: 'INFO',
        mensaje: `Mantenimiento correctivo en NAP ${mantenimiento.nap.codigo}`,
        detalle: `${mantenimiento.descripcion.substring(0, 100)}...`,
        nap_id: mantenimiento.nap_id,
        fecha: mantenimiento.fecha
      });
    }

    alertas.sort((a, b) => {
      const nivelesOrden = { 'CRITICO': 3, 'ADVERTENCIA': 2, 'INFO': 1 };
      return nivelesOrden[b.nivel] - nivelesOrden[a.nivel];
    });

    res.json({
      success: true,
      data: alertas,
      total: alertas.length
    });
  } catch (error) {
    console.error('Error al obtener alertas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const obtenerOcupacionNAPs = async (req, res) => {
  try {
    const naps = await NAP.findAll({
      attributes: ['id', 'codigo', 'ubicacion', 'estado', 'total_puertos', 'latitud', 'longitud'],
      include: [{
        model: Puerto,
        as: 'puertos',
        attributes: ['estado']
      }]
    });

    const ocupacionNAPs = naps.map(nap => {
      const puertosLibres = nap.puertos.filter(p => p.estado === 'LIBRE').length;
      const puertosOcupados = nap.puertos.filter(p => p.estado === 'OCUPADO').length;
      const puertosMantenimiento = nap.puertos.filter(p => p.estado === 'MANTENIMIENTO').length;

      const porcentajeOcupacion = Math.round((puertosOcupados / nap.total_puertos) * 100);

      return {
        id: nap.id,
        codigo: nap.codigo,
        ubicacion: nap.ubicacion,
        estado: nap.estado,
        coordenadas: {
          latitud: parseFloat(nap.latitud),
          longitud: parseFloat(nap.longitud)
        },
        puertos: {
          total: nap.total_puertos,
          libres: puertosLibres,
          ocupados: puertosOcupados,
          mantenimiento: puertosMantenimiento,
          porcentaje_ocupacion: porcentajeOcupacion
        }
      };
    });

    res.json({
      success: true,
      data: ocupacionNAPs
    });
  } catch (error) {
    console.error('Error al obtener ocupación de NAPs:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const obtenerEstadisticasPorPeriodo = async (req, res) => {
  try {
    const { periodo = '30' } = req.query; // días
    const fechaDesde = new Date(Date.now() - parseInt(periodo) * 24 * 60 * 60 * 1000);

    const nuevasConexiones = await Conexion.count({
      where: {
        createdAt: { [Op.gte]: fechaDesde }
      }
    });

    const conexionesFinalizadas = await Conexion.count({
      where: {
        estado: 'FINALIZADA',
        updatedAt: { [Op.gte]: fechaDesde }
      }
    });

    const nuevosClientes = await Cliente.count({
      where: {
        createdAt: { [Op.gte]: fechaDesde }
      }
    });

    const mantenimientosRealizados = await Mantenimiento.count({
      where: {
        fecha: { [Op.gte]: fechaDesde }
      }
    });

    const mantenimientosCorrectivos = await Mantenimiento.count({
      where: {
        tipo: 'CORRECTIVO',
        fecha: { [Op.gte]: fechaDesde }
      }
    });

    const mantenimientosPreventivos = await Mantenimiento.count({
      where: {
        tipo: 'PREVENTIVO',
        fecha: { [Op.gte]: fechaDesde }
      }
    });

    res.json({
      success: true,
      data: {
        periodo_dias: parseInt(periodo),
        nuevas_conexiones: nuevasConexiones,
        conexiones_finalizadas: conexionesFinalizadas,
        nuevos_clientes: nuevosClientes,
        mantenimientos: {
          total: mantenimientosRealizados,
          correctivos: mantenimientosCorrectivos,
          preventivos: mantenimientosPreventivos
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas por período:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  obtenerEstadisticasGenerales,
  obtenerAlertas,
  obtenerOcupacionNAPs,
  obtenerEstadisticasPorPeriodo
};