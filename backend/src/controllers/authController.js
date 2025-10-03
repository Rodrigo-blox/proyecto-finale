const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

/**
 * Genera un token JWT para un usuario específico
 * 
 * @function generarToken
 * @param {number} id - ID único del usuario para el cual generar el token
 * 
 * @returns {string} Token JWT firmado con tiempo de expiración
 * 
 * @example
 * const token = generarToken(123);
 * // Retorna: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * 
 * @description
 * - Utiliza JWT_SECRET del entorno para firmar el token
 * - El tiempo de expiración se define en JWT_EXPIRES_IN del entorno
 * - El payload solo contiene el ID del usuario por seguridad
 * - Token usado para autenticación en endpoints protegidos
 */
const generarToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

/**
 * Autentica a un usuario y genera un token JWT
 * 
 * @async
 * @function login
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.body - Datos de autenticación
 * @param {string} req.body.correo - Correo electrónico del usuario
 * @param {string} req.body.clave - Contraseña del usuario
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con token y datos del usuario o error de autenticación
 * 
 * @example
 * // POST /api/auth/login
 * // Body: {
 * //   correo: "usuario@empresa.com",
 * //   clave: "miPassword123"
 * // }
 * // Respuesta exitosa:
 * // {
 * //   success: true,
 * //   data: {
 * //     token: "eyJhbGciOiJIUzI1NiIs...",
 * //     usuario: {
 * //       id: 1,
 * //       nombre: "Juan Pérez",
 * //       correo: "usuario@empresa.com",
 * //       rol: "ADMIN"
 * //     }
 * //   }
 * // }
 * 
 * @throws {401} Credenciales inválidas (correo/contraseña incorrectos o usuario inactivo)
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Valida que el usuario exista y esté activo
 * - Compara la contraseña usando el método del modelo Usuario
 * - Genera token JWT válido tras autenticación exitosa
 * - Retorna datos del usuario sin información sensible
 * - Implementa seguridad contra ataques de fuerza bruta
 */
const login = async (req, res) => {
  try {
    const { correo, clave } = req.body;

    const usuario = await Usuario.findOne({
      where: { correo, activo: true }
    });

    if (!usuario || !(await usuario.compararClave(clave))) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    const token = generarToken(usuario.id);

    res.json({
      success: true,
      data: {
        token,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          rol: usuario.rol
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtiene el perfil del usuario autenticado
 * 
 * @async
 * @function perfil
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.usuario - Usuario autenticado (inyectado por middleware de auth)
 * @param {number} req.usuario.id - ID del usuario autenticado
 * @param {string} req.usuario.nombre - Nombre completo del usuario
 * @param {string} req.usuario.correo - Correo electrónico del usuario
 * @param {string} req.usuario.rol - Rol del usuario (ADMIN, TECNICO, OPERADOR)
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con datos del perfil del usuario
 * 
 * @example
 * // GET /api/auth/perfil
 * // Headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiIs..." }
 * // Respuesta:
 * // {
 * //   success: true,
 * //   data: {
 * //     id: 1,
 * //     nombre: "Juan Pérez",
 * //     correo: "usuario@empresa.com",
 * //     rol: "ADMIN"
 * //   }
 * // }
 * 
 * @description
 * - Endpoint protegido que requiere token JWT válido
 * - Los datos del usuario son inyectados por el middleware de autenticación
 * - Retorna información del perfil sin datos sensibles
 * - Útil para validar sesión y obtener datos del usuario logueado
 * - No realiza consultas adicionales a la base de datos
 */
const perfil = async (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.usuario.id,
      nombre: req.usuario.nombre,
      correo: req.usuario.correo,
      rol: req.usuario.rol
    }
  });
};

module.exports = {
  login,
  perfil
};