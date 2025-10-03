const { NAP, Puerto, Cliente, Conexion, Plan, Mantenimiento, Usuario } = require('../models');
const { Op } = require('sequelize');

/**
 * Obtiene las estadísticas generales del sistema para el dashboard principal
 * 
 * @async
 * @function obtenerEstadisticasGenerales
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con estadísticas completas del sistema
 * 
 * @example
 * // GET /api/dashboard/estadisticas
 * // Respuesta:
 * // {
 * //   success: true,
 * //   data: {
 * //     resumen: {
 * //       total_naps: 50,
 * //       total_clientes: 120,
 * //       total_planes: 8,
 * //       total_conexiones: 95,
 * //       conexiones_activas: 85,
 * //       porcentaje_ocupacion: 75
 * //     },
 * //     naps: { total: 50, activos: 45, mantenimiento: 3, saturados: 2 },
 * //     puertos: { total: 800, libres: 200, ocupados: 600, mantenimiento: 0 },
 * //     conexiones: { total: 95, activas: 85, suspendidas: 5, finalizadas: 5 }
 * //   }
 * // }
 * 
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Proporciona métricas completas del sistema
 * - Calcula estadísticas de NAPs por estado
 * - Analiza ocupación de puertos y porcentajes
 * - Resumen de conexiones por estado
 * - Datos optimizados para widgets de dashboard
 * - Incluye KPIs principales del negocio
 */
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

/**
 * Obtiene y genera alertas del sistema basadas en el estado de NAPs y mantenimientos
 * 
 * @async
 * @function obtenerAlertas
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con lista de alertas ordenadas por prioridad
 * 
 * @example
 * // GET /api/dashboard/alertas
 * // Respuesta:
 * // {
 * //   success: true,
 * //   data: [
 * //     {
 * //       tipo: "NAP_SATURADO",
 * //       nivel: "CRITICO",
 * //       mensaje: "NAP NAP001 está saturado",
 * //       detalle: "Ubicación: Av. Principal 123",
 * //       nap_id: 1,
 * //       fecha: "2024-03-15T10:30:00Z"
 * //     }
 * //   ],
 * //   total: 5
 * // }
 * 
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Detecta NAPs saturados (100% ocupación) - CRÍTICO
 * - Identifica NAPs en mantenimiento - ADVERTENCIA
 * - Alerta NAPs próximos a saturación (80-99%) - ADVERTENCIA
 * - Reporta mantenimientos correctivos recientes - INFO
 * - Actualiza automáticamente estado de NAPs a SATURADO
 * - Ordena alertas por nivel de prioridad (CRÍTICO > ADVERTENCIA > INFO)
 * - Sistema de monitoreo proactivo
 */
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

    // Buscar NAPs activos para verificar ocupación (excluir los que ya están en mantenimiento o saturados)
    const napsProximosSaturacion = await NAP.findAll({
      where: {
        estado: 'ACTIVO'
      },
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

      // Alerta cuando está entre 80% y 99%
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

      // Actualizar estado del NAP a SATURADO si llega al 100%
      if (porcentajeOcupacion >= 100) {
        await nap.update({ estado: 'SATURADO' });
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

/**
 * Obtiene el estado de ocupación detallado de todos los NAPs
 * 
 * @async
 * @function obtenerOcupacionNAPs
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con ocupación detallada de cada NAP
 * 
 * @example
 * // GET /api/dashboard/ocupacion-naps
 * // Respuesta:
 * // {
 * //   success: true,
 * //   data: [
 * //     {
 * //       id: 1,
 * //       codigo: "NAP001",
 * //       ubicacion: "Av. Principal 123",
 * //       estado: "ACTIVO",
 * //       coordenadas: { latitud: -12.0464, longitud: -77.0428 },
 * //       puertos: {
 * //         total: 16,
 * //         libres: 4,
 * //         ocupados: 12,
 * //         mantenimiento: 0,
 * //         porcentaje_ocupacion: 75
 * //       }
 * //     }
 * //   ]
 * // }
 * 
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Proporciona vista detallada de ocupación de cada NAP
 * - Incluye coordenadas geográficas para mapas
 * - Calcula estadísticas de puertos por estado
 * - Porcentaje de ocupación redondeado
 * - Datos optimizados para visualizaciones de mapa
 * - Útil para análisis de capacidad y planificación
 */
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

/**
 * Obtiene estadísticas de actividad del sistema en un período específico
 * 
 * @async
 * @function obtenerEstadisticasPorPeriodo
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.query - Parámetros de consulta
 * @param {string} [req.query.periodo=30] - Número de días hacia atrás para el análisis
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con estadísticas del período especificado
 * 
 * @example
 * // GET /api/dashboard/estadisticas-periodo?periodo=7
 * // Respuesta:
 * // {
 * //   success: true,
 * //   data: {
 * //     periodo_dias: 7,
 * //     nuevas_conexiones: 15,
 * //     conexiones_finalizadas: 3,
 * //     nuevos_clientes: 8,
 * //     mantenimientos: {
 * //       total: 5,
 * //       correctivos: 2,
 * //       preventivos: 3
 * //     }
 * //   }
 * // }
 * 
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Analiza actividad en período configurable (días)
 * - Cuenta nuevas conexiones creadas
 * - Registra conexiones finalizadas
 * - Trackea crecimiento de clientes
 * - Desglose de mantenimientos por tipo
 * - Útil para reportes de actividad y tendencias
 * - Permite análisis de rendimiento temporal
 */
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