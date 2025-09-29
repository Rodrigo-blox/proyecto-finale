const { Puerto, NAP, Conexion, Cliente, Plan } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

const obtenerPuertosPorNAP = async (req, res) => {
  try {
    const { nap_id } = req.params;
    const { estado } = req.query;

    const nap = await NAP.findByPk(nap_id);
    if (!nap) {
      return res.status(404).json({
        success: false,
        message: 'NAP no encontrado'
      });
    }

    let whereCondition = { nap_id };
    if (estado) {
      whereCondition.estado = estado;
    }

    const puertos = await Puerto.findAll({
      where: whereCondition,
      include: [{
        model: Conexion,
        as: 'conexion',
        required: false,
        where: { estado: 'ACTIVA' },
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Plan, as: 'plan' }
        ]
      }],
      order: [['numero', 'ASC']]
    });

    const estadisticas = {
      total: puertos.length,
      libres: puertos.filter(p => p.estado === 'LIBRE').length,
      ocupados: puertos.filter(p => p.estado === 'OCUPADO').length,
      mantenimiento: puertos.filter(p => p.estado === 'MANTENIMIENTO').length
    };

    res.json({
      success: true,
      data: {
        nap: nap,
        puertos: puertos,
        estadisticas: estadisticas
      }
    });
  } catch (error) {
    console.error('Error al obtener puertos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const obtenerPuertosLibres = async (req, res) => {
  try {
    const { nap_id } = req.query;

    let whereCondition = { estado: 'LIBRE' };
    if (nap_id) {
      whereCondition.nap_id = nap_id;
    }

    const puertos = await Puerto.findAll({
      where: whereCondition,
      include: [{ model: NAP, as: 'nap' }],
      order: [['nap', 'codigo'], ['numero', 'ASC']]
    });

    res.json({
      success: true,
      data: puertos,
      total: puertos.length
    });
  } catch (error) {
    console.error('Error al obtener puertos libres:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const obtenerPuertoPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const puerto = await Puerto.findByPk(id, {
      include: [
        { model: NAP, as: 'nap' },
        {
          model: Conexion,
          as: 'conexion',
          required: false,
          include: [
            { model: Cliente, as: 'cliente' },
            { model: Plan, as: 'plan' }
          ]
        }
      ]
    });

    if (!puerto) {
      return res.status(404).json({
        success: false,
        message: 'Puerto no encontrado'
      });
    }

    res.json({
      success: true,
      data: puerto
    });
  } catch (error) {
    console.error('Error al obtener puerto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const actualizarPuerto = async (req, res) => {
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
    const { estado, nota } = req.body;

    const puerto = await Puerto.findByPk(id, {
      include: [{
        model: Conexion,
        as: 'conexion',
        where: { estado: 'ACTIVA' },
        required: false
      }]
    });

    if (!puerto) {
      return res.status(404).json({
        success: false,
        message: 'Puerto no encontrado'
      });
    }

    if (estado === 'LIBRE' && puerto.conexion) {
      return res.status(400).json({
        success: false,
        message: 'No se puede liberar un puerto con conexión activa'
      });
    }

    if (estado === 'OCUPADO' && !puerto.conexion) {
      return res.status(400).json({
        success: false,
        message: 'No se puede ocupar un puerto sin conexión activa'
      });
    }

    await puerto.update({
      estado: estado || puerto.estado,
      nota: nota !== undefined ? nota : puerto.nota
    });

    const puertoActualizado = await Puerto.findByPk(id, {
      include: [
        { model: NAP, as: 'nap' },
        {
          model: Conexion,
          as: 'conexion',
          required: false,
          include: [
            { model: Cliente, as: 'cliente' },
            { model: Plan, as: 'plan' }
          ]
        }
      ]
    });

    res.json({
      success: true,
      message: 'Puerto actualizado exitosamente',
      data: puertoActualizado
    });
  } catch (error) {
    console.error('Error al actualizar puerto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const crearPuertosParaNAP = async (req, res) => {
  try {
    const { nap_id } = req.params;

    const nap = await NAP.findByPk(nap_id);
    if (!nap) {
      return res.status(404).json({
        success: false,
        message: 'NAP no encontrado'
      });
    }

    const puertosExistentes = await Puerto.findAll({
      where: { nap_id },
      attributes: ['numero']
    });

    const numerosExistentes = puertosExistentes.map(p => p.numero);
    const puertosACrear = [];

    for (let i = 1; i <= nap.total_puertos; i++) {
      if (!numerosExistentes.includes(i)) {
        puertosACrear.push({
          nap_id,
          numero: i,
          estado: 'LIBRE'
        });
      }
    }

    if (puertosACrear.length === 0) {
      return res.json({
        success: true,
        message: 'Todos los puertos ya existen para este NAP',
        data: []
      });
    }

    const nuevosPuertos = await Puerto.bulkCreate(puertosACrear);

    res.status(201).json({
      success: true,
      message: `Se crearon ${nuevosPuertos.length} puertos para el NAP`,
      data: nuevosPuertos
    });
  } catch (error) {
    console.error('Error al crear puertos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const obtenerEstadisticasPuertos = async (req, res) => {
  try {
    const { nap_id } = req.query;

    let whereCondition = {};
    if (nap_id) {
      whereCondition.nap_id = nap_id;
    }

    const estadisticas = await Puerto.findAll({
      where: whereCondition,
      attributes: [
        'estado',
        [Puerto.sequelize.fn('COUNT', Puerto.sequelize.col('id')), 'cantidad']
      ],
      group: ['estado']
    });

    const total = await Puerto.count({ where: whereCondition });

    const estadisticasFormateadas = {
      total,
      por_estado: estadisticas.reduce((acc, stat) => {
        acc[stat.estado] = parseInt(stat.dataValues.cantidad);
        return acc;
      }, {})
    };

    if (nap_id) {
      const nap = await NAP.findByPk(nap_id);
      if (nap) {
        estadisticasFormateadas.porcentaje_ocupacion =
          Math.round((estadisticasFormateadas.por_estado.OCUPADO || 0) / nap.total_puertos * 100);
      }
    }

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
  obtenerPuertosPorNAP,
  obtenerPuertosLibres,
  obtenerPuertoPorId,
  actualizarPuerto,
  crearPuertosParaNAP,
  obtenerEstadisticasPuertos
};