const express = require('express');
const {
  reporteOcupacionNAPs,
  reporteConsumoPorCliente,
  reporteEstadoTecnico,
  obtenerTiposReporte
} = require('../controllers/reporteController');
const { verificarToken, esAdminOSupervisor } = require('../middleware/auth');

const router = express.Router();

router.get('/tipos', verificarToken, obtenerTiposReporte);
router.get('/ocupacion', verificarToken, esAdminOSupervisor, reporteOcupacionNAPs);
router.get('/consumo', verificarToken, esAdminOSupervisor, reporteConsumoPorCliente);
router.get('/tecnico', verificarToken, esAdminOSupervisor, reporteEstadoTecnico);

module.exports = router;