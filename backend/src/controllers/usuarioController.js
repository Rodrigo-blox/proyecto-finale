const { Usuario } = require('../models');
const bcrypt = require('bcryptjs');

/**
 * Obtiene una lista paginada de usuarios del sistema con filtros opcionales
 * 
 * @async
 * @function obtenerUsuarios
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.query - Parámetros de consulta
 * @param {string} [req.query.rol] - Filtro por rol (ADMIN, TECNICO, OPERADOR)
 * @param {string} [req.query.activo] - Filtro por estado activo ("true" o "false")
 * @param {number} [req.query.limite=10] - Número de registros por página
 * @param {number} [req.query.pagina=1] - Página actual
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con lista paginada de usuarios (sin contraseñas)
 * 
 * @example
 * // GET /api/usuarios?rol=ADMIN&activo=true&limite=5&pagina=1
 * // Respuesta:
 * // {
 * //   success: true,
 * //   data: [
 * //     {
 * //       id: 1,
 * //       nombre: "Administrador",
 * //       correo: "admin@empresa.com",
 * //       rol: "ADMIN",
 * //       activo: true,
 * //       created_at: "2024-01-15T10:00:00Z"
 * //     }
 * //   ],
 * //   meta: {
 * //     total: 15,
 * //     pagina: 1,
 * //     limite: 5,
 * //     total_paginas: 3
 * //   }
 * // }
 * 
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Implementa paginación completa con metadatos
 * - Filtros combinables por rol y estado activo
 * - Excluye contraseñas por seguridad
 * - Ordena por fecha de creación descendente
 * - Útil para administración de usuarios
 */
const obtenerUsuarios = async (req, res) => {
  try {
    const { rol, activo, limite = 10, pagina = 1 } = req.query;

    const whereClause = {};

    if (rol) {
      whereClause.rol = rol;
    }

    if (activo !== undefined) {
      whereClause.activo = activo === 'true';
    }

    const offset = (pagina - 1) * limite;

    const { count, rows: usuarios } = await Usuario.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['clave'] },
      limit: parseInt(limite),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: usuarios,
      meta: {
        total: count,
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total_paginas: Math.ceil(count / limite)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios'
    });
  }
};

/**
 * Obtiene un usuario específico por su ID
 * 
 * @async
 * @function obtenerUsuarioPorId
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de ruta
 * @param {string} req.params.id - ID único del usuario
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con datos del usuario (sin contraseña)
 * 
 * @example
 * // GET /api/usuarios/1
 * // Respuesta:
 * // {
 * //   success: true,
 * //   data: {
 * //     id: 1,
 * //     nombre: "Juan Pérez",
 * //     correo: "juan@empresa.com",
 * //     rol: "TECNICO",
 * //     activo: true,
 * //     created_at: "2024-01-15T10:00:00Z"
 * //   }
 * // }
 * 
 * @throws {404} Usuario no encontrado
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Excluye la contraseña por seguridad
 * - Valida existencia del usuario
 * - Útil para vistas de perfil y edición
 */
const obtenerUsuarioPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findByPk(id, {
      attributes: { exclude: ['clave'] }
    });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: usuario
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario'
    });
  }
};

/**
 * Crea un nuevo usuario en el sistema
 * 
 * @async
 * @function crearUsuario
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.body - Datos del usuario a crear
 * @param {string} req.body.nombre - Nombre completo del usuario
 * @param {string} req.body.correo - Correo electrónico único del usuario
 * @param {string} req.body.rol - Rol del usuario (ADMIN, TECNICO, OPERADOR)
 * @param {string} req.body.clave - Contraseña del usuario (será hasheada)
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con usuario creado (sin contraseña)
 * 
 * @example
 * // POST /api/usuarios
 * // Body: {
 * //   nombre: "Ana García",
 * //   correo: "ana@empresa.com",
 * //   rol: "TECNICO",
 * //   clave: "miPassword123"
 * // }
 * 
 * @throws {400} Correo electrónico ya existe
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Verifica unicidad del correo electrónico
 * - Hashea automáticamente la contraseña
 * - Crea usuario con estado activo por defecto
 * - Retorna datos sin contraseña por seguridad
 */
const crearUsuario = async (req, res) => {
  try {
    const { nombre, correo, rol, clave } = req.body;

    const usuarioExistente = await Usuario.findOne({
      where: { correo }
    });

    if (usuarioExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario con ese correo'
      });
    }

    const usuario = await Usuario.create({
      nombre,
      correo,
      rol,
      clave
    });

    const usuarioRespuesta = await Usuario.findByPk(usuario.id, {
      attributes: { exclude: ['clave'] }
    });

    res.status(201).json({
      success: true,
      data: usuarioRespuesta,
      message: 'Usuario creado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear usuario'
    });
  }
};

