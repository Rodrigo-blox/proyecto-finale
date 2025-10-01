const { NAP, Puerto, Conexion, Cliente, Plan } = require('../models');
const { Op } = require('sequelize');

const obtenerNAPs = async (req, res) => {
  try {
    const { estado, busqueda, limite = 10, pagina = 1 } = req.query;

    const whereClause = {};

    if (estado) {
      whereClause.estado = estado;
    }

    if (busqueda) {
      whereClause[Op.or] = [
        { codigo: { [Op.iLike]: `%${busqueda}%` } },
        { modelo: { [Op.iLike]: `%${busqueda}%` } },
        { ubicacion: { [Op.iLike]: `%${busqueda}%` } },
      ];
    }

    const offset = (pagina - 1) * limite;

    const { count, rows: naps } = await NAP.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Puerto,
          as: 'puertos',
          include: [
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
        }
      ],
      limit: parseInt(limite),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    const napsConEstadisticas = naps.map(nap => {
      const puertosOcupados = nap.puertos.filter(p => p.estado === 'OCUPADO').length;
      const porcentajeOcupacion = (puertosOcupados / nap.total_puertos) * 100;

      return {
        ...nap.toJSON(),
        estadisticas: {
          puertos_ocupados: puertosOcupados,
          puertos_libres: nap.total_puertos - puertosOcupados,
          porcentaje_ocupacion: Math.round(porcentajeOcupacion * 100) / 100
        }
      };
    });

    res.json({
      success: true,
      data: napsConEstadisticas,
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
      message: 'Error al obtener NAPs'
    });
  }
};

const obtenerNAPPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const nap = await NAP.findByPk(id, {
      include: [
        {
          model: Puerto,
          as: 'puertos',
          include: [
            {
              model: Conexion,
              as: 'conexion',
              required: false,
              where: {
                estado: {
                  [Op.in]: ['ACTIVA', 'SUSPENDIDA']
                }
              },
              include: [
                { model: Cliente, as: 'cliente' },
                { model: Plan, as: 'plan' }
              ]
            }
          ]
        }
      ]
    });

    if (!nap) {
      return res.status(404).json({
        success: false,
        message: 'NAP no encontrado'
      });
    }

    res.json({
      success: true,
      data: nap
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener NAP'
    });
  }
};

const crearNAP = async (req, res) => {
  try {
    const napData = req.body;

    const nap = await NAP.create(napData, { userId: req.usuario?.id });

    const puertos = [];
    for (let i = 1; i <= napData.total_puertos; i++) {
      puertos.push({
        nap_id: nap.id,
        numero: i,
        estado: 'LIBRE'
      });
    }

    await Puerto.bulkCreate(puertos, { userId: req.usuario?.id });

    const napCompleto = await NAP.findByPk(nap.id, {
      include: [{ model: Puerto, as: 'puertos' }]
    });

    res.status(201).json({
      success: true,
      data: napCompleto,
      message: 'NAP creado exitosamente'
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'El código del NAP ya existe'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al crear NAP'
    });
  }
};

const actualizarNAP = async (req, res) => {
  try {
    const { id } = req.params;
    const datosActualizacion = req.body;

    const nap = await NAP.findByPk(id);

    if (!nap) {
      return res.status(404).json({
        success: false,
        message: 'NAP no encontrado'
      });
    }

    await nap.update(datosActualizacion, { userId: req.usuario?.id });

    const napActualizado = await NAP.findByPk(id, {
      include: [{ model: Puerto, as: 'puertos' }]
    });

    res.json({
      success: true,
      data: napActualizado,
      message: 'NAP actualizado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar NAP'
    });
  }
};

const obtenerNAPsEnMapa = async (req, res) => {
  try {
    const naps = await NAP.findAll({
      attributes: ['id', 'codigo', 'modelo', 'estado', 'ubicacion', 'latitud', 'longitud'],
      include: [
        {
          model: Puerto,
          as: 'puertos',
          attributes: ['estado']
        }
      ]
    });

    const napsParaMapa = naps.map(nap => {
      const puertosOcupados = nap.puertos.filter(p => p.estado === 'OCUPADO').length;
      const porcentajeOcupacion = (puertosOcupados / nap.puertos.length) * 100;

      return {
        id: nap.id,
        codigo: nap.codigo,
        modelo: nap.modelo,
        estado: nap.estado,
        ubicacion: nap.ubicacion,
        coordenadas: {
          latitud: parseFloat(nap.latitud),
          longitud: parseFloat(nap.longitud)
        },
        estadisticas: {
          total_puertos: nap.puertos.length,
          puertos_ocupados: puertosOcupados,
          porcentaje_ocupacion: Math.round(porcentajeOcupacion * 100) / 100
        }
      };
    });

    res.json({
      success: true,
      data: napsParaMapa
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener NAPs para el mapa'
    });
  }
};

module.exports = {
  obtenerNAPs,
  obtenerNAPPorId,
  crearNAP,
  actualizarNAP,
  obtenerNAPsEnMapa
};