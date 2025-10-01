const { NAP, Puerto, Cliente, Conexion, Plan, Mantenimiento, Usuario } = require('../models');
const { Op } = require('sequelize');
const PDFGenerator = require('../utils/pdfGenerator');
const ExcelGenerator = require('../utils/excelGenerator');

/**
 * Helper para enviar reporte en el formato solicitado
 */
const enviarReporteEnFormato = async (res, datos, tipo, formato = 'json') => {
  try {
    switch (formato.toLowerCase()) {
      case 'pdf':
        const pdfBuffer = await PDFGenerator.generarPDF(datos, tipo);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('Content-Disposition', `attachment; filename=reporte_${tipo}_${Date.now()}.pdf`);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.end(pdfBuffer, 'binary');

      case 'excel':
      case 'xlsx':
        const excelBuffer = await ExcelGenerator.generarExcel(datos, tipo);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Length', excelBuffer.length);
        res.setHeader('Content-Disposition', `attachment; filename=reporte_${tipo}_${Date.now()}.xlsx`);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.end(excelBuffer, 'binary');

      case 'json':
      default:
        return res.json(datos);
    }
  } catch (error) {
    console.error(`Error al generar reporte en formato ${formato}:`, error);
    return res.status(500).json({
      success: false,
      message: `Error al generar el reporte en formato ${formato}`
    });
  }
};

