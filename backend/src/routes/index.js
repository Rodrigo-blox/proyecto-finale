const express = require('express');
const authRoutes = require('./auth');
const usuarioRoutes = require('./usuarios');
const napRoutes = require('./naps');
const clienteRoutes = require('./clientes');
const planRoutes = require('./planes');
const conexionRoutes = require('./conexiones');
const puertoRoutes = require('./puertos');
const mantenimientoRoutes = require('./mantenimientos');
const dashboardRoutes = require('./dashboard');
const reporteRoutes = require('./reportes');
const auditoriaRoutes = require('./auditoria');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/naps', napRoutes);
router.use('/clientes', clienteRoutes);
router.use('/planes', planRoutes);
router.use('/conexiones', conexionRoutes);
router.use('/puertos', puertoRoutes);
router.use('/mantenimientos', mantenimientoRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reportes', reporteRoutes);
router.use('/auditoria', auditoriaRoutes);

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;