/**
 * Actualiza los datos de un usuario existente
 * 
 * @async
 * @function actualizarUsuario
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de ruta
 * @param {string} req.params.id - ID del usuario a actualizar
 * @param {Object} req.body - Nuevos datos del usuario
 * @param {string} [req.body.nombre] - Nuevo nombre completo
 * @param {string} [req.body.correo] - Nuevo correo electrónico
 * @param {string} [req.body.rol] - Nuevo rol del usuario
 * @param {string} [req.body.clave] - Nueva contraseña (será hasheada)
 * @param {boolean} [req.body.activo] - Nuevo estado activo
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con usuario actualizado (sin contraseña)
 * 
 * @example
 * // PUT /api/usuarios/1
 * // Body: {
 * //   nombre: "Ana García López",
 * //   rol: "ADMIN"
 * // }
 * 
 * @throws {400} Correo electrónico ya existe
 * @throws {404} Usuario no encontrado
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Permite actualización parcial de campos
 * - Valida unicidad del correo si se modifica
 * - Hashea nueva contraseña automáticamente
 * - Retorna usuario actualizado sin contraseña
 */
const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, correo, rol, clave, activo } = req.body;

    const usuario = await Usuario.findByPk(id);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    if (correo && correo !== usuario.correo) {
      const usuarioConCorreo = await Usuario.findOne({
        where: { correo }
      });

      if (usuarioConCorreo) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un usuario con ese correo'
        });
      }
    }

    const datosActualizacion = {};
    if (nombre) datosActualizacion.nombre = nombre;
    if (correo) datosActualizacion.correo = correo;
    if (rol) datosActualizacion.rol = rol;
    if (clave) datosActualizacion.clave = clave;
    if (activo !== undefined) datosActualizacion.activo = activo;

    await usuario.update(datosActualizacion);

    const usuarioActualizado = await Usuario.findByPk(id, {
      attributes: { exclude: ['clave'] }
    });

    res.json({
      success: true,
      data: usuarioActualizado,
      message: 'Usuario actualizado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario'
    });
  }
};

/**
 * Permite al usuario autenticado cambiar su propia contraseña
 * 
 * @async
 * @function cambiarClave
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.body - Datos para cambio de contraseña
 * @param {string} req.body.claveActual - Contraseña actual del usuario
 * @param {string} req.body.claveNueva - Nueva contraseña deseada
 * @param {Object} req.usuario - Usuario autenticado (del middleware)
 * @param {number} req.usuario.id - ID del usuario autenticado
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON confirmando cambio de contraseña
 * 
 * @example
 * // PUT /api/usuarios/cambiar-clave
 * // Headers: { Authorization: "Bearer token..." }
 * // Body: {
 * //   claveActual: "oldPassword123",
 * //   claveNueva: "newPassword456"
 * // }
 * 
 * @throws {400} Contraseña actual incorrecta
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Endpoint protegido que requiere autenticación
 * - Valida la contraseña actual antes del cambio
 * - Hashea automáticamente la nueva contraseña
 * - Solo permite al usuario cambiar su propia contraseña
 */
const cambiarClave = async (req, res) => {
  try {
    const { claveActual, claveNueva } = req.body;
    const usuarioId = req.usuario.id;

    const usuario = await Usuario.findByPk(usuarioId);

    if (!(await usuario.compararClave(claveActual))) {
      return res.status(400).json({
        success: false,
        message: 'Clave actual incorrecta'
      });
    }

    await usuario.update({ clave: claveNueva });

    res.json({
      success: true,
      message: 'Clave actualizada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al cambiar clave'
    });
  }
};

/**
 * Desactiva un usuario del sistema sin eliminarlo
 * 
 * @async
 * @function desactivarUsuario
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de ruta
 * @param {string} req.params.id - ID del usuario a desactivar
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON confirmando desactivación
 * 
 * @example
 * // PUT /api/usuarios/1/desactivar
 * // Respuesta:
 * // {
 * //   success: true,
 * //   message: "Usuario desactivado exitosamente"
 * // }
 * 
 * @throws {404} Usuario no encontrado
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Desactiva el usuario sin eliminar sus datos
 * - Preserva historial e integridad referencial
 * - Usuario desactivado no podrá iniciar sesión
 * - Permite reactivación posterior si es necesario
 */
const desactivarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findByPk(id);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    await usuario.update({ activo: false });

    res.json({
      success: true,
      message: 'Usuario desactivado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al desactivar usuario'
    });
  }
};

/**
 * Crea un usuario con privilegios especiales (función administrativa)
 * 
 * @async
 * @function crearUsuarioRoot
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.body - Datos del usuario root
 * @param {string} req.body.nombre - Nombre completo del usuario
 * @param {string} req.body.correo - Correo electrónico del usuario
 * @param {string} req.body.rol - Rol del usuario
 * @param {string} req.body.clave - Contraseña del usuario
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con usuario root creado
 * 
 * @example
 * // POST /api/usuarios/root
 * // Body: {
 * //   nombre: "Super Admin",
 * //   correo: "superadmin@sistema.com",
 * //   rol: "ADMIN",
 * //   clave: "superSecurePassword"
 * // }
 * 
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Función especial para creación de usuarios administrativos
 * - Omite algunas validaciones estrictas
 * - Útil para setup inicial del sistema
 * - Requiere permisos especiales para su uso
 * - Retorna usuario completo incluyendo datos sensibles
 */
const crearUsuarioRoot = async (req, res) => {
  try {
    const { nombre, correo, rol, clave } = req.body;

    const usuario = await Usuario.create({
      nombre,
      correo,
      rol,
      clave
    });

    res.status(201).json({
      success: true,
      data: usuario,
      message: 'Usuario creado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear usuario'
    });
  }
};

module.exports = {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  crearUsuarioRoot,
  actualizarUsuario,
  cambiarClave,
  desactivarUsuario
};