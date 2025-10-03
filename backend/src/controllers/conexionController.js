const { Conexion, Cliente, Plan, Puerto, NAP, Usuario } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

/**
 * Obtiene una lista paginada de conexiones con filtros opcionales
 * 
 * @async
 * @function obtenerConexiones
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.query - Parámetros de consulta
 * @param {number} [req.query.page=1] - Número de página
 * @param {number} [req.query.limit=10] - Límite de registros por página
 * @param {string} [req.query.estado] - Filtro por estado (ACTIVA, SUSPENDIDA, FINALIZADA)
 * @param {number} [req.query.cliente_id] - Filtro por ID de cliente
 * @param {number} [req.query.nap_id] - Filtro por ID de NAP
 * @param {string} [req.query.buscar] - Búsqueda por nombre o CI del cliente
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con lista paginada de conexiones
 * 
 * @example
 * // GET /api/conexiones?estado=ACTIVA&page=1&limit=5&buscar=Juan
 * // Respuesta:
 * // {
 * //   success: true,
 * //   data: [...], // Array de conexiones con relaciones
 * //   pagination: {
 * //     total: 25,
 * //     pages: 5,
 * //     currentPage: 1,
 * //     limit: 5
 * //   }
 * // }
 * 
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Implementa paginación completa con metadatos
 * - Filtros combinables por estado, cliente y NAP
 * - Búsqueda en nombre y CI del cliente
 * - Incluye relaciones: cliente, plan, puerto, NAP y usuario creador
 * - Ordena por fecha de creación descendente
 */