const reporteOcupacionNAPs = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, formato = 'json' } = req.query;

    let whereCondition = {};
    if (fecha_desde || fecha_hasta) {
      whereCondition.createdAt = {};
      if (fecha_desde) {
        whereCondition.createdAt[Op.gte] = new Date(fecha_desde);
      }
      if (fecha_hasta) {
        whereCondition.createdAt[Op.lte] = new Date(fecha_hasta);
      }
    }

    const naps = await NAP.findAll({
      where: whereCondition,
      attributes: ['id', 'codigo', 'modelo', 'ubicacion', 'estado', 'total_puertos', 'createdAt'],
      include: [{
        model: Puerto,
        as: 'puertos',
        attributes: ['id', 'numero', 'estado'],
        include: [{
          model: Conexion,
          as: 'conexion',
          required: false,
          where: { estado: 'ACTIVA' },
          include: [
            { model: Cliente, as: 'cliente', attributes: ['nombre', 'ci'] },
            { model: Plan, as: 'plan', attributes: ['nombre', 'velocidad_mbps'] }
          ]
        }]
      }],
      order: [['codigo', 'ASC'], ['puertos', 'numero', 'ASC']]
    });

    const reporte = naps.map(nap => {
      const puertosLibres = nap.puertos.filter(p => p.estado === 'LIBRE').length;
      const puertosOcupados = nap.puertos.filter(p => p.estado === 'OCUPADO').length;
      const puertosMantenimiento = nap.puertos.filter(p => p.estado === 'MANTENIMIENTO').length;
      const porcentajeOcupacion = Math.round((puertosOcupados / nap.total_puertos) * 100);

      return {
        nap: {
          id: nap.id,
          codigo: nap.codigo,
          modelo: nap.modelo,
          ubicacion: nap.ubicacion,
          estado: nap.estado,
          fecha_instalacion: nap.createdAt
        },
        estadisticas: {
          total_puertos: nap.total_puertos,
          puertos_libres: puertosLibres,
          puertos_ocupados: puertosOcupados,
          puertos_mantenimiento: puertosMantenimiento,
          porcentaje_ocupacion: porcentajeOcupacion
        },
        conexiones_activas: nap.puertos
          .filter(p => p.conexion)
          .map(p => ({
            puerto: p.numero,
            cliente: p.conexion.cliente?.nombre || 'N/A',
            ci: p.conexion.cliente?.ci || 'N/A',
            plan: p.conexion.plan?.nombre || 'N/A',
            velocidad: p.conexion.plan?.velocidad_mbps || 0
          }))
      };
    });

    const resultado = {
      success: true,
      tipo: 'OCUPACION_NAPS',
      fecha_generacion: new Date(),
      parametros: { fecha_desde, fecha_hasta },
      data: reporte,
      resumen: {
        total_naps: reporte.length,
        total_puertos: reporte.reduce((sum, n) => sum + n.estadisticas.total_puertos, 0),
        total_ocupados: reporte.reduce((sum, n) => sum + n.estadisticas.puertos_ocupados, 0),
        promedio_ocupacion: Math.round(
          reporte.reduce((sum, n) => sum + n.estadisticas.porcentaje_ocupacion, 0) / reporte.length
        )
      }
    };

    return enviarReporteEnFormato(res, resultado, 'ocupacion_naps', formato);
  } catch (error) {
    console.error('Error al generar reporte de ocupación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const reporteConsumoPorCliente = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, cliente_id, formato = 'json' } = req.query;

    let whereCondition = {};
    if (cliente_id) {
      whereCondition.cliente_id = cliente_id;
    }

    let conexionWhere = {};
    if (fecha_desde || fecha_hasta) {
      conexionWhere.createdAt = {};
      if (fecha_desde) {
        conexionWhere.createdAt[Op.gte] = new Date(fecha_desde);
      }
      if (fecha_hasta) {
        conexionWhere.createdAt[Op.lte] = new Date(fecha_hasta);
      }
    }

    const conexiones = await Conexion.findAll({
      where: { ...whereCondition, ...conexionWhere },
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Plan, as: 'plan' },
        {
          model: Puerto,
          as: 'puerto',
          include: [{ model: NAP, as: 'nap' }]
        }
      ],
      order: [['cliente', 'nombre'], ['createdAt', 'DESC']]
    });

    const clientesMap = new Map();

    conexiones.forEach(conexion => {
      const clienteId = conexion.cliente.id;

      if (!clientesMap.has(clienteId)) {
        clientesMap.set(clienteId, {
          cliente: {
            id: conexion.cliente.id,
            nombre: conexion.cliente.nombre,
            ci: conexion.cliente.ci,
            telefono: conexion.cliente.telefono,
            correo: conexion.cliente.correo
          },
          conexiones: [],
          resumen: {
            total_conexiones: 0,
            conexiones_activas: 0,
            conexiones_finalizadas: 0,
            planes_utilizados: new Set()
          }
        });
      }

      const cliente = clientesMap.get(clienteId);

      cliente.conexiones.push({
        id: conexion.id,
        plan: conexion.plan.nombre,
        velocidad_mbps: conexion.plan.velocidad_mbps,
        nap: conexion.puerto.nap.codigo,
        puerto: conexion.puerto.numero,
        fecha_inicio: conexion.fecha_inicio,
        fecha_fin: conexion.fecha_fin,
        estado: conexion.estado,
        dias_activo: conexion.fecha_fin
          ? Math.ceil((new Date(conexion.fecha_fin) - new Date(conexion.fecha_inicio)) / (1000 * 60 * 60 * 24))
          : Math.ceil((new Date() - new Date(conexion.fecha_inicio)) / (1000 * 60 * 60 * 24))
      });

      cliente.resumen.total_conexiones++;
      if (conexion.estado === 'ACTIVA') cliente.resumen.conexiones_activas++;
      if (conexion.estado === 'FINALIZADA') cliente.resumen.conexiones_finalizadas++;
      cliente.resumen.planes_utilizados.add(conexion.plan.nombre);
    });

    const reporte = Array.from(clientesMap.values()).map(cliente => ({
      ...cliente,
      resumen: {
        ...cliente.resumen,
        planes_utilizados: Array.from(cliente.resumen.planes_utilizados)
      }
    }));

    const resultado = {
      success: true,
      tipo: 'CONSUMO_POR_CLIENTE',
      fecha_generacion: new Date(),
      parametros: { fecha_desde, fecha_hasta, cliente_id },
      data: reporte,
      resumen: {
        total_clientes: reporte.length,
        total_conexiones: reporte.reduce((sum, c) => sum + c.resumen.total_conexiones, 0),
        conexiones_activas: reporte.reduce((sum, c) => sum + c.resumen.conexiones_activas, 0)
      }
    };

    return enviarReporteEnFormato(res, resultado, 'consumo_cliente', formato);
  } catch (error) {
    console.error('Error al generar reporte de consumo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const reporteEstadoTecnico = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, formato = 'json' } = req.query;

    let whereCondition = {};
    if (fecha_desde || fecha_hasta) {
      whereCondition.createdAt = {};
      if (fecha_desde) {
        whereCondition.createdAt[Op.gte] = new Date(fecha_desde);
      }
      if (fecha_hasta) {
        whereCondition.createdAt[Op.lte] = new Date(fecha_hasta);
      }
    }

    const naps = await NAP.findAll({
      where: whereCondition,
      include: [
        {
          model: Puerto,
          as: 'puertos',
          include: [{
            model: Conexion,
            as: 'conexion',
            required: false,
            where: { estado: 'ACTIVA' }
          }]
        },
        {
          model: Mantenimiento,
          as: 'mantenimientos',
          include: [{ model: Usuario, as: 'tecnico', attributes: ['nombre'] }],
          limit: 5,
          order: [['fecha', 'DESC']]
        }
      ]
    });

    const reporte = naps.map(nap => {
      const puertosOcupados = nap.puertos.filter(p => p.estado === 'OCUPADO').length;
      const porcentajeOcupacion = Math.round((puertosOcupados / nap.total_puertos) * 100);

      let estadoTecnico = 'BUENO';
      if (nap.estado === 'MANTENIMIENTO') {
        estadoTecnico = 'MANTENIMIENTO';
      } else if (nap.estado === 'SATURADO' || porcentajeOcupacion >= 90) {
        estadoTecnico = 'CRITICO';
      } else if (porcentajeOcupacion >= 75) {
        estadoTecnico = 'ADVERTENCIA';
      }

      const ultimoMantenimiento = nap.mantenimientos[0];
      const mantenimientosCorrectivos = nap.mantenimientos.filter(m => m.tipo === 'CORRECTIVO').length;

      return {
        nap: {
          id: nap.id,
          codigo: nap.codigo,
          modelo: nap.modelo,
          firmware: nap.firmware,
          ubicacion: nap.ubicacion,
          estado: nap.estado
        },
        estado_tecnico: estadoTecnico,
        ocupacion: {
          porcentaje: porcentajeOcupacion,
          puertos_ocupados: puertosOcupados,
          total_puertos: nap.total_puertos
        },
        mantenimiento: {
          ultimo_mantenimiento: ultimoMantenimiento ? {
            fecha: ultimoMantenimiento.fecha,
            tipo: ultimoMantenimiento.tipo,
            tecnico: ultimoMantenimiento.tecnico?.nombre
          } : null,
          total_mantenimientos: nap.mantenimientos.length,
          mantenimientos_correctivos: mantenimientosCorrectivos,
          dias_desde_ultimo: ultimoMantenimiento
            ? Math.ceil((new Date() - new Date(ultimoMantenimiento.fecha)) / (1000 * 60 * 60 * 24))
            : null
        }
      };
    });

    const estadisticasGenerales = {
      total_naps: reporte.length,
      buenos: reporte.filter(n => n.estado_tecnico === 'BUENO').length,
      advertencia: reporte.filter(n => n.estado_tecnico === 'ADVERTENCIA').length,
      criticos: reporte.filter(n => n.estado_tecnico === 'CRITICO').length,
      mantenimiento: reporte.filter(n => n.estado_tecnico === 'MANTENIMIENTO').length
    };

    const resultado = {
      success: true,
      tipo: 'ESTADO_TECNICO',
      fecha_generacion: new Date(),
      parametros: { fecha_desde, fecha_hasta },
      data: reporte,
      resumen: estadisticasGenerales
    };

    return enviarReporteEnFormato(res, resultado, 'estado_tecnico', formato);
  } catch (error) {
    console.error('Error al generar reporte técnico:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const reportePlanesPopulares = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, formato = 'json' } = req.query;

    let whereCondition = { estado: 'ACTIVA' };
    if (fecha_desde || fecha_hasta) {
      whereCondition.createdAt = {};
      if (fecha_desde) {
        whereCondition.createdAt[Op.gte] = new Date(fecha_desde);
      }
      if (fecha_hasta) {
        whereCondition.createdAt[Op.lte] = new Date(fecha_hasta);
      }
    }

    // Obtener todas las conexiones activas con planes
    const conexiones = await Conexion.findAll({
      where: whereCondition,
      include: [{ model: Plan, as: 'plan' }]
    });

    // Agrupar por plan
    const planesMap = new Map();

    conexiones.forEach(conexion => {
      const planId = conexion.plan.id;
      if (!planesMap.has(planId)) {
        planesMap.set(planId, {
          plan: {
            id: conexion.plan.id,
            nombre: conexion.plan.nombre,
            velocidad_mbps: conexion.plan.velocidad_mbps,
            precio: conexion.plan.precio || 0
          },
          total_contrataciones: 0,
          porcentaje: 0,
          ingreso_estimado: 0
        });
      }

      const planData = planesMap.get(planId);
      planData.total_contrataciones++;
      planData.ingreso_estimado += conexion.plan.precio || 0;
    });

    // Convertir a array y calcular porcentajes
    const totalConexiones = conexiones.length;
    const planesArray = Array.from(planesMap.values()).map(plan => ({
      ...plan,
      porcentaje: Math.round((plan.total_contrataciones / totalConexiones) * 100)
    }));

    // Ordenar por popularidad
    planesArray.sort((a, b) => b.total_contrataciones - a.total_contrataciones);

    // Calcular estadísticas
    const velocidadPromedio = planesArray.reduce((sum, p) =>
      sum + (p.plan.velocidad_mbps * p.total_contrataciones), 0) / totalConexiones;

    const ingresoTotal = planesArray.reduce((sum, p) => sum + p.ingreso_estimado, 0);

    const resultado = {
      success: true,
      tipo: 'PLANES_POPULARES',
      fecha_generacion: new Date(),
      parametros: { fecha_desde, fecha_hasta },
      data: planesArray,
      resumen: {
        total_planes: planesArray.length,
        total_conexiones: totalConexiones,
        velocidad_promedio_mbps: Math.round(velocidadPromedio),
        ingreso_mensual_estimado: `$${Math.round(ingresoTotal).toLocaleString()}`,
        plan_mas_popular: planesArray[0]?.plan.nombre || 'N/A',
        contrataciones_mas_popular: planesArray[0]?.total_contrataciones || 0,
        plan_menos_popular: planesArray[planesArray.length - 1]?.plan.nombre || 'N/A',
        contrataciones_menos_popular: planesArray[planesArray.length - 1]?.total_contrataciones || 0
      }
    };

    return enviarReporteEnFormato(res, resultado, 'planes_populares', formato);
  } catch (error) {
    console.error('Error al generar reporte de planes populares:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const reporteTendenciasPlanes = async (req, res) => {
  try {
    const { meses = 6, formato = 'json' } = req.query;

    // Calcular fechas para los últimos N meses
    const fechaActual = new Date();
    const resultados = [];

    for (let i = parseInt(meses) - 1; i >= 0; i--) {
      const fechaInicio = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - i, 1);
      const fechaFin = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - i + 1, 0);

      const conexiones = await Conexion.findAll({
        where: {
          createdAt: {
            [Op.gte]: fechaInicio,
            [Op.lte]: fechaFin
          }
        },
        include: [{ model: Plan, as: 'plan' }]
      });

      // Agrupar por plan
      const planesDelMes = {};
      conexiones.forEach(conexion => {
        const planNombre = conexion.plan.nombre;
        if (!planesDelMes[planNombre]) {
          planesDelMes[planNombre] = 0;
        }
        planesDelMes[planNombre]++;
      });

      resultados.push({
        mes: fechaInicio.toISOString().substring(0, 7), // YYYY-MM
        total_nuevas_conexiones: conexiones.length,
        planes: planesDelMes
      });
    }

    const resultado = {
      success: true,
      tipo: 'TENDENCIAS_PLANES',
      fecha_generacion: new Date(),
      parametros: { meses },
      data: resultados,
      resumen: {
        total_meses: resultados.length,
        conexiones_totales: resultados.reduce((sum, m) => sum + m.total_nuevas_conexiones, 0),
        promedio_mensual: Math.round(
          resultados.reduce((sum, m) => sum + m.total_nuevas_conexiones, 0) / resultados.length
        )
      }
    };

    return enviarReporteEnFormato(res, resultado, 'tendencias_planes', formato);
  } catch (error) {
    console.error('Error al generar reporte de tendencias:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const reporteAnalisisVelocidades = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, formato = 'json' } = req.query;

    let whereCondition = { estado: 'ACTIVA' };
    if (fecha_desde || fecha_hasta) {
      whereCondition.createdAt = {};
      if (fecha_desde) {
        whereCondition.createdAt[Op.gte] = new Date(fecha_desde);
      }
      if (fecha_hasta) {
        whereCondition.createdAt[Op.lte] = new Date(fecha_hasta);
      }
    }

    const conexiones = await Conexion.findAll({
      where: whereCondition,
      include: [{ model: Plan, as: 'plan' }]
    });

    // Agrupar por rangos de velocidad
    const rangos = {
      '0-20': { rango: '0-20 Mbps', cantidad: 0, porcentaje: 0 },
      '21-50': { rango: '21-50 Mbps', cantidad: 0, porcentaje: 0 },
      '51-100': { rango: '51-100 Mbps', cantidad: 0, porcentaje: 0 },
      '101-200': { rango: '101-200 Mbps', cantidad: 0, porcentaje: 0 },
      '201+': { rango: '201+ Mbps', cantidad: 0, porcentaje: 0 }
    };

    conexiones.forEach(conexion => {
      const velocidad = conexion.plan.velocidad_mbps;
      if (velocidad <= 20) rangos['0-20'].cantidad++;
      else if (velocidad <= 50) rangos['21-50'].cantidad++;
      else if (velocidad <= 100) rangos['51-100'].cantidad++;
      else if (velocidad <= 200) rangos['101-200'].cantidad++;
      else rangos['201+'].cantidad++;
    });

    // Calcular porcentajes
    const total = conexiones.length;
    Object.keys(rangos).forEach(key => {
      rangos[key].porcentaje = Math.round((rangos[key].cantidad / total) * 100);
    });

    // Calcular velocidad promedio
    const velocidadPromedio = conexiones.reduce((sum, c) =>
      sum + c.plan.velocidad_mbps, 0) / total;

    const resultado = {
      success: true,
      tipo: 'ANALISIS_VELOCIDADES',
      fecha_generacion: new Date(),
      parametros: { fecha_desde, fecha_hasta },
      data: Object.values(rangos),
      resumen: {
        total_conexiones: total,
        velocidad_promedio_mbps: Math.round(velocidadPromedio),
        velocidad_minima_mbps: Math.min(...conexiones.map(c => c.plan.velocidad_mbps)),
        velocidad_maxima_mbps: Math.max(...conexiones.map(c => c.plan.velocidad_mbps)),
        rango_mas_popular: Object.values(rangos).sort((a, b) => b.cantidad - a.cantidad)[0].rango
      }
    };

    return enviarReporteEnFormato(res, resultado, 'analisis_velocidades', formato);
  } catch (error) {
    console.error('Error al generar reporte de velocidades:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const obtenerTiposReporte = async (req, res) => {
  try {
    const tipos = [
      {
        id: 'ocupacion',
        nombre: 'Reporte de Ocupación por NAP',
        descripcion: 'Muestra el estado de ocupación de puertos por cada NAP',
        categoria: 'Infraestructura',
        parametros: ['fecha_desde', 'fecha_hasta'],
        formatos: ['json', 'pdf', 'excel']
      },
      {
        id: 'consumo',
        nombre: 'Reporte de Consumo por Cliente',
        descripcion: 'Detalle del consumo y conexiones por cliente',
        categoria: 'Clientes',
        parametros: ['fecha_desde', 'fecha_hasta', 'cliente_id'],
        formatos: ['json', 'pdf', 'excel']
      },
      {
        id: 'tecnico',
        nombre: 'Reporte de Estado Técnico',
        descripcion: 'Estado técnico y mantenimientos de los NAPs',
        categoria: 'Infraestructura',
        parametros: ['fecha_desde', 'fecha_hasta'],
        formatos: ['json', 'pdf', 'excel']
      },
      {
        id: 'planes-populares',
        nombre: 'Planes Más Populares',
        descripcion: 'Ranking de planes por cantidad de contrataciones e ingresos',
        categoria: 'Comercial',
        parametros: ['fecha_desde', 'fecha_hasta'],
        formatos: ['json', 'pdf', 'excel']
      },
      {
        id: 'tendencias-planes',
        nombre: 'Tendencias de Contratación',
        descripcion: 'Evolución de contrataciones por plan en los últimos meses',
        categoria: 'Comercial',
        parametros: ['meses'],
        formatos: ['json', 'pdf', 'excel']
      },
      {
        id: 'analisis-velocidades',
        nombre: 'Análisis de Velocidades',
        descripcion: 'Distribución de clientes por rangos de velocidad',
        categoria: 'Comercial',
        parametros: ['fecha_desde', 'fecha_hasta'],
        formatos: ['json', 'pdf', 'excel']
      }
    ];

    res.json({
      success: true,
      data: tipos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  reporteOcupacionNAPs,
  reporteConsumoPorCliente,
  reporteEstadoTecnico,
  reportePlanesPopulares,
  reporteTendenciasPlanes,
  reporteAnalisisVelocidades,
  obtenerTiposReporte
};