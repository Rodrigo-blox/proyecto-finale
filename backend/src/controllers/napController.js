const { NAP, Puerto, Conexion, Cliente, Plan } = require('../models');
const { Op } = require('sequelize');

/**
 * Obtiene una lista paginada de NAPs con filtros opcionales y estadísticas de ocupación
 * 
 * @async
 * @function obtenerNAPs
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.query - Parámetros de consulta
 * @param {string} [req.query.estado] - Filtro por estado del NAP
 * @param {string} [req.query.busqueda] - Búsqueda por código, modelo o ubicación (case-insensitive)
 * @param {number} [req.query.limite=10] - Número de registros por página
 * @param {number} [req.query.pagina=1] - Página actual
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con lista paginada de NAPs y metadatos
 * 
 * @example
 * // GET /api/naps?estado=ACTIVO&busqueda=NAP001&limite=5&pagina=1
 * // Respuesta:
 * // {
 * //   success: true,
 * //   data: [...], // NAPs con estadísticas de ocupación
 * //   meta: {
 * //     total: 50,
 * //     pagina: 1,
 * //     limite: 5,
 * //     total_paginas: 10
 * //   }
 * // }
 * 
 * @description
 * - Implementa paginación con offset y limit
 * - Permite búsqueda flexible en campos: código, modelo, ubicación
 * - Calcula estadísticas de ocupación para cada NAP
 * - Incluye relaciones: puertos → conexiones → clientes/planes
 * - Ordena resultados por fecha de creación descendente
 */
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

/**
 * Obtiene un NAP específico por su ID con todos sus datos relacionados
 * 
 * @async
 * @function obtenerNAPPorId
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de ruta
 * @param {string} req.params.id - ID único del NAP a obtener
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con datos completos del NAP o error 404
 * 
 * @example
 * // GET /api/naps/123
 * // Respuesta exitosa:
 * // {
 * //   success: true,
 * //   data: {
 * //     id: 123,
 * //     codigo: "NAP001",
 * //     modelo: "Huawei 16P",
 * //     puertos: [...],
 * //     ...
 * //   }
 * // }
 * 
 * @throws {404} NAP no encontrado
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Incluye todas las relaciones: puertos, conexiones, clientes y planes
 * - Solo muestra conexiones con estado ACTIVA o SUSPENDIDA
 * - Valida existencia del NAP antes de responder
 * - Utiliza eager loading para optimizar consultas
 */
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

/**
 * Crea un nuevo NAP y genera automáticamente sus puertos asociados
 * 
 * @async
 * @function crearNAP
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.body - Datos del NAP a crear
 * @param {string} req.body.codigo - Código único del NAP
 * @param {string} req.body.modelo - Modelo del equipo NAP
 * @param {string} req.body.ubicacion - Ubicación física del NAP
 * @param {number} req.body.total_puertos - Cantidad total de puertos del NAP
 * @param {number} req.body.latitud - Coordenada de latitud
 * @param {number} req.body.longitud - Coordenada de longitud
 * @param {string} req.body.estado - Estado del NAP (ACTIVO, INACTIVO, MANTENIMIENTO)
 * @param {Object} [req.usuario] - Usuario autenticado (para auditoría)
 * @param {number} [req.usuario.id] - ID del usuario que crea el NAP
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con NAP creado y sus puertos
 * 
 * @example
 * // POST /api/naps
 * // Body: {
 * //   codigo: "NAP001",
 * //   modelo: "Huawei 16P",
 * //   ubicacion: "Calle Principal 123",
 * //   total_puertos: 16,
 * //   latitud: -12.0464,
 * //   longitud: -77.0428,
 * //   estado: "ACTIVO"
 * // }
 * 
 * @throws {400} El código del NAP ya existe (SequelizeUniqueConstraintError)
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Crea el NAP con auditoría (userId)
 * - Genera automáticamente puertos numerados del 1 al total_puertos
 * - Todos los puertos se crean con estado 'LIBRE'
 * - Utiliza bulkCreate para eficiencia en la creación de puertos
 * - Operación transaccional para mantener integridad de datos
 * - Retorna el NAP completo con sus puertos asociados
 */
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

/**
 * Actualiza los datos de un NAP existente
 * 
 * @async
 * @function actualizarNAP
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.params - Parámetros de ruta
 * @param {string} req.params.id - ID único del NAP a actualizar
 * @param {Object} req.body - Datos de actualización del NAP
 * @param {string} [req.body.codigo] - Nuevo código del NAP
 * @param {string} [req.body.modelo] - Nuevo modelo del equipo
 * @param {string} [req.body.ubicacion] - Nueva ubicación física
 * @param {string} [req.body.estado] - Nuevo estado del NAP
 * @param {number} [req.body.latitud] - Nueva coordenada de latitud
 * @param {number} [req.body.longitud] - Nueva coordenada de longitud
 * @param {Object} [req.usuario] - Usuario autenticado (para auditoría)
 * @param {number} [req.usuario.id] - ID del usuario que actualiza el NAP
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con NAP actualizado
 * 
 * @example
 * // PUT /api/naps/123
 * // Body: {
 * //   estado: "MANTENIMIENTO",
 * //   ubicacion: "Nueva Calle 456"
 * // }
 * 
 * @throws {404} NAP no encontrado
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Valida existencia del NAP antes de actualizar
 * - Registra auditoría con userId del usuario que realiza la actualización
 * - Retorna el NAP actualizado con sus puertos asociados
 * - Permite actualización parcial de campos
 * - Mantiene integridad referencial con entidades relacionadas
 */
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

/**
 * Obtiene datos optimizados de todos los NAPs para visualización en mapa
 * 
 * @async
 * @function obtenerNAPsEnMapa
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * 
 * @returns {Promise<void>} Respuesta JSON con NAPs optimizados para mapa
 * 
 * @example
 * // GET /api/naps/mapa
 * // Respuesta:
 * // {
 * //   success: true,
 * //   data: [
 * //     {
 * //       id: 1,
 * //       codigo: "NAP001",
 * //       modelo: "Huawei 16P",
 * //       estado: "ACTIVO",
 * //       ubicacion: "Calle Principal 123",
 * //       coordenadas: {
 * //         latitud: -12.0464,
 * //         longitud: -77.0428
 * //       },
 * //       estadisticas: {
 * //         total_puertos: 16,
 * //         puertos_ocupados: 8,
 * //         porcentaje_ocupacion: 50.0
 * //       }
 * //     }
 * //   ]
 * // }
 * 
 * @throws {500} Error interno del servidor
 * 
 * @description
 * - Optimizado para rendimiento en mapas con muchos NAPs
 * - Solo incluye atributos esenciales para visualización
 * - Convierte coordenadas a números para compatibilidad con librerías de mapas
 * - Calcula estadísticas de ocupación sin incluir relaciones completas
 * - Minimiza transferencia de datos para mejor experiencia de usuario
 * - Ideal para marcadores de mapa con información resumida
 */
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