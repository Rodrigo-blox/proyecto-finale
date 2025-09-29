const express = require('express');
const { login, perfil } = require('../controllers/authController');
const { verificarToken } = require('../middleware/auth');
const { validarLogin } = require('../middleware/validations');

const router = express.Router();

router.post('/login', validarLogin, login);
router.get('/perfil', verificarToken, perfil);

module.exports = router;