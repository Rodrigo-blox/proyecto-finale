const { Usuario } = require('../models');
const bcrypt = require('bcryptjs');

const obtenerUsuarios = async (req, res) => {
  try {
    const { rol, activo, limite = 10, pagina = 1 } = req.query;

    const whereClause = {};

    if (rol) {
      whereClause.rol = rol;
    }

    if (activo !== undefined) {
      whereClause.activo = activo === 'true';
    }

    const offset = (pagina - 1) * limite;

    const { count, rows: usuarios } = await Usuario.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['clave'] },
      limit: parseInt(limite),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: usuarios,
      meta: {
        total: count,
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total_paginas: Math.ceil(count / limite)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios'
    });
  }
};

const obtenerUsuarioPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findByPk(id, {
      attributes: { exclude: ['clave'] }
    });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: usuario
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario'
    });
  }
};

const crearUsuario = async (req, res) => {
  try {
    const { nombre, correo, rol, clave } = req.body;

    const usuarioExistente = await Usuario.findOne({
      where: { correo }
    });

    if (usuarioExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario con ese correo'
      });
    }

    const usuario = await Usuario.create({
      nombre,
      correo,
      rol,
      clave
    });

    const usuarioRespuesta = await Usuario.findByPk(usuario.id, {
      attributes: { exclude: ['clave'] }
    });

    res.status(201).json({
      success: true,
      data: usuarioRespuesta,
      message: 'Usuario creado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear usuario'
    });
  }
};

const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, correo, rol, clave, activo } = req.body;

    const usuario = await Usuario.findByPk(id);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    if (correo && correo !== usuario.correo) {
      const usuarioConCorreo = await Usuario.findOne({
        where: { correo }
      });

      if (usuarioConCorreo) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un usuario con ese correo'
        });
      }
    }

    const datosActualizacion = {};
    if (nombre) datosActualizacion.nombre = nombre;
    if (correo) datosActualizacion.correo = correo;
    if (rol) datosActualizacion.rol = rol;
    if (clave) datosActualizacion.clave = clave;
    if (activo !== undefined) datosActualizacion.activo = activo;

    await usuario.update(datosActualizacion);

    const usuarioActualizado = await Usuario.findByPk(id, {
      attributes: { exclude: ['clave'] }
    });

    res.json({
      success: true,
      data: usuarioActualizado,
      message: 'Usuario actualizado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario'
    });
  }
};

const cambiarClave = async (req, res) => {
  try {
    const { claveActual, claveNueva } = req.body;
    const usuarioId = req.usuario.id;

    const usuario = await Usuario.findByPk(usuarioId);

    if (!(await usuario.compararClave(claveActual))) {
      return res.status(400).json({
        success: false,
        message: 'Clave actual incorrecta'
      });
    }

    await usuario.update({ clave: claveNueva });

    res.json({
      success: true,
      message: 'Clave actualizada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al cambiar clave'
    });
  }
};

const desactivarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findByPk(id);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    await usuario.update({ activo: false });

    res.json({
      success: true,
      message: 'Usuario desactivado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al desactivar usuario'
    });
  }
};

const crearUsuarioRoot = async (req, res) => {
  try {
    const { nombre, correo, rol, clave } = req.body;

    const usuario = await Usuario.create({
      nombre,
      correo,
      rol,
      clave
    });

    res.status(201).json({
      success: true,
      data: usuario,
      message: 'Usuario creado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear usuario'
    });
  }
};

module.exports = {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  crearUsuarioRoot,
  actualizarUsuario,
  cambiarClave,
  desactivarUsuario
};