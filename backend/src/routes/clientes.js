const express = require('express');
const {
  obtenerClientes,
  obtenerClientePorId,
  crearCliente,
  actualizarCliente,
  eliminarCliente
} = require('../controllers/clienteController');
const { verificarToken, esAdminOSupervisor } = require('../middleware/auth');
const { validarCliente, validarUUID } = require('../middleware/validations');

const router = express.Router();

router.get('/', verificarToken, obtenerClientes);
router.get('/:id', verificarToken, validarUUID, obtenerClientePorId);
router.post('/', verificarToken, esAdminOSupervisor, validarCliente, crearCliente);
router.put('/:id', verificarToken, esAdminOSupervisor, validarUUID, validarCliente, actualizarCliente);
router.delete('/:id', verificarToken, esAdminOSupervisor, validarUUID, eliminarCliente);

module.exports = router;