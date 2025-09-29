const { NAP, Puerto, Cliente, Conexion, Plan, Mantenimiento, Usuario } = require('../models');
const { Op } = require('sequelize');

const reporteOcupacionNAPs = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, formato = 'json' } = req.query;

    let whereCondition = {};
    if (fecha_desde || fecha_hasta) {
      whereCondition.createdAt = {};
      if (fecha_desde) {
        whereCondition.createdAt[Op.gte] = new Date(fecha_desde);
      }
      if (fecha_hasta) {
        whereCondition.createdAt[Op.lte] = new Date(fecha_hasta);
      }
    }

    const naps = await NAP.findAll({
      where: whereCondition,
      attributes: ['id', 'codigo', 'modelo', 'ubicacion', 'estado', 'total_puertos', 'createdAt'],
      include: [{
        model: Puerto,
        as: 'puertos',
        attributes: ['id', 'numero', 'estado'],
        include: [{
          model: Conexion,
          as: 'conexion',
          required: false,
          where: { estado: 'ACTIVA' },
          include: [
            { model: Cliente, as: 'cliente', attributes: ['nombre', 'ci'] },
            { model: Plan, as: 'plan', attributes: ['nombre', 'velocidad_mbps'] }
          ]
        }]
      }],
      order: [['codigo', 'ASC'], ['puertos', 'numero', 'ASC']]
    });

    const reporte = naps.map(nap => {
      const puertosLibres = nap.puertos.filter(p => p.estado === 'LIBRE').length;
      const puertosOcupados = nap.puertos.filter(p => p.estado === 'OCUPADO').length;
      const puertosMantenimiento = nap.puertos.filter(p => p.estado === 'MANTENIMIENTO').length;
      const porcentajeOcupacion = Math.round((puertosOcupados / nap.total_puertos) * 100);

      return {
        nap: {
          id: nap.id,
          codigo: nap.codigo,
          modelo: nap.modelo,
          ubicacion: nap.ubicacion,
          estado: nap.estado,
          fecha_instalacion: nap.createdAt
        },
        estadisticas: {
          total_puertos: nap.total_puertos,
          puertos_libres: puertosLibres,
          puertos_ocupados: puertosOcupados,
          puertos_mantenimiento: puertosMantenimiento,
          porcentaje_ocupacion: porcentajeOcupacion
        },
        conexiones_activas: nap.puertos
          .filter(p => p.conexion)
          .map(p => ({
            puerto: p.numero,
            cliente: p.conexion.cliente?.nombre || 'N/A',
            ci: p.conexion.cliente?.ci || 'N/A',
            plan: p.conexion.plan?.nombre || 'N/A',
            velocidad: p.conexion.plan?.velocidad_mbps || 0
          }))
      };
    });

    res.json({
      success: true,
      tipo: 'OCUPACION_NAPS',
      fecha_generacion: new Date(),
      parametros: { fecha_desde, fecha_hasta },
      data: reporte,
      resumen: {
        total_naps: reporte.length,
        total_puertos: reporte.reduce((sum, n) => sum + n.estadisticas.total_puertos, 0),
        total_ocupados: reporte.reduce((sum, n) => sum + n.estadisticas.puertos_ocupados, 0),
        promedio_ocupacion: Math.round(
          reporte.reduce((sum, n) => sum + n.estadisticas.porcentaje_ocupacion, 0) / reporte.length
        )
      }
    });
  } catch (error) {
    console.error('Error al generar reporte de ocupación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const reporteConsumoPorCliente = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, cliente_id } = req.query;

    let whereCondition = {};
    if (cliente_id) {
      whereCondition.cliente_id = cliente_id;
    }

    let conexionWhere = {};
    if (fecha_desde || fecha_hasta) {
      conexionWhere.createdAt = {};
      if (fecha_desde) {
        conexionWhere.createdAt[Op.gte] = new Date(fecha_desde);
      }
      if (fecha_hasta) {
        conexionWhere.createdAt[Op.lte] = new Date(fecha_hasta);
      }
    }

    const conexiones = await Conexion.findAll({
      where: { ...whereCondition, ...conexionWhere },
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Plan, as: 'plan' },
        {
          model: Puerto,
          as: 'puerto',
          include: [{ model: NAP, as: 'nap' }]
        }
      ],
      order: [['cliente', 'nombre'], ['createdAt', 'DESC']]
    });

    const clientesMap = new Map();

    conexiones.forEach(conexion => {
      const clienteId = conexion.cliente.id;

      if (!clientesMap.has(clienteId)) {
        clientesMap.set(clienteId, {
          cliente: {
            id: conexion.cliente.id,
            nombre: conexion.cliente.nombre,
            ci: conexion.cliente.ci,
            telefono: conexion.cliente.telefono,
            correo: conexion.cliente.correo
          },
          conexiones: [],
          resumen: {
            total_conexiones: 0,
            conexiones_activas: 0,
            conexiones_finalizadas: 0,
            planes_utilizados: new Set()
          }
        });
      }

      const cliente = clientesMap.get(clienteId);

      cliente.conexiones.push({
        id: conexion.id,
        plan: conexion.plan.nombre,
        velocidad_mbps: conexion.plan.velocidad_mbps,
        nap: conexion.puerto.nap.codigo,
        puerto: conexion.puerto.numero,
        fecha_inicio: conexion.fecha_inicio,
        fecha_fin: conexion.fecha_fin,
        estado: conexion.estado,
        dias_activo: conexion.fecha_fin
          ? Math.ceil((new Date(conexion.fecha_fin) - new Date(conexion.fecha_inicio)) / (1000 * 60 * 60 * 24))
          : Math.ceil((new Date() - new Date(conexion.fecha_inicio)) / (1000 * 60 * 60 * 24))
      });

      cliente.resumen.total_conexiones++;
      if (conexion.estado === 'ACTIVA') cliente.resumen.conexiones_activas++;
      if (conexion.estado === 'FINALIZADA') cliente.resumen.conexiones_finalizadas++;
      cliente.resumen.planes_utilizados.add(conexion.plan.nombre);
    });

    const reporte = Array.from(clientesMap.values()).map(cliente => ({
      ...cliente,
      resumen: {
        ...cliente.resumen,
        planes_utilizados: Array.from(cliente.resumen.planes_utilizados)
      }
    }));

    res.json({
      success: true,
      tipo: 'CONSUMO_POR_CLIENTE',
      fecha_generacion: new Date(),
      parametros: { fecha_desde, fecha_hasta, cliente_id },
      data: reporte,
      resumen: {
        total_clientes: reporte.length,
        total_conexiones: reporte.reduce((sum, c) => sum + c.resumen.total_conexiones, 0),
        conexiones_activas: reporte.reduce((sum, c) => sum + c.resumen.conexiones_activas, 0)
      }
    });
  } catch (error) {
    console.error('Error al generar reporte de consumo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const reporteEstadoTecnico = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta } = req.query;

    let whereCondition = {};
    if (fecha_desde || fecha_hasta) {
      whereCondition.createdAt = {};
      if (fecha_desde) {
        whereCondition.createdAt[Op.gte] = new Date(fecha_desde);
      }
      if (fecha_hasta) {
        whereCondition.createdAt[Op.lte] = new Date(fecha_hasta);
      }
    }

    const naps = await NAP.findAll({
      where: whereCondition,
      include: [
        {
          model: Puerto,
          as: 'puertos',
          include: [{
            model: Conexion,
            as: 'conexion',
            required: false,
            where: { estado: 'ACTIVA' }
          }]
        },
        {
          model: Mantenimiento,
          as: 'mantenimientos',
          include: [{ model: Usuario, as: 'tecnico', attributes: ['nombre'] }],
          limit: 5,
          order: [['fecha', 'DESC']]
        }
      ]
    });

    const reporte = naps.map(nap => {
      const puertosOcupados = nap.puertos.filter(p => p.estado === 'OCUPADO').length;
      const porcentajeOcupacion = Math.round((puertosOcupados / nap.total_puertos) * 100);

      let estadoTecnico = 'BUENO';
      if (nap.estado === 'MANTENIMIENTO') {
        estadoTecnico = 'MANTENIMIENTO';
      } else if (nap.estado === 'SATURADO' || porcentajeOcupacion >= 90) {
        estadoTecnico = 'CRITICO';
      } else if (porcentajeOcupacion >= 75) {
        estadoTecnico = 'ADVERTENCIA';
      }

      const ultimoMantenimiento = nap.mantenimientos[0];
      const mantenimientosCorrectivos = nap.mantenimientos.filter(m => m.tipo === 'CORRECTIVO').length;

      return {
        nap: {
          id: nap.id,
          codigo: nap.codigo,
          modelo: nap.modelo,
          firmware: nap.firmware,
          ubicacion: nap.ubicacion,
          estado: nap.estado
        },
        estado_tecnico: estadoTecnico,
        ocupacion: {
          porcentaje: porcentajeOcupacion,
          puertos_ocupados: puertosOcupados,
          total_puertos: nap.total_puertos
        },
        mantenimiento: {
          ultimo_mantenimiento: ultimoMantenimiento ? {
            fecha: ultimoMantenimiento.fecha,
            tipo: ultimoMantenimiento.tipo,
            tecnico: ultimoMantenimiento.tecnico?.nombre
          } : null,
          total_mantenimientos: nap.mantenimientos.length,
          mantenimientos_correctivos: mantenimientosCorrectivos,
          dias_desde_ultimo: ultimoMantenimiento
            ? Math.ceil((new Date() - new Date(ultimoMantenimiento.fecha)) / (1000 * 60 * 60 * 24))
            : null
        }
      };
    });

    const estadisticasGenerales = {
      total_naps: reporte.length,
      buenos: reporte.filter(n => n.estado_tecnico === 'BUENO').length,
      advertencia: reporte.filter(n => n.estado_tecnico === 'ADVERTENCIA').length,
      criticos: reporte.filter(n => n.estado_tecnico === 'CRITICO').length,
      mantenimiento: reporte.filter(n => n.estado_tecnico === 'MANTENIMIENTO').length
    };

    res.json({
      success: true,
      tipo: 'ESTADO_TECNICO',
      fecha_generacion: new Date(),
      parametros: { fecha_desde, fecha_hasta },
      data: reporte,
      resumen: estadisticasGenerales
    });
  } catch (error) {
    console.error('Error al generar reporte técnico:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const obtenerTiposReporte = async (req, res) => {
  try {
    const tipos = [
      {
        id: 'ocupacion',
        nombre: 'Reporte de Ocupación por NAP',
        descripcion: 'Muestra el estado de ocupación de puertos por cada NAP',
        parametros: ['fecha_desde', 'fecha_hasta']
      },
      {
        id: 'consumo',
        nombre: 'Reporte de Consumo por Cliente',
        descripcion: 'Detalle del consumo y conexiones por cliente',
        parametros: ['fecha_desde', 'fecha_hasta', 'cliente_id']
      },
      {
        id: 'tecnico',
        nombre: 'Reporte de Estado Técnico',
        descripcion: 'Estado técnico y mantenimientos de los NAPs',
        parametros: ['fecha_desde', 'fecha_hasta']
      }
    ];

    res.json({
      success: true,
      data: tipos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  reporteOcupacionNAPs,
  reporteConsumoPorCliente,
  reporteEstadoTecnico,
  obtenerTiposReporte
};