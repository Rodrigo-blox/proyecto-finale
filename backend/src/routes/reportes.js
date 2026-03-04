const express = require('express');
const {
  reporteOcupacionNAPs,
  reporteConsumoPorCliente,
  reporteEstadoTecnico,
  reporteCaidasInterrupciones,
  reporteDisponibilidadServicio,
  reporteAltasYBajas,
  reporteClientes,
  obtenerTiposReporte
} = require('../controllers/reporteController');
const { verificarToken, esAdminOSupervisor } = require('../middleware/auth');

const router = express.Router();

router.get('/tipos', verificarToken, obtenerTiposReporte);

// Infraestructura
router.get('/ocupacion', verificarToken, esAdminOSupervisor, reporteOcupacionNAPs);
router.get('/tecnico', verificarToken, esAdminOSupervisor, reporteEstadoTecnico);
router.get('/caidas-interrupciones', verificarToken, esAdminOSupervisor, reporteCaidasInterrupciones);
router.get('/disponibilidad', verificarToken, esAdminOSupervisor, reporteDisponibilidadServicio);

// Clientes
router.get('/consumo', verificarToken, esAdminOSupervisor, reporteConsumoPorCliente);
router.get('/altas-bajas', verificarToken, esAdminOSupervisor, reporteAltasYBajas);
router.get('/clientes', verificarToken, esAdminOSupervisor, reporteClientes);

module.exports = router;
