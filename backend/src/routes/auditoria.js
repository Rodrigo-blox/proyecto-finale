const express = require('express');
const {
  obtenerHistorialCambios,
  obtenerHistorialPorRegistro,
  obtenerEstadisticasAuditoria,
  obtenerTablasAuditadas,
  exportarAExcel
} = require('../controllers/auditoriaController');
const { verificarToken, esAdminOSupervisor } = require('../middleware/auth');

const router = express.Router();

router.get('/', verificarToken, esAdminOSupervisor, obtenerHistorialCambios);
router.get('/estadisticas', verificarToken, esAdminOSupervisor, obtenerEstadisticasAuditoria);
router.get('/tablas', verificarToken, esAdminOSupervisor, obtenerTablasAuditadas);
router.get('/exportar/excel', verificarToken, esAdminOSupervisor, exportarAExcel);
router.get('/:tabla/:registro_id', verificarToken, esAdminOSupervisor, obtenerHistorialPorRegistro);

module.exports = router;