const express = require('express');
const {
  reporteOcupacionNAPs,
  reporteConsumoPorCliente,
  reporteEstadoTecnico,
  reportePlanesPopulares,
  reporteTendenciasPlanes,
  reporteAnalisisVelocidades,
  obtenerTiposReporte
} = require('../controllers/reporteController');
const { verificarToken, esAdminOSupervisor } = require('../middleware/auth');

const router = express.Router();

// Obtener tipos de reportes disponibles
router.get('/tipos', verificarToken, obtenerTiposReporte);

// Reportes de infraestructura
router.get('/ocupacion', verificarToken, esAdminOSupervisor, reporteOcupacionNAPs);
router.get('/tecnico', verificarToken, esAdminOSupervisor, reporteEstadoTecnico);

// Reportes de clientes
router.get('/consumo', verificarToken, esAdminOSupervisor, reporteConsumoPorCliente);

// Reportes comerciales
router.get('/planes-populares', verificarToken, esAdminOSupervisor, reportePlanesPopulares);
router.get('/tendencias-planes', verificarToken, esAdminOSupervisor, reporteTendenciasPlanes);
router.get('/analisis-velocidades', verificarToken, esAdminOSupervisor, reporteAnalisisVelocidades);

module.exports = router;