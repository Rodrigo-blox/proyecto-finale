const express = require('express');
const {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  cambiarClave,
  desactivarUsuario,
  crearUsuarioRoot
} = require('../controllers/usuarioController');
const { verificarToken, esAdmin } = require('../middleware/auth');
const { validarUsuario, validarUUID } = require('../middleware/validations');
const { body } = require('express-validator');

const router = express.Router();

const validarCambioClave = [
  body('claveActual')
    .isLength({ min: 6 })
    .withMessage('Clave actual requerida'),
  body('claveNueva')
    .isLength({ min: 6 })
    .withMessage('La nueva clave debe tener al menos 6 caracteres')
];

router.get('/findAll', verificarToken, esAdmin, obtenerUsuarios);
router.get('/:id', verificarToken, esAdmin, validarUUID, obtenerUsuarioPorId);
router.post('/create', verificarToken, esAdmin, validarUsuario, crearUsuario);
router.post('/registroRoot', validarUsuario, crearUsuarioRoot);
router.put('/:id', verificarToken, esAdmin, validarUUID, validarUsuario, actualizarUsuario);
router.patch('/cambiar-clave', verificarToken, validarCambioClave, cambiarClave);
router.delete('/:id', verificarToken, esAdmin, validarUUID, desactivarUsuario);

module.exports = router;