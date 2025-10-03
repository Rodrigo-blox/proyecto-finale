const { Plan, Conexion, Cliente, Puerto, NAP } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

/**
 * Obtiene una lista paginada de planes de servicio con estadísticas de uso
 * 
 * @async
 * @function obtenerPlanes
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.query - Parámetros de consulta
 * @param {number} [req.query.page=1] - Número de página
 * @param {number} [req.query.limit=10] - Límite de registros por página
 * @param {string} [req.query.buscar] - Término de búsqueda por nombre del plan
 * @param {boolean} [req.query.activo=true] - Filtro por estado activo
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con lista paginada de planes y estadísticas
 * 
 * @example
 * // GET /api/planes?page=1&limit=5&buscar=Fibra
 * // Respuesta:
 * // {
 * //   success: true,
 * //   data: [
 * //     {
 * //       id: 1,
 * //       nombre: "Fibra 100 Mbps",
 * //       velocidad_mbps: 100,
 * //       descripcion: "Plan residencial básico",
 * //       estadisticas: {
 * //         conexiones_totales: 50,
 * //         conexiones_activas: 45,
 * //         conexiones_suspendidas: 3,
 * //         conexiones_finalizadas: 2
 * //       }
 * //     }
 * //   ],
 * //   pagination: { total: 8, pages: 2, currentPage: 1, limit: 5 }
 * // }
 * 
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Implementa paginación completa con metadatos
 * - Búsqueda por nombre de plan (case-insensitive)
 * - Incluye estadísticas de conexiones por estado
 * - Relaciones: conexiones → clientes → puertos/NAPs
 * - Ordena por fecha de creación descendente
 */
