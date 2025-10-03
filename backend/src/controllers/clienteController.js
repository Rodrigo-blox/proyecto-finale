const { Cliente, Conexion, Plan, Puerto, NAP } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

/**
 * Obtiene una lista paginada de clientes con sus conexiones asociadas
 * 
 * @async
 * @function obtenerClientes
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.query - Parámetros de consulta
 * @param {number} [req.query.page=1] - Número de página
 * @param {number} [req.query.limit=10] - Límite de registros por página
 * @param {string} [req.query.buscar] - Término de búsqueda por nombre, CI o correo
 * @param {boolean} [req.query.activo] - Filtro por estado activo del cliente
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con lista paginada de clientes
 * 
 * @example
 * // GET /api/clientes?page=1&limit=5&buscar=Juan&activo=true
 * // Respuesta:
 * // {
 * //   success: true,
 * //   data: [...], // Array de clientes con conexiones
 * //   pagination: {
 * //     total: 50,
 * //     pages: 10,
 * //     currentPage: 1,
 * //     limit: 5
 * //   }
 * // }
 * 
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Implementa paginación con offset y limit
 * - Búsqueda flexible en nombre, CI y correo electrónico (case-insensitive)
 * - Incluye relaciones: conexiones → planes, puertos → NAPs
 * - Ordena resultados por fecha de creación descendente
 * - Proporciona metadatos de paginación completos
 */
