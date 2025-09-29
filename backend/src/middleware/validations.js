const { body, param, query, validationResult } = require('express-validator');

const manejarErroresValidacion = (req, res, next) => {
  const errores = validationResult(req);

  if (!errores.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errores: errores.array()
    });
  }

  next();
};

const validarLogin = [
  body('correo')
    .isEmail()
    .withMessage('Debe ser un correo válido'),
  body('clave')
    .isLength({ min: 6 })
    .withMessage('La clave debe tener al menos 6 caracteres'),
  manejarErroresValidacion
];

const validarUsuario = [
  body('nombre')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('correo')
    .isEmail()
    .withMessage('Debe ser un correo válido'),
  body('rol')
    .isIn(['ADMIN', 'TECNICO', 'SUPERVISOR'])
    .withMessage('Rol no válido'),
  body('clave')
    .optional()
    .isLength({ min: 6 })
    .withMessage('La clave debe tener al menos 6 caracteres'),
  manejarErroresValidacion
];

const validarNAP = [
  body('codigo')
    .isLength({ min: 3, max: 50 })
    .withMessage('El código debe tener entre 3 y 50 caracteres'),
  body('modelo')
    .isLength({ min: 2, max: 100 })
    .withMessage('El modelo debe tener entre 2 y 100 caracteres'),
  body('estado')
    .isIn(['ACTIVO', 'MANTENIMIENTO', 'SATURADO'])
    .withMessage('Estado no válido'),
  body('total_puertos')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Total de puertos debe ser entre 1 y 1000'),
  body('ubicacion')
    .isLength({ min: 5, max: 255 })
    .withMessage('La ubicación debe tener entre 5 y 255 caracteres'),
  body('latitud')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitud debe estar entre -90 y 90'),
  body('longitud')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitud debe estar entre -180 y 180'),
  manejarErroresValidacion
];

const validarCliente = [
  body('ci')
    .isLength({ min: 7, max: 15 })
    .withMessage('CI debe tener entre 7 y 15 caracteres'),
  body('nombre')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('correo')
    .optional()
    .isEmail()
    .withMessage('Debe ser un correo válido'),
  body('telefono')
    .optional()
    .isLength({ min: 7, max: 15 })
    .withMessage('Teléfono debe tener entre 7 y 15 caracteres'),
  manejarErroresValidacion
];

const validarPlan = [
  body('nombre')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('velocidad_mbps')
    .isInt({ min: 1, max: 10000 })
    .withMessage('Velocidad debe ser entre 1 y 10000 Mbps'),
  body('descripcion')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Descripción no puede exceder 500 caracteres'),
  manejarErroresValidacion
];

const validarConexion = [
  body('puerto_id')
    .isUUID()
    .withMessage('Puerto ID debe ser un UUID válido'),
  body('cliente_id')
    .isUUID()
    .withMessage('Cliente ID debe ser un UUID válido'),
  body('plan_id')
    .isUUID()
    .withMessage('Plan ID debe ser un UUID válido'),
  body('fecha_inicio')
    .isISO8601()
    .withMessage('Fecha de inicio debe ser una fecha válida'),
  body('fecha_fin')
    .optional()
    .isISO8601()
    .withMessage('Fecha de fin debe ser una fecha válida'),
  body('estado')
    .optional()
    .isIn(['ACTIVA', 'SUSPENDIDA', 'FINALIZADA'])
    .withMessage('Estado no válido'),
  manejarErroresValidacion
];

const validarPuerto = [
  body('estado')
    .optional()
    .isIn(['LIBRE', 'OCUPADO', 'MANTENIMIENTO'])
    .withMessage('Estado no válido'),
  body('nota')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Nota no puede exceder 500 caracteres'),
  manejarErroresValidacion
];

const validarMantenimiento = [
  body('nap_id')
    .isUUID()
    .withMessage('NAP ID debe ser un UUID válido'),
  body('tipo')
    .isIn(['PREVENTIVO', 'CORRECTIVO'])
    .withMessage('Tipo debe ser PREVENTIVO o CORRECTIVO'),
  body('descripcion')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Descripción debe tener entre 10 y 1000 caracteres'),
  body('fecha')
    .optional()
    .isISO8601()
    .withMessage('Fecha debe ser una fecha válida'),
  manejarErroresValidacion
];

const validarUUID = [
  param('id')
    .isUUID()
    .withMessage('ID debe ser un UUID válido'),
  manejarErroresValidacion
];

module.exports = {
  manejarErroresValidacion,
  validarLogin,
  validarUsuario,
  validarNAP,
  validarCliente,
  validarPlan,
  validarConexion,
  validarPuerto,
  validarMantenimiento,
  validarUUID
};