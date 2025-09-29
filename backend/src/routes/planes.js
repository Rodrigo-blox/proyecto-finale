const express = require('express');
const {
  obtenerPlanes,
  obtenerPlanPorId,
  crearPlan,
  actualizarPlan,
  eliminarPlan
} = require('../controllers/planController');
const { verificarToken, esAdminOSupervisor } = require('../middleware/auth');
const { validarPlan, validarUUID } = require('../middleware/validations');

const router = express.Router();

router.get('/', verificarToken, obtenerPlanes);
router.get('/:id', verificarToken, validarUUID, obtenerPlanPorId);
router.post('/', verificarToken, esAdminOSupervisor, validarPlan, crearPlan);
router.put('/:id', verificarToken, esAdminOSupervisor, validarUUID, validarPlan, actualizarPlan);
router.delete('/:id', verificarToken, esAdminOSupervisor, validarUUID, eliminarPlan);

module.exports = router;