const obtenerPlanes = async (req, res) => {
  try {
    const { page = 1, limit = 10, buscar, activo = true } = req.query;
    const offset = (page - 1) * limit;

    let whereCondition = {};

    if (buscar) {
      whereCondition.nombre = { [Op.iLike]: `%${buscar}%` };
    }

    const planes = await Plan.findAndCountAll({
      where: whereCondition,
      include: [{
        model: Conexion,
        as: 'conexiones',
        include: [
          { model: Cliente, as: 'cliente' },
          {
            model: Puerto,
            as: 'puerto',
            include: [{ model: NAP, as: 'nap' }]
          }
        ]
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    const planesConEstadisticas = planes.rows.map(plan => {
      const conexionesActivas = plan.conexiones?.filter(c => c.estado === 'ACTIVA') || [];
      return {
        ...plan.toJSON(),
        estadisticas: {
          conexiones_totales: plan.conexiones?.length || 0,
          conexiones_activas: conexionesActivas.length,
          conexiones_suspendidas: plan.conexiones?.filter(c => c.estado === 'SUSPENDIDA').length || 0,
          conexiones_finalizadas: plan.conexiones?.filter(c => c.estado === 'FINALIZADA').length || 0
        }
      };
    });

    res.json({
      success: true,
      data: planesConEstadisticas,
      pagination: {
        total: planes.count,
        pages: Math.ceil(planes.count / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener planes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtiene un plan específico por su ID con estadísticas detalladas
 * 
 * @async
 * @function obtenerPlanPorId
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de ruta
 * @param {string} req.params.id - ID único del plan
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con datos completos del plan
 * 
 * @example
 * // GET /api/planes/1
 * // Respuesta:
 * // {
 * //   success: true,
 * //   data: {
 * //     id: 1,
 * //     nombre: "Fibra 100 Mbps",
 * //     velocidad_mbps: 100,
 * //     descripcion: "Plan residencial básico",
 * //     conexiones: [...], // Conexiones completas con clientes
 * //     estadisticas: {
 * //       conexiones_totales: 50,
 * //       conexiones_activas: 45,
 * //       conexiones_suspendidas: 3,
 * //       conexiones_finalizadas: 2
 * //     }
 * //   }
 * // }
 * 
 * @throws {404} Plan no encontrado
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Incluye todas las conexiones del plan con relaciones completas
 * - Calcula estadísticas detalladas de uso
 * - Proporciona vista completa para edición y análisis
 * - Útil para reportes de rendimiento por plan
 */
const obtenerPlanPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Plan.findByPk(id, {
      include: [{
        model: Conexion,
        as: 'conexiones',
        include: [
          { model: Cliente, as: 'cliente' },
          {
            model: Puerto,
            as: 'puerto',
            include: [{ model: NAP, as: 'nap' }]
          }
        ]
      }]
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan no encontrado'
      });
    }

    const conexionesActivas = plan.conexiones?.filter(c => c.estado === 'ACTIVA') || [];
    const planConEstadisticas = {
      ...plan.toJSON(),
      estadisticas: {
        conexiones_totales: plan.conexiones?.length || 0,
        conexiones_activas: conexionesActivas.length,
        conexiones_suspendidas: plan.conexiones?.filter(c => c.estado === 'SUSPENDIDA').length || 0,
        conexiones_finalizadas: plan.conexiones?.filter(c => c.estado === 'FINALIZADA').length || 0
      }
    };

    res.json({
      success: true,
      data: planConEstadisticas
    });
  } catch (error) {
    console.error('Error al obtener plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Crea un nuevo plan de servicio
 * 
 * @async
 * @function crearPlan
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.body - Datos del plan a crear
 * @param {string} req.body.nombre - Nombre único del plan
 * @param {number} req.body.velocidad_mbps - Velocidad del plan en Mbps
 * @param {string} [req.body.descripcion] - Descripción detallada del plan
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con plan creado
 * 
 * @example
 * // POST /api/planes
 * // Body: {
 * //   nombre: "Fibra 200 Mbps Premium",
 * //   velocidad_mbps: 200,
 * //   descripcion: "Plan empresarial de alta velocidad"
 * // }
 * 
 * @throws {400} Datos inválidos o nombre duplicado
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Valida datos de entrada usando express-validator
 * - Verifica unicidad del nombre del plan
 * - Crea plan con estado activo por defecto
 * - Retorna el plan creado con su ID asignado
 */
const crearPlan = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { nombre, velocidad_mbps, descripcion } = req.body;

    const planExistente = await Plan.findOne({ where: { nombre } });
    if (planExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un plan con este nombre'
      });
    }

    const plan = await Plan.create({
      nombre,
      velocidad_mbps,
      descripcion
    });

    res.status(201).json({
      success: true,
      message: 'Plan creado exitosamente',
      data: plan
    });
  } catch (error) {
    console.error('Error al crear plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Actualiza los datos de un plan existente
 * 
 * @async
 * @function actualizarPlan
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de ruta
 * @param {string} req.params.id - ID del plan a actualizar
 * @param {Object} req.body - Nuevos datos del plan
 * @param {string} req.body.nombre - Nuevo nombre del plan
 * @param {number} req.body.velocidad_mbps - Nueva velocidad en Mbps
 * @param {string} [req.body.descripcion] - Nueva descripción
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con plan actualizado
 * 
 * @example
 * // PUT /api/planes/1
 * // Body: {
 * //   velocidad_mbps: 150,
 * //   descripcion: "Plan mejorado con mayor velocidad"
 * // }
 * 
 * @throws {400} Datos inválidos o nombre duplicado
 * @throws {404} Plan no encontrado
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Valida existencia del plan antes de actualizar
 * - Verifica unicidad del nombre si se modifica
 * - Permite actualización parcial de campos
 * - Retorna el plan con los datos actualizados
 */
const actualizarPlan = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { nombre, velocidad_mbps, descripcion } = req.body;

    const plan = await Plan.findByPk(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan no encontrado'
      });
    }

    if (nombre !== plan.nombre) {
      const planExistente = await Plan.findOne({ where: { nombre } });
      if (planExistente) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un plan con este nombre'
        });
      }
    }

    await plan.update({
      nombre,
      velocidad_mbps,
      descripcion
    });

    res.json({
      success: true,
      message: 'Plan actualizado exitosamente',
      data: plan
    });
  } catch (error) {
    console.error('Error al actualizar plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Elimina un plan de servicio si no tiene conexiones activas
 * 
 * @async
 * @function eliminarPlan
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de ruta
 * @param {string} req.params.id - ID del plan a eliminar
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON confirmando eliminación
 * 
 * @example
 * // DELETE /api/planes/1
 * // Respuesta:
 * // {
 * //   success: true,
 * //   message: "Plan eliminado exitosamente"
 * // }
 * 
 * @throws {400} Plan tiene conexiones activas
 * @throws {404} Plan no encontrado
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Valida que el plan no tenga conexiones activas
 * - Permite eliminación solo si no hay dependencias activas
 * - Protege integridad referencial del sistema
 * - Elimina permanentemente el plan de la base de datos
 */
const eliminarPlan = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Plan.findByPk(id, {
      include: [{ model: Conexion, as: 'conexiones' }]
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan no encontrado'
      });
    }

    if (plan.conexiones && plan.conexiones.length > 0) {
      const conexionesActivas = plan.conexiones.filter(c => c.estado === 'ACTIVA');
      if (conexionesActivas.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar el plan porque tiene conexiones activas'
        });
      }
    }

    await plan.destroy();

    res.json({
      success: true,
      message: 'Plan eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  obtenerPlanes,
  obtenerPlanPorId,
  crearPlan,
  actualizarPlan,
  eliminarPlan
};