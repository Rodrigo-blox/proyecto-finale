const { Conexion, Cliente, Plan, Puerto, NAP, Usuario } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

const obtenerConexiones = async (req, res) => {
  try {
    const { page = 1, limit = 10, estado, cliente_id, nap_id, buscar } = req.query;
    const offset = (page - 1) * limit;

    let whereCondition = {};
    let includeCondition = [
      { model: Cliente, as: 'cliente' },
      { model: Plan, as: 'plan' },
      { model: Usuario, as: 'creador', attributes: ['id', 'nombre', 'correo'] },
      {
        model: Puerto,
        as: 'puerto',
        include: [{ model: NAP, as: 'nap' }]
      }
    ];

    if (estado) {
      whereCondition.estado = estado;
    }

    if (cliente_id) {
      whereCondition.cliente_id = cliente_id;
    }

    if (nap_id) {
      includeCondition = includeCondition.map(inc => {
        if (inc.model === Puerto) {
          return {
            ...inc,
            include: [{
              model: NAP,
              as: 'nap',
              where: { id: nap_id }
            }]
          };
        }
        return inc;
      });
    }

    if (buscar) {
      includeCondition = includeCondition.map(inc => {
        if (inc.model === Cliente) {
          return {
            ...inc,
            where: {
              [Op.or]: [
                { nombre: { [Op.iLike]: `%${buscar}%` } },
                { ci: { [Op.iLike]: `%${buscar}%` } }
              ]
            }
          };
        }
        return inc;
      });
    }

    const conexiones = await Conexion.findAndCountAll({
      where: whereCondition,
      include: includeCondition,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: conexiones.rows,
      pagination: {
        total: conexiones.count,
        pages: Math.ceil(conexiones.count / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener conexiones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const obtenerConexionPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const conexion = await Conexion.findByPk(id, {
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Plan, as: 'plan' },
        { model: Usuario, as: 'creador', attributes: ['id', 'nombre', 'correo'] },
        {
          model: Puerto,
          as: 'puerto',
          include: [{ model: NAP, as: 'nap' }]
        }
      ]
    });

    if (!conexion) {
      return res.status(404).json({
        success: false,
        message: 'Conexión no encontrada'
      });
    }

    res.json({
      success: true,
      data: conexion
    });
  } catch (error) {
    console.error('Error al obtener conexión:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const crearConexion = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { puerto_id, cliente_id, plan_id, fecha_inicio, fecha_fin } = req.body;
    const creado_por = req.usuario.id;

    const puerto = await Puerto.findByPk(puerto_id);
    if (!puerto) {
      return res.status(404).json({
        success: false,
        message: 'Puerto no encontrado'
      });
    }

    if (puerto.estado !== 'LIBRE') {
      return res.status(400).json({
        success: false,
        message: 'El puerto no está disponible'
      });
    }

    const cliente = await Cliente.findByPk(cliente_id);
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    const plan = await Plan.findByPk(plan_id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan no encontrado'
      });
    }

    const conexionExistente = await Conexion.findOne({
      where: {
        puerto_id,
        estado: 'ACTIVA'
      }
    });

    if (conexionExistente) {
      return res.status(400).json({
        success: false,
        message: 'El puerto ya tiene una conexión activa'
      });
    }

    const conexion = await Conexion.create({
      puerto_id,
      cliente_id,
      plan_id,
      fecha_inicio,
      fecha_fin,
      estado: 'ACTIVA',
      creado_por
    });

    await puerto.update({ estado: 'OCUPADO' });

    const conexionCompleta = await Conexion.findByPk(conexion.id, {
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Plan, as: 'plan' },
        { model: Usuario, as: 'creador', attributes: ['id', 'nombre', 'correo'] },
        {
          model: Puerto,
          as: 'puerto',
          include: [{ model: NAP, as: 'nap' }]
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Conexión creada exitosamente',
      data: conexionCompleta
    });
  } catch (error) {
    console.error('Error al crear conexión:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const actualizarConexion = async (req, res) => {
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
    const { plan_id, fecha_fin, estado } = req.body;

    const conexion = await Conexion.findByPk(id, {
      include: [{ model: Puerto, as: 'puerto' }]
    });

    if (!conexion) {
      return res.status(404).json({
        success: false,
        message: 'Conexión no encontrada'
      });
    }

    if (plan_id) {
      const plan = await Plan.findByPk(plan_id);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Plan no encontrado'
        });
      }
    }

    const estadoAnterior = conexion.estado;

    await conexion.update({
      plan_id: plan_id || conexion.plan_id,
      fecha_fin,
      estado: estado || conexion.estado
    });

    if (estado && estado !== estadoAnterior) {
      if (estado === 'FINALIZADA' || estado === 'SUSPENDIDA') {
        await conexion.puerto.update({ estado: 'LIBRE' });
      } else if (estado === 'ACTIVA' && estadoAnterior !== 'ACTIVA') {
        await conexion.puerto.update({ estado: 'OCUPADO' });
      }
    }

    const conexionActualizada = await Conexion.findByPk(id, {
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Plan, as: 'plan' },
        { model: Usuario, as: 'creador', attributes: ['id', 'nombre', 'correo'] },
        {
          model: Puerto,
          as: 'puerto',
          include: [{ model: NAP, as: 'nap' }]
        }
      ]
    });

    res.json({
      success: true,
      message: 'Conexión actualizada exitosamente',
      data: conexionActualizada
    });
  } catch (error) {
    console.error('Error al actualizar conexión:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const finalizarConexion = async (req, res) => {
  try {
    const { id } = req.params;

    const conexion = await Conexion.findByPk(id, {
      include: [{ model: Puerto, as: 'puerto' }]
    });

    if (!conexion) {
      return res.status(404).json({
        success: false,
        message: 'Conexión no encontrada'
      });
    }

    if (conexion.estado === 'FINALIZADA') {
      return res.status(400).json({
        success: false,
        message: 'La conexión ya está finalizada'
      });
    }

    await conexion.update({
      estado: 'FINALIZADA',
      fecha_fin: new Date()
    });

    await conexion.puerto.update({ estado: 'LIBRE' });

    const conexionFinalizada = await Conexion.findByPk(id, {
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Plan, as: 'plan' },
        { model: Usuario, as: 'creador', attributes: ['id', 'nombre', 'correo'] },
        {
          model: Puerto,
          as: 'puerto',
          include: [{ model: NAP, as: 'nap' }]
        }
      ]
    });

    res.json({
      success: true,
      message: 'Conexión finalizada exitosamente',
      data: conexionFinalizada
    });
  } catch (error) {
    console.error('Error al finalizar conexión:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const obtenerConexionesPorCliente = async (req, res) => {
  try {
    const { cliente_id } = req.params;
    const { estado } = req.query;

    let whereCondition = { cliente_id };
    if (estado) {
      whereCondition.estado = estado;
    }

    const conexiones = await Conexion.findAll({
      where: whereCondition,
      include: [
        { model: Plan, as: 'plan' },
        {
          model: Puerto,
          as: 'puerto',
          include: [{ model: NAP, as: 'nap' }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: conexiones
    });
  } catch (error) {
    console.error('Error al obtener conexiones del cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  obtenerConexiones,
  obtenerConexionPorId,
  crearConexion,
  actualizarConexion,
  finalizarConexion,
  obtenerConexionesPorCliente
};