const { Mantenimiento, NAP, Usuario } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

const obtenerMantenimientos = async (req, res) => {
  try {
    const { page = 1, limit = 10, nap_id, tipo, fecha_desde, fecha_hasta, tecnico_id } = req.query;
    const offset = (page - 1) * limit;

    let whereCondition = {};

    if (nap_id) {
      whereCondition.nap_id = nap_id;
    }

    if (tipo) {
      whereCondition.tipo = tipo;
    }

    if (tecnico_id) {
      whereCondition.realizado_por = tecnico_id;
    }

    if (fecha_desde || fecha_hasta) {
      whereCondition.fecha = {};
      if (fecha_desde) {
        whereCondition.fecha[Op.gte] = new Date(fecha_desde);
      }
      if (fecha_hasta) {
        whereCondition.fecha[Op.lte] = new Date(fecha_hasta);
      }
    }

    const mantenimientos = await Mantenimiento.findAndCountAll({
      where: whereCondition,
      include: [
        { model: NAP, as: 'nap' },
        { model: Usuario, as: 'tecnico', attributes: ['id', 'nombre', 'correo'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['fecha', 'DESC']]
    });

    res.json({
      success: true,
      data: mantenimientos.rows,
      pagination: {
        total: mantenimientos.count,
        pages: Math.ceil(mantenimientos.count / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener mantenimientos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const obtenerMantenimientoPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const mantenimiento = await Mantenimiento.findByPk(id, {
      include: [
        { model: NAP, as: 'nap' },
        { model: Usuario, as: 'tecnico', attributes: ['id', 'nombre', 'correo'] }
      ]
    });

    if (!mantenimiento) {
      return res.status(404).json({
        success: false,
        message: 'Mantenimiento no encontrado'
      });
    }

    res.json({
      success: true,
      data: mantenimiento
    });
  } catch (error) {
    console.error('Error al obtener mantenimiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const crearMantenimiento = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { nap_id, tipo, descripcion, fecha } = req.body;
    const realizado_por = req.usuario.id;

    const nap = await NAP.findByPk(nap_id);
    if (!nap) {
      return res.status(404).json({
        success: false,
        message: 'NAP no encontrado'
      });
    }

    const mantenimiento = await Mantenimiento.create({
      nap_id,
      tipo,
      descripcion,
      fecha: fecha || new Date(),
      realizado_por
    });

    if (tipo === 'CORRECTIVO') {
      await nap.update({ estado: 'MANTENIMIENTO' });
    }

    const mantenimientoCompleto = await Mantenimiento.findByPk(mantenimiento.id, {
      include: [
        { model: NAP, as: 'nap' },
        { model: Usuario, as: 'tecnico', attributes: ['id', 'nombre', 'correo'] }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Mantenimiento registrado exitosamente',
      data: mantenimientoCompleto
    });
  } catch (error) {
    console.error('Error al crear mantenimiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const actualizarMantenimiento = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { tipo, descripcion, fecha } = req.body;

    const mantenimiento = await Mantenimiento.findByPk(id);
    if (!mantenimiento) {
      return res.status(404).json({
        success: false,
        message: 'Mantenimiento no encontrado'
      });
    }

    await mantenimiento.update({
      tipo: tipo || mantenimiento.tipo,
      descripcion: descripcion || mantenimiento.descripcion,
      fecha: fecha || mantenimiento.fecha
    });

    const mantenimientoActualizado = await Mantenimiento.findByPk(id, {
      include: [
        { model: NAP, as: 'nap' },
        { model: Usuario, as: 'tecnico', attributes: ['id', 'nombre', 'correo'] }
      ]
    });

    res.json({
      success: true,
      message: 'Mantenimiento actualizado exitosamente',
      data: mantenimientoActualizado
    });
  } catch (error) {
    console.error('Error al actualizar mantenimiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const obtenerMantenimientosPorNAP = async (req, res) => {
  try {
    const { nap_id } = req.params;
    const { tipo, limite = 10 } = req.query;

    let whereCondition = { nap_id };
    if (tipo) {
      whereCondition.tipo = tipo;
    }

    const mantenimientos = await Mantenimiento.findAll({
      where: whereCondition,
      include: [
        { model: Usuario, as: 'tecnico', attributes: ['id', 'nombre', 'correo'] }
      ],
      limit: parseInt(limite),
      order: [['fecha', 'DESC']]
    });

    res.json({
      success: true,
      data: mantenimientos
    });
  } catch (error) {
    console.error('Error al obtener mantenimientos del NAP:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const eliminarMantenimiento = async (req, res) => {
  try {
    const { id } = req.params;

    const mantenimiento = await Mantenimiento.findByPk(id);
    if (!mantenimiento) {
      return res.status(404).json({
        success: false,
        message: 'Mantenimiento no encontrado'
      });
    }

    await mantenimiento.destroy();

    res.json({
      success: true,
      message: 'Mantenimiento eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar mantenimiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const obtenerEstadisticasMantenimiento = async (req, res) => {
  try {
    const { nap_id, fecha_desde, fecha_hasta } = req.query;

    let whereCondition = {};

    if (nap_id) {
      whereCondition.nap_id = nap_id;
    }

    if (fecha_desde || fecha_hasta) {
      whereCondition.fecha = {};
      if (fecha_desde) {
        whereCondition.fecha[Op.gte] = new Date(fecha_desde);
      }
      if (fecha_hasta) {
        whereCondition.fecha[Op.lte] = new Date(fecha_hasta);
      }
    }

    const estadisticas = await Mantenimiento.findAll({
      where: whereCondition,
      attributes: [
        'tipo',
        [Mantenimiento.sequelize.fn('COUNT', Mantenimiento.sequelize.col('id')), 'cantidad']
      ],
      group: ['tipo']
    });

    const total = await Mantenimiento.count({ where: whereCondition });

    const estadisticasFormateadas = {
      total,
      por_tipo: estadisticas.reduce((acc, stat) => {
        acc[stat.tipo] = parseInt(stat.dataValues.cantidad);
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: estadisticasFormateadas
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  obtenerMantenimientos,
  obtenerMantenimientoPorId,
  crearMantenimiento,
  actualizarMantenimiento,
  obtenerMantenimientosPorNAP,
  eliminarMantenimiento,
  obtenerEstadisticasMantenimiento
};