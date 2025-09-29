const express = require('express');
const {
  obtenerPuertosPorNAP,
  obtenerPuertosLibres,
  obtenerPuertoPorId,
  actualizarPuerto,
  crearPuertosParaNAP,
  obtenerEstadisticasPuertos
} = require('../controllers/puertoController');
const { verificarToken, esAdminOSupervisor, esAdminOTecnico } = require('../middleware/auth');
const { validarPuerto, validarUUID } = require('../middleware/validations');

const router = express.Router();

router.get('/libres', verificarToken, obtenerPuertosLibres);
router.get('/estadisticas', verificarToken, obtenerEstadisticasPuertos);
router.get('/nap/:nap_id', verificarToken, validarUUID, obtenerPuertosPorNAP);
router.get('/:id', verificarToken, validarUUID, obtenerPuertoPorId);
router.put('/:id', verificarToken, esAdminOTecnico, validarUUID, validarPuerto, actualizarPuerto);
router.post('/nap/:nap_id/crear', verificarToken, esAdminOSupervisor, validarUUID, crearPuertosParaNAP);

module.exports = router;