const obtenerClientes = async (req, res) => {
  try {
    const { page = 1, limit = 10, buscar, activo } = req.query;
    const offset = (page - 1) * limit;

    let whereCondition = {};

    if (buscar) {
      whereCondition = {
        [Op.or]: [
          { nombre: { [Op.iLike]: `%${buscar}%` } },
          { ci: { [Op.iLike]: `%${buscar}%` } },
          { correo: { [Op.iLike]: `%${buscar}%` } }
        ]
      };
    }

    const clientes = await Cliente.findAndCountAll({
      where: whereCondition,
      include: [{
        model: Conexion,
        as: 'conexiones',
        include: [
          { model: Plan, as: 'plan' },
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

    res.json({
      success: true,
      data: clientes.rows,
      pagination: {
        total: clientes.count,
        pages: Math.ceil(clientes.count / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtiene un cliente específico por su ID con todas sus conexiones
 * 
 * @async
 * @function obtenerClientePorId
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de ruta
 * @param {string} req.params.id - ID único del cliente
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con datos completos del cliente
 * 
 * @example
 * // GET /api/clientes/123
 * // Respuesta:
 * // {
 * //   success: true,
 * //   data: {
 * //     id: 123,
 * //     nombre: "Juan Pérez",
 * //     ci: "12345678",
 * //     correo: "juan@email.com",
 * //     conexiones: [...] // Conexiones con planes y puertos
 * //   }
 * // }
 * 
 * @throws {404} Cliente no encontrado
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Incluye todas las conexiones del cliente
 * - Cada conexión incluye plan asociado y puerto con NAP
 * - Valida existencia del cliente antes de responder
 * - Proporciona vista completa del historial del cliente
 */
const obtenerClientePorId = async (req, res) => {
  try {
    const { id } = req.params;

    const cliente = await Cliente.findByPk(id, {
      include: [{
        model: Conexion,
        as: 'conexiones',
        include: [
          { model: Plan, as: 'plan' },
          {
            model: Puerto,
            as: 'puerto',
            include: [{ model: NAP, as: 'nap' }]
          }
        ]
      }]
    });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      data: cliente
    });
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Crea un nuevo cliente en el sistema
 * 
 * @async
 * @function crearCliente
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.body - Datos del cliente a crear
 * @param {string} req.body.ci - Cédula de identidad única del cliente
 * @param {string} req.body.nombre - Nombre completo del cliente
 * @param {string} req.body.telefono - Número de teléfono del cliente
 * @param {string} req.body.correo - Correo electrónico del cliente
 * @param {string} req.body.direccion - Dirección física del cliente
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con cliente creado
 * 
 * @example
 * // POST /api/clientes
 * // Body: {
 * //   ci: "12345678",
 * //   nombre: "Juan Pérez",
 * //   telefono: "+591 70123456",
 * //   correo: "juan@email.com",
 * //   direccion: "Av. Principal 123"
 * // }
 * 
 * @throws {400} Datos de entrada inválidos o CI duplicada
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Valida datos de entrada usando express-validator
 * - Verifica unicidad de la cédula de identidad
 * - Crea el cliente con estado activo por defecto
 * - Retorna el cliente creado con su ID asignado
 */
const crearCliente = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { ci, nombre, telefono, correo, direccion } = req.body;

    const clienteExistente = await Cliente.findOne({ where: { ci } });
    if (clienteExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un cliente con esta cédula'
      });
    }

    const cliente = await Cliente.create({
      ci,
      nombre,
      telefono,
      correo,
      direccion
    });

    res.status(201).json({
      success: true,
      message: 'Cliente creado exitosamente',
      data: cliente
    });
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Actualiza los datos de un cliente existente
 * 
 * @async
 * @function actualizarCliente
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de ruta
 * @param {string} req.params.id - ID del cliente a actualizar
 * @param {Object} req.body - Nuevos datos del cliente
 * @param {string} req.body.ci - Nueva cédula de identidad
 * @param {string} req.body.nombre - Nuevo nombre completo
 * @param {string} req.body.telefono - Nuevo número de teléfono
 * @param {string} req.body.correo - Nuevo correo electrónico
 * @param {string} req.body.direccion - Nueva dirección física
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con cliente actualizado
 * 
 * @example
 * // PUT /api/clientes/123
 * // Body: {
 * //   telefono: "+591 70654321",
 * //   direccion: "Nueva Dirección 456"
 * // }
 * 
 * @throws {400} Datos inválidos o CI duplicada
 * @throws {404} Cliente no encontrado
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Valida existencia del cliente antes de actualizar
 * - Verifica unicidad de CI si se modifica
 * - Permite actualización parcial de campos
 * - Retorna el cliente con los datos actualizados
 */
const actualizarCliente = async (req, res) => {
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
    const { ci, nombre, telefono, correo, direccion } = req.body;

    const cliente = await Cliente.findByPk(id);
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    if (ci !== cliente.ci) {
      const clienteExistente = await Cliente.findOne({ where: { ci } });
      if (clienteExistente) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un cliente con esta cédula'
        });
      }
    }

    await cliente.update({
      ci,
      nombre,
      telefono,
      correo,
      direccion
    });

    res.json({
      success: true,
      message: 'Cliente actualizado exitosamente',
      data: cliente
    });
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Elimina un cliente y finaliza todas sus conexiones activas
 * 
 * @async
 * @function eliminarCliente
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de ruta
 * @param {string} req.params.id - ID del cliente a eliminar
 * @param {Object} [req.usuario] - Usuario autenticado (para auditoría)
 * @param {number} [req.usuario.id] - ID del usuario que elimina el cliente
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON confirmando eliminación
 * 
 * @example
 * // DELETE /api/clientes/123
 * // Respuesta:
 * // {
 * //   success: true,
 * //   message: "Cliente eliminado exitosamente",
 * //   data: {
 * //     cliente_id: "123",
 * //     conexiones_finalizadas: 2
 * //   }
 * // }
 * 
 * @throws {404} Cliente no encontrado
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Operación transaccional para mantener integridad
 * - Finaliza todas las conexiones activas del cliente
 * - Libera todos los puertos ocupados por el cliente
 * - Registra auditoría de la eliminación
 * - Proporciona resumen de conexiones afectadas
 * - Rollback automático en caso de error
 */
const eliminarCliente = async (req, res) => {
  const sequelize = require('../config/database');
  const transaction = await sequelize.transaction();
  // Pasar userId para auditoría
  transaction.userId = req.usuario?.id;

  try {
    const { id } = req.params;

    const cliente = await Cliente.findByPk(id, {
      include: [{
        model: Conexion,
        as: 'conexiones',
        include: [{ model: Puerto, as: 'puerto' }]
      }],
      transaction
    });

    if (!cliente) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Finalizar todas las conexiones activas del cliente y liberar puertos
    if (cliente.conexiones && cliente.conexiones.length > 0) {
      const conexionesActivas = cliente.conexiones.filter(c => c.estado === 'ACTIVA');

      for (const conexion of conexionesActivas) {
        // Finalizar la conexión
        await conexion.update({
          estado: 'FINALIZADA',
          fecha_fin: new Date()
        }, { transaction });

        // Liberar el puerto si existe
        if (conexion.puerto) {
          await conexion.puerto.update({
            estado: 'LIBRE'
          }, { transaction });
        }
      }
    }

    // Eliminar el cliente
    await cliente.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Cliente eliminado exitosamente',
      data: {
        cliente_id: id,
        conexiones_finalizadas: cliente.conexiones ? cliente.conexiones.filter(c => c.estado === 'ACTIVA').length : 0
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  obtenerClientes,
  obtenerClientePorId,
  crearCliente,
  actualizarCliente,
  eliminarCliente
};