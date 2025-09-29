const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

const generarToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const login = async (req, res) => {
  try {
    const { correo, clave } = req.body;

    const usuario = await Usuario.findOne({
      where: { correo, activo: true }
    });

    if (!usuario || !(await usuario.compararClave(clave))) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    const token = generarToken(usuario.id);

    res.json({
      success: true,
      data: {
        token,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          rol: usuario.rol
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const perfil = async (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.usuario.id,
      nombre: req.usuario.nombre,
      correo: req.usuario.correo,
      rol: req.usuario.rol
    }
  });
};

module.exports = {
  login,
  perfil
};