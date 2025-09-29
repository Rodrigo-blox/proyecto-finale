const express = require('express');
const {
  obtenerEstadisticasGenerales,
  obtenerAlertas,
  obtenerOcupacionNAPs,
  obtenerEstadisticasPorPeriodo
} = require('../controllers/dashboardController');
const { verificarToken } = require('../middleware/auth');

const router = express.Router();

router.get('/estadisticas', verificarToken, obtenerEstadisticasGenerales);
router.get('/alertas', verificarToken, obtenerAlertas);
router.get('/ocupacion', verificarToken, obtenerOcupacionNAPs);
router.get('/periodo', verificarToken, obtenerEstadisticasPorPeriodo);

module.exports = router;