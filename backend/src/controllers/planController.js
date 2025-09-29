const { Plan, Conexion, Cliente, Puerto, NAP } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

const obtenerPlanes = async (req, res) => {
  try {
    const { page = 1, limit = 10, buscar, activo = true } = req.query;
    const offset = (page - 1) * limit;

    let whereCondition = {};

    if (buscar) {
      whereCondition.nombre = { [Op.iLike]: `%${buscar}%` };
    }

    const planes = await Plan.findAndCountAll({
      where: whereCondition,
      include: [{
        model: Conexion,
        as: 'conexiones',
        include: [
          { model: Cliente, as: 'cliente' },
          {
            model: Puerto,
            as: 'puerto',
            include: [{ model: NAP, as: 'nap' }]
          }
        ]
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    const planesConEstadisticas = planes.rows.map(plan => {
      const conexionesActivas = plan.conexiones?.filter(c => c.estado === 'ACTIVA') || [];
      return {
        ...plan.toJSON(),
        estadisticas: {
          conexiones_totales: plan.conexiones?.length || 0,
          conexiones_activas: conexionesActivas.length,
          conexiones_suspendidas: plan.conexiones?.filter(c => c.estado === 'SUSPENDIDA').length || 0,
          conexiones_finalizadas: plan.conexiones?.filter(c => c.estado === 'FINALIZADA').length || 0
        }
      };
    });

    res.json({
      success: true,
      data: planesConEstadisticas,
      pagination: {
        total: planes.count,
        pages: Math.ceil(planes.count / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener planes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const obtenerPlanPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Plan.findByPk(id, {
      include: [{
        model: Conexion,
        as: 'conexiones',
        include: [
          { model: Cliente, as: 'cliente' },
          {
            model: Puerto,
            as: 'puerto',
            include: [{ model: NAP, as: 'nap' }]
          }
        ]
      }]
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan no encontrado'
      });
    }

    const conexionesActivas = plan.conexiones?.filter(c => c.estado === 'ACTIVA') || [];
    const planConEstadisticas = {
      ...plan.toJSON(),
      estadisticas: {
        conexiones_totales: plan.conexiones?.length || 0,
        conexiones_activas: conexionesActivas.length,
        conexiones_suspendidas: plan.conexiones?.filter(c => c.estado === 'SUSPENDIDA').length || 0,
        conexiones_finalizadas: plan.conexiones?.filter(c => c.estado === 'FINALIZADA').length || 0
      }
    };

    res.json({
      success: true,
      data: planConEstadisticas
    });
  } catch (error) {
    console.error('Error al obtener plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const crearPlan = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { nombre, velocidad_mbps, descripcion } = req.body;

    const planExistente = await Plan.findOne({ where: { nombre } });
    if (planExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un plan con este nombre'
      });
    }

    const plan = await Plan.create({
      nombre,
      velocidad_mbps,
      descripcion
    });

    res.status(201).json({
      success: true,
      message: 'Plan creado exitosamente',
      data: plan
    });
  } catch (error) {
    console.error('Error al crear plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const actualizarPlan = async (req, res) => {
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
    const { nombre, velocidad_mbps, descripcion } = req.body;

    const plan = await Plan.findByPk(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan no encontrado'
      });
    }

    if (nombre !== plan.nombre) {
      const planExistente = await Plan.findOne({ where: { nombre } });
      if (planExistente) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un plan con este nombre'
        });
      }
    }

    await plan.update({
      nombre,
      velocidad_mbps,
      descripcion
    });

    res.json({
      success: true,
      message: 'Plan actualizado exitosamente',
      data: plan
    });
  } catch (error) {
    console.error('Error al actualizar plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const eliminarPlan = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Plan.findByPk(id, {
      include: [{ model: Conexion, as: 'conexiones' }]
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan no encontrado'
      });
    }

    if (plan.conexiones && plan.conexiones.length > 0) {
      const conexionesActivas = plan.conexiones.filter(c => c.estado === 'ACTIVA');
      if (conexionesActivas.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar el plan porque tiene conexiones activas'
        });
      }
    }

    await plan.destroy();

    res.json({
      success: true,
      message: 'Plan eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  obtenerPlanes,
  obtenerPlanPorId,
  crearPlan,
  actualizarPlan,
  eliminarPlan
};