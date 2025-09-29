const express = require('express');
const {
  obtenerNAPs,
  obtenerNAPPorId,
  crearNAP,
  actualizarNAP,
  obtenerNAPsEnMapa
} = require('../controllers/napController');
const { verificarToken, esAdminOSupervisor, esAdminOTecnico } = require('../middleware/auth');
const { validarNAP, validarUUID } = require('../middleware/validations');

const router = express.Router();

router.get('/', verificarToken, obtenerNAPs);
router.get('/mapa', verificarToken, obtenerNAPsEnMapa);
router.get('/:id', verificarToken, validarUUID, obtenerNAPPorId);
router.post('/', verificarToken, esAdminOSupervisor, validarNAP, crearNAP);
router.put('/:id', verificarToken, esAdminOTecnico, validarUUID, validarNAP, actualizarNAP);

module.exports = router;