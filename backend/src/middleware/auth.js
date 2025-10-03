const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

/**
 * Middleware que verifica la validez del token JWT y autentica al usuario
 * 
 * @async
 * @function verificarToken
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.headers - Headers de la solicitud
 * @param {string} req.headers.authorization - Header de autorización con formato "Bearer <token>"
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para continuar al siguiente middleware
 * 
 * @returns {Promise<void>} Continúa al siguiente middleware o envía error de autenticación
 * 
 * @example
 * // Uso en ruta protegida:
 * // app.get('/api/protected', verificarToken, (req, res) => {
 * //   // req.usuario estará disponible aquí
 * //   res.json({ usuario: req.usuario.nombre });
 * // });
 * 
 * // Header requerido:
 * // Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * 
 * @throws {401} Token de acceso requerido - No se proporciona token
 * @throws {401} Token inválido - Token malformado, expirado o usuario no existe
 * @throws {401} Usuario inactivo - Usuario existe pero está desactivado
 * 
 * @description
 * - Extrae token del header Authorization
 * - Verifica y decodifica el token JWT
 * - Busca y valida la existencia del usuario
 * - Verifica que el usuario esté activo
 * - Inyecta el objeto usuario completo en req.usuario
 * - Permite continuar al siguiente middleware si todo es válido
 * - Esencial para proteger endpoints que requieren autenticación
 */
const verificarToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findByPk(decoded.id);

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    if (!usuario.activo) {
      return res.status(401).json({
        success: false,
        message: 'Usuario inactivo'
      });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

/**
 * Middleware factory que crea un verificador de rol basado en roles permitidos
 * 
 * @function verificarRol
 * @param {...string} rolesPermitidos - Lista de roles que tienen acceso al endpoint
 * 
 * @returns {Function} Middleware function que verifica si el usuario tiene rol válido
 * 
 * @example
 * // Permitir solo administradores:
 * // app.delete('/api/users/:id', verificarToken, verificarRol('ADMIN'), deleteUser);
 * 
 * // Permitir administradores y supervisores:
 * // app.get('/api/reports', verificarToken, verificarRol('ADMIN', 'SUPERVISOR'), getReports);
 * 
 * // Permitir múltiples roles:
 * // app.put('/api/naps/:id', verificarToken, verificarRol('ADMIN', 'TECNICO', 'OPERADOR'), updateNap);
 * 
 * @throws {401} Usuario no autenticado - req.usuario no existe
 * @throws {403} No tienes permisos - Usuario autenticado pero sin rol válido
 * 
 * @description
 * - Crea middleware dinámico basado en roles especificados
 * - Debe usar después de verificarToken para tener req.usuario disponible
 * - Verifica que el rol del usuario esté en la lista de roles permitidos
 * - Flexible para definir diferentes niveles de acceso por endpoint
 * - Patrón factory para reutilización de lógica de autorización
 */
const verificarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción'
      });
    }

    next();
  };
};

/**
 * Middleware predefinido que permite acceso solo a usuarios con rol ADMIN
 * 
 * @constant {Function} esAdmin
 * 
 * @example
 * // Proteger endpoint solo para administradores:
 * // app.delete('/api/usuarios/:id', verificarToken, esAdmin, eliminarUsuario);
 * 
 * @description
 * - Middleware preconfigurado para endpoints de alta seguridad
 * - Solo usuarios con rol 'ADMIN' pueden acceder
 * - Útil para operaciones críticas como eliminar usuarios, configuración del sistema
 */
const esAdmin = verificarRol('ADMIN');

/**
 * Middleware predefinido que permite acceso a administradores y supervisores
 * 
 * @constant {Function} esAdminOSupervisor
 * 
 * @example
 * // Permitir administradores y supervisores:
 * // app.get('/api/reportes/avanzados', verificarToken, esAdminOSupervisor, obtenerReportesAvanzados);
 * 
 * @description
 * - Middleware para endpoints de supervisión y reportes
 * - Permite acceso a roles 'ADMIN' y 'SUPERVISOR'
 * - Útil para funciones de monitoreo y análisis
 */
const esAdminOSupervisor = verificarRol('ADMIN', 'SUPERVISOR');

/**
 * Middleware predefinido que permite acceso a administradores y técnicos
 * 
 * @constant {Function} esAdminOTecnico
 * 
 * @example
 * // Permitir administradores y técnicos:
 * // app.post('/api/mantenimientos', verificarToken, esAdminOTecnico, crearMantenimiento);
 * 
 * @description
 * - Middleware para operaciones técnicas y mantenimiento
 * - Permite acceso a roles 'ADMIN' y 'TECNICO'
 * - Útil para funciones operativas como mantenimientos, configuración de NAPs
 */
const esAdminOTecnico = verificarRol('ADMIN', 'TECNICO');

module.exports = {
  verificarToken,
  verificarRol,
  esAdmin,
  esAdminOSupervisor,
  esAdminOTecnico
};