const obtenerConexiones = async (req, res) => {
  try {
    const { page = 1, limit = 10, estado, cliente_id, nap_id, buscar } = req.query;
    const offset = (page - 1) * limit;

    let whereCondition = {};
    let includeCondition = [
      { model: Cliente, as: 'cliente' },
      { model: Plan, as: 'plan' },
      { model: Usuario, as: 'creador', attributes: ['id', 'nombre', 'correo'] },
      {
        model: Puerto,
        as: 'puerto',
        include: [{ model: NAP, as: 'nap' }]
      }
    ];

    if (estado) {
      whereCondition.estado = estado;
    }

    if (cliente_id) {
      whereCondition.cliente_id = cliente_id;
    }

    if (nap_id) {
      includeCondition = includeCondition.map(inc => {
        if (inc.model === Puerto) {
          return {
            ...inc,
            include: [{
              model: NAP,
              as: 'nap',
              where: { id: nap_id }
            }]
          };
        }
        return inc;
      });
    }

    if (buscar) {
      includeCondition = includeCondition.map(inc => {
        if (inc.model === Cliente) {
          return {
            ...inc,
            where: {
              [Op.or]: [
                { nombre: { [Op.iLike]: `%${buscar}%` } },
                { ci: { [Op.iLike]: `%${buscar}%` } }
              ]
            }
          };
        }
        return inc;
      });
    }

    const conexiones = await Conexion.findAndCountAll({
      where: whereCondition,
      include: includeCondition,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: conexiones.rows,
      pagination: {
        total: conexiones.count,
        pages: Math.ceil(conexiones.count / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener conexiones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtiene una conexión específica por su ID con todos los datos relacionados
 * 
 * @async
 * @function obtenerConexionPorId
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de ruta
 * @param {string} req.params.id - ID único de la conexión
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con datos completos de la conexión
 * 
 * @example
 * // GET /api/conexiones/123
 * // Respuesta:
 * // {
 * //   success: true,
 * //   data: {
 * //     id: 123,
 * //     estado: "ACTIVA",
 * //     fecha_inicio: "2024-01-15",
 * //     cliente: {...},
 * //     plan: {...},
 * //     puerto: { nap: {...} },
 * //     creador: {...}
 * //   }
 * // }
 * 
 * @throws {404} Conexión no encontrada
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Incluye todas las relaciones: cliente, plan, puerto/NAP, usuario creador
 * - Proporciona vista completa de la conexión
 * - Útil para detalles y edición de conexiones
 */
const obtenerConexionPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const conexion = await Conexion.findByPk(id, {
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Plan, as: 'plan' },
        { model: Usuario, as: 'creador', attributes: ['id', 'nombre', 'correo'] },
        {
          model: Puerto,
          as: 'puerto',
          include: [{ model: NAP, as: 'nap' }]
        }
      ]
    });

    if (!conexion) {
      return res.status(404).json({
        success: false,
        message: 'Conexión no encontrada'
      });
    }

    res.json({
      success: true,
      data: conexion
    });
  } catch (error) {
    console.error('Error al obtener conexión:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Crea una nueva conexión asignando un puerto a un cliente con un plan
 * 
 * @async
 * @function crearConexion
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.body - Datos de la conexión
 * @param {number} req.body.puerto_id - ID del puerto a asignar
 * @param {number} req.body.cliente_id - ID del cliente
 * @param {number} req.body.plan_id - ID del plan de servicio
 * @param {string} req.body.fecha_inicio - Fecha de inicio del servicio
 * @param {string} [req.body.fecha_fin] - Fecha de finalización programada
 * @param {Object} req.usuario - Usuario autenticado
 * @param {number} req.usuario.id - ID del usuario que crea la conexión
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con conexión creada
 * 
 * @example
 * // POST /api/conexiones
 * // Body: {
 * //   puerto_id: 45,
 * //   cliente_id: 123,
 * //   plan_id: 7,
 * //   fecha_inicio: "2024-01-15",
 * //   fecha_fin: "2025-01-15"
 * // }
 * 
 * @throws {400} Datos inválidos, puerto no disponible o conexión duplicada
 * @throws {404} Puerto, cliente o plan no encontrado
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Valida disponibilidad del puerto (estado LIBRE)
 * - Verifica existencia de cliente y plan
 * - Previene conexiones duplicadas en el mismo puerto
 * - Actualiza puerto a estado OCUPADO
 * - Registra usuario creador para auditoría
 * - Crea conexión con estado ACTIVA por defecto
 */
const crearConexion = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { puerto_id, cliente_id, plan_id, fecha_inicio, fecha_fin } = req.body;
    const creado_por = req.usuario.id;

    const puerto = await Puerto.findByPk(puerto_id);
    if (!puerto) {
      return res.status(404).json({
        success: false,
        message: 'Puerto no encontrado'
      });
    }

    if (puerto.estado !== 'LIBRE') {
      return res.status(400).json({
        success: false,
        message: 'El puerto no está disponible'
      });
    }

    const cliente = await Cliente.findByPk(cliente_id);
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    const plan = await Plan.findByPk(plan_id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan no encontrado'
      });
    }

    const conexionExistente = await Conexion.findOne({
      where: {
        puerto_id,
        estado: 'ACTIVA'
      }
    });

    if (conexionExistente) {
      return res.status(400).json({
        success: false,
        message: 'El puerto ya tiene una conexión activa'
      });
    }

    const conexion = await Conexion.create({
      puerto_id,
      cliente_id,
      plan_id,
      fecha_inicio,
      fecha_fin,
      estado: 'ACTIVA',
      creado_por
    });

    await puerto.update({ estado: 'OCUPADO' });

    const conexionCompleta = await Conexion.findByPk(conexion.id, {
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Plan, as: 'plan' },
        { model: Usuario, as: 'creador', attributes: ['id', 'nombre', 'correo'] },
        {
          model: Puerto,
          as: 'puerto',
          include: [{ model: NAP, as: 'nap' }]
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Conexión creada exitosamente',
      data: conexionCompleta
    });
  } catch (error) {
    console.error('Error al crear conexión:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Actualiza los datos de una conexión existente
 * 
 * @async
 * @function actualizarConexion
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de ruta
 * @param {string} req.params.id - ID de la conexión a actualizar
 * @param {Object} req.body - Datos de actualización
 * @param {number} [req.body.plan_id] - Nuevo ID del plan
 * @param {string} [req.body.fecha_fin] - Nueva fecha de finalización
 * @param {string} [req.body.estado] - Nuevo estado (ACTIVA, SUSPENDIDA, FINALIZADA)
 * @param {Object} [req.usuario] - Usuario autenticado (para auditoría)
 * @param {number} [req.usuario.id] - ID del usuario que actualiza
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con conexión actualizada
 * 
 * @example
 * // PUT /api/conexiones/123
 * // Body: {
 * //   estado: "SUSPENDIDA",
 * //   fecha_fin: "2024-12-31"
 * // }
 * 
 * @throws {400} Datos de entrada inválidos
 * @throws {404} Conexión o plan no encontrado
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Permite actualización parcial de campos
 * - Actualiza estado del puerto según el estado de conexión:
 *   - FINALIZADA: libera puerto (LIBRE)
 *   - ACTIVA/SUSPENDIDA: mantiene puerto ocupado (OCUPADO)
 * - Valida existencia del nuevo plan si se cambia
 * - Registra auditoría de los cambios
 */
const actualizarConexion = async (req, res) => {
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
    const { plan_id, fecha_fin, estado } = req.body;

    const conexion = await Conexion.findByPk(id, {
      include: [{ model: Puerto, as: 'puerto' }]
    });

    if (!conexion) {
      return res.status(404).json({
        success: false,
        message: 'Conexión no encontrada'
      });
    }

    if (plan_id) {
      const plan = await Plan.findByPk(plan_id);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Plan no encontrado'
        });
      }
    }

    const estadoAnterior = conexion.estado;

    await conexion.update({
      plan_id: plan_id || conexion.plan_id,
      fecha_fin,
      estado: estado || conexion.estado
    }, { userId: req.usuario?.id });

    // Actualizar el estado del puerto según el estado de la conexión
    if (estado && estado !== estadoAnterior) {
      if (estado === 'FINALIZADA') {
        // Solo liberar el puerto cuando la conexión se finaliza
        await conexion.puerto.update({ estado: 'LIBRE' }, { userId: req.usuario?.id });
      } else if (estado === 'ACTIVA' || estado === 'SUSPENDIDA') {
        // ACTIVA y SUSPENDIDA mantienen el puerto ocupado
        await conexion.puerto.update({ estado: 'OCUPADO' }, { userId: req.usuario?.id });
      }
    }

    const conexionActualizada = await Conexion.findByPk(id, {
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Plan, as: 'plan' },
        { model: Usuario, as: 'creador', attributes: ['id', 'nombre', 'correo'] },
        {
          model: Puerto,
          as: 'puerto',
          include: [{ model: NAP, as: 'nap' }]
        }
      ]
    });

    res.json({
      success: true,
      message: 'Conexión actualizada exitosamente',
      data: conexionActualizada
    });
  } catch (error) {
    console.error('Error al actualizar conexión:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Finaliza una conexión activa, liberando el puerto asociado
 * 
 * @async
 * @function finalizarConexion
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de ruta
 * @param {string} req.params.id - ID de la conexión a finalizar
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con conexión finalizada
 * 
 * @example
 * // POST /api/conexiones/123/finalizar
 * // Respuesta:
 * // {
 * //   success: true,
 * //   message: "Conexión finalizada exitosamente",
 * //   data: {
 * //     id: 123,
 * //     estado: "FINALIZADA",
 * //     fecha_fin: "2024-03-15T10:30:00Z",
 * //     ...
 * //   }
 * // }
 * 
 * @throws {400} La conexión ya está finalizada
 * @throws {404} Conexión no encontrada
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Cambia estado de conexión a FINALIZADA
 * - Establece fecha_fin automáticamente
 * - Libera el puerto asociado (estado LIBRE)
 * - Actualiza estado de NAP si estaba SATURADO y ya no lo está
 * - Previene finalizar conexiones ya finalizadas
 * - Optimiza disponibilidad de recursos automáticamente
 */
const finalizarConexion = async (req, res) => {
  try {
    const { id } = req.params;

    const conexion = await Conexion.findByPk(id, {
      include: [{ model: Puerto, as: 'puerto' }]
    });

    if (!conexion) {
      return res.status(404).json({
        success: false,
        message: 'Conexión no encontrada'
      });
    }

    if (conexion.estado === 'FINALIZADA') {
      return res.status(400).json({
        success: false,
        message: 'La conexión ya está finalizada'
      });
    }

    await conexion.update({
      estado: 'FINALIZADA',
      fecha_fin: new Date()
    });

    await conexion.puerto.update({ estado: 'LIBRE' });

    // Verificar si el NAP estaba saturado y actualizar su estado
    const nap = await NAP.findByPk(conexion.puerto.nap_id, {
      include: [{
        model: Puerto,
        as: 'puertos',
        attributes: ['estado']
      }]
    });

    if (nap && nap.estado === 'SATURADO') {
      const puertosOcupados = nap.puertos.filter(p => p.estado === 'OCUPADO').length;
      const porcentajeOcupacion = (puertosOcupados / nap.total_puertos) * 100;

      // Si ya no está al 100%, cambiar el estado a ACTIVO
      if (porcentajeOcupacion < 100) {
        await nap.update({ estado: 'ACTIVO' });
      }
    }

    const conexionFinalizada = await Conexion.findByPk(id, {
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Plan, as: 'plan' },
        { model: Usuario, as: 'creador', attributes: ['id', 'nombre', 'correo'] },
        {
          model: Puerto,
          as: 'puerto',
          include: [{ model: NAP, as: 'nap' }]
        }
      ]
    });

    res.json({
      success: true,
      message: 'Conexión finalizada exitosamente',
      data: conexionFinalizada
    });
  } catch (error) {
    console.error('Error al finalizar conexión:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtiene todas las conexiones de un cliente específico
 * 
 * @async
 * @function obtenerConexionesPorCliente
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de ruta
 * @param {string} req.params.cliente_id - ID del cliente
 * @param {Object} req.query - Parámetros de consulta
 * @param {string} [req.query.estado] - Filtro por estado de conexión
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con conexiones del cliente
 * 
 * @example
 * // GET /api/conexiones/cliente/123?estado=ACTIVA
 * // Respuesta:
 * // {
 * //   success: true,
 * //   data: [
 * //     {
 * //       id: 456,
 * //       estado: "ACTIVA",
 * //       plan: {...},
 * //       puerto: { nap: {...} }
 * //     }
 * //   ]
 * // }
 * 
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Obtiene historial completo de conexiones del cliente
 * - Filtro opcional por estado de conexión
 * - Incluye plan y ubicación (puerto/NAP) de cada conexión
 * - Ordena por fecha de creación descendente
 * - Útil para vista de historial del cliente
 */
const obtenerConexionesPorCliente = async (req, res) => {
  try {
    const { cliente_id } = req.params;
    const { estado } = req.query;

    let whereCondition = { cliente_id };
    if (estado) {
      whereCondition.estado = estado;
    }

    const conexiones = await Conexion.findAll({
      where: whereCondition,
      include: [
        { model: Plan, as: 'plan' },
        {
          model: Puerto,
          as: 'puerto',
          include: [{ model: NAP, as: 'nap' }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: conexiones
    });
  } catch (error) {
    console.error('Error al obtener conexiones del cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  obtenerConexiones,
  obtenerConexionPorId,
  crearConexion,
  actualizarConexion,
  finalizarConexion,
  obtenerConexionesPorCliente
};