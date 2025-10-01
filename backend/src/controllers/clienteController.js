const { Cliente, Conexion, Plan, Puerto, NAP } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

const obtenerClientes = async (req, res) => {
  try {
    const { page = 1, limit = 10, buscar, activo } = req.query;
    const offset = (page - 1) * limit;

    let whereCondition = {};

    if (buscar) {
      whereCondition = {
        [Op.or]: [
          { nombre: { [Op.iLike]: `%${buscar}%` } },
          { ci: { [Op.iLike]: `%${buscar}%` } },
          { correo: { [Op.iLike]: `%${buscar}%` } }
        ]
      };
    }

    const clientes = await Cliente.findAndCountAll({
      where: whereCondition,
      include: [{
        model: Conexion,
        as: 'conexiones',
        include: [
          { model: Plan, as: 'plan' },
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

    res.json({
      success: true,
      data: clientes.rows,
      pagination: {
        total: clientes.count,
        pages: Math.ceil(clientes.count / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const obtenerClientePorId = async (req, res) => {
  try {
    const { id } = req.params;

    const cliente = await Cliente.findByPk(id, {
      include: [{
        model: Conexion,
        as: 'conexiones',
        include: [
          { model: Plan, as: 'plan' },
          {
            model: Puerto,
            as: 'puerto',
            include: [{ model: NAP, as: 'nap' }]
          }
        ]
      }]
    });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      data: cliente
    });
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const crearCliente = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { ci, nombre, telefono, correo, direccion } = req.body;

    const clienteExistente = await Cliente.findOne({ where: { ci } });
    if (clienteExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un cliente con esta cédula'
      });
    }

    const cliente = await Cliente.create({
      ci,
      nombre,
      telefono,
      correo,
      direccion
    });

    res.status(201).json({
      success: true,
      message: 'Cliente creado exitosamente',
      data: cliente
    });
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const actualizarCliente = async (req, res) => {
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
    const { ci, nombre, telefono, correo, direccion } = req.body;

    const cliente = await Cliente.findByPk(id);
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    if (ci !== cliente.ci) {
      const clienteExistente = await Cliente.findOne({ where: { ci } });
      if (clienteExistente) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un cliente con esta cédula'
        });
      }
    }

    await cliente.update({
      ci,
      nombre,
      telefono,
      correo,
      direccion
    });

    res.json({
      success: true,
      message: 'Cliente actualizado exitosamente',
      data: cliente
    });
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const eliminarCliente = async (req, res) => {
  const sequelize = require('../config/database');
  const transaction = await sequelize.transaction();
  // Pasar userId para auditoría
  transaction.userId = req.usuario?.id;

  try {
    const { id } = req.params;

    const cliente = await Cliente.findByPk(id, {
      include: [{
        model: Conexion,
        as: 'conexiones',
        include: [{ model: Puerto, as: 'puerto' }]
      }],
      transaction
    });

    if (!cliente) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Finalizar todas las conexiones activas del cliente y liberar puertos
    if (cliente.conexiones && cliente.conexiones.length > 0) {
      const conexionesActivas = cliente.conexiones.filter(c => c.estado === 'ACTIVA');

      for (const conexion of conexionesActivas) {
        // Finalizar la conexión
        await conexion.update({
          estado: 'FINALIZADA',
          fecha_fin: new Date()
        }, { transaction });

        // Liberar el puerto si existe
        if (conexion.puerto) {
          await conexion.puerto.update({
            estado: 'LIBRE'
          }, { transaction });
        }
      }
    }

    // Eliminar el cliente
    await cliente.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Cliente eliminado exitosamente',
      data: {
        cliente_id: id,
        conexiones_finalizadas: cliente.conexiones ? cliente.conexiones.filter(c => c.estado === 'ACTIVA').length : 0
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  obtenerClientes,
  obtenerClientePorId,
  crearCliente,
  actualizarCliente,
  eliminarCliente
};