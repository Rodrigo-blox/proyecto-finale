const express = require('express');
const {
  obtenerConexiones,
  obtenerConexionPorId,
  crearConexion,
  actualizarConexion,
  finalizarConexion,
  obtenerConexionesPorCliente
} = require('../controllers/conexionController');
const { verificarToken, esAdminOSupervisor, esAdminOTecnico } = require('../middleware/auth');
const { validarConexion, validarUUID } = require('../middleware/validations');

const router = express.Router();

router.get('/', verificarToken, obtenerConexiones);
router.get('/:id', verificarToken, validarUUID, obtenerConexionPorId);
router.get('/cliente/:cliente_id', verificarToken, validarUUID, obtenerConexionesPorCliente);
router.post('/', verificarToken, esAdminOSupervisor, validarConexion, crearConexion);
router.put('/:id', verificarToken, esAdminOTecnico, validarUUID, actualizarConexion);
router.patch('/:id/finalizar', verificarToken, esAdminOSupervisor, validarUUID, finalizarConexion);

module.exports = router;