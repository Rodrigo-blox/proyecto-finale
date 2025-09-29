const express = require('express');
const {
  obtenerMantenimientos,
  obtenerMantenimientoPorId,
  crearMantenimiento,
  actualizarMantenimiento,
  obtenerMantenimientosPorNAP,
  eliminarMantenimiento,
  obtenerEstadisticasMantenimiento
} = require('../controllers/mantenimientoController');
const { verificarToken, esAdminOSupervisor, esAdminOTecnico } = require('../middleware/auth');
const { validarMantenimiento, validarUUID } = require('../middleware/validations');

const router = express.Router();

router.get('/', verificarToken, obtenerMantenimientos);
router.get('/estadisticas', verificarToken, obtenerEstadisticasMantenimiento);
router.get('/nap/:nap_id', verificarToken, validarUUID, obtenerMantenimientosPorNAP);
router.get('/:id', verificarToken, validarUUID, obtenerMantenimientoPorId);
router.post('/', verificarToken, esAdminOTecnico, validarMantenimiento, crearMantenimiento);
router.put('/:id', verificarToken, esAdminOTecnico, validarUUID, validarMantenimiento, actualizarMantenimiento);
router.delete('/:id', verificarToken, esAdminOSupervisor, validarUUID, eliminarMantenimiento);

module.exports = router;