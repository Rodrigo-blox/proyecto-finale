const { NAP, Puerto, Cliente, Conexion, Plan, Mantenimiento, Usuario } = require('../models');
const { Op } = require('sequelize');
const PDFGenerator = require('../utils/pdfGenerator');
const ExcelGenerator = require('../utils/excelGenerator');

// fecha_hasta como string YYYY-MM-DD llega como medianoche UTC → ajustar al final del día
const finDelDia = (fechaStr) => {
  const d = new Date(fechaStr);
  d.setHours(23, 59, 59, 999);
  return d;
};

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
    return res.status(500).json({ success: false, message: `Error al generar el reporte en formato ${formato}` });
  }
};

// ─── Reporte 1: Ocupación por NAP ────────────────────────────────────────────
const reporteOcupacionNAPs = async (req, res) => {
  try {
    const { formato = 'json' } = req.query;

    const naps = await NAP.findAll({
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
      const porcentajeOcupacion = nap.total_puertos > 0
        ? Math.round((puertosOcupados / nap.total_puertos) * 100)
        : 0;

      return {
        nap: { id: nap.id, codigo: nap.codigo, modelo: nap.modelo, ubicacion: nap.ubicacion, estado: nap.estado, fecha_instalacion: nap.createdAt },
        estadisticas: { total_puertos: nap.total_puertos, puertos_libres: puertosLibres, puertos_ocupados: puertosOcupados, puertos_mantenimiento: puertosMantenimiento, porcentaje_ocupacion: porcentajeOcupacion },
        conexiones_activas: nap.puertos
          .filter(p => p.conexion)
          .map(p => ({ puerto: p.numero, cliente: p.conexion.cliente?.nombre || 'N/A', ci: p.conexion.cliente?.ci || 'N/A', plan: p.conexion.plan?.nombre || 'N/A', velocidad: p.conexion.plan?.velocidad_mbps || 0 }))
      };
    });

    const resultado = {
      success: true, tipo: 'OCUPACION_NAPS', fecha_generacion: new Date(),
      parametros: {},
      data: reporte,
      resumen: {
        total_naps: reporte.length,
        total_puertos: reporte.reduce((s, n) => s + n.estadisticas.total_puertos, 0),
        total_ocupados: reporte.reduce((s, n) => s + n.estadisticas.puertos_ocupados, 0),
        promedio_ocupacion: reporte.length > 0
          ? Math.round(reporte.reduce((s, n) => s + n.estadisticas.porcentaje_ocupacion, 0) / reporte.length)
          : 0
      }
    };

    return enviarReporteEnFormato(res, resultado, 'ocupacion_naps', formato);
  } catch (error) {
    console.error('Error en reporteOcupacionNAPs:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// ─── Reporte 2: Consumo por cliente ──────────────────────────────────────────
const reporteConsumoPorCliente = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, cliente_id, formato = 'json' } = req.query;

    let whereCondition = {};
    if (cliente_id) whereCondition.cliente_id = cliente_id;
    if (fecha_desde || fecha_hasta) {
      whereCondition.createdAt = {};
      if (fecha_desde) whereCondition.createdAt[Op.gte] = new Date(fecha_desde);
      if (fecha_hasta) whereCondition.createdAt[Op.lte] = finDelDia(fecha_hasta);
    }

    const conexiones = await Conexion.findAll({
      where: whereCondition,
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Plan, as: 'plan' },
        { model: Puerto, as: 'puerto', include: [{ model: NAP, as: 'nap' }] }
      ],
      order: [['cliente', 'nombre'], ['createdAt', 'DESC']]
    });

    const clientesMap = new Map();
    conexiones.forEach(conexion => {
      const clienteId = conexion.cliente.id;
      if (!clientesMap.has(clienteId)) {
        clientesMap.set(clienteId, {
          cliente: { id: conexion.cliente.id, nombre: conexion.cliente.nombre, ci: conexion.cliente.ci, telefono: conexion.cliente.telefono, correo: conexion.cliente.correo },
          conexiones: [],
          resumen: { total_conexiones: 0, conexiones_activas: 0, conexiones_finalizadas: 0, planes_utilizados: new Set() }
        });
      }

      const c = clientesMap.get(clienteId);
      c.conexiones.push({
        id: conexion.id,
        plan: conexion.plan.nombre,
        velocidad_mbps: conexion.plan.velocidad_mbps,
        nap: conexion.puerto.nap.codigo,
        puerto: conexion.puerto.numero,
        fecha_inicio: conexion.fecha_inicio,
        fecha_fin: conexion.fecha_fin,
        estado: conexion.estado,
        dias_activo: conexion.fecha_fin
          ? Math.ceil((new Date(conexion.fecha_fin) - new Date(conexion.fecha_inicio)) / 86400000)
          : Math.ceil((new Date() - new Date(conexion.fecha_inicio)) / 86400000)
      });

      c.resumen.total_conexiones++;
      if (conexion.estado === 'ACTIVA') c.resumen.conexiones_activas++;
      if (conexion.estado === 'FINALIZADA') c.resumen.conexiones_finalizadas++;
      c.resumen.planes_utilizados.add(conexion.plan.nombre);
    });

    const reporte = Array.from(clientesMap.values()).map(c => ({
      ...c, resumen: { ...c.resumen, planes_utilizados: Array.from(c.resumen.planes_utilizados) }
    }));

    const resultado = {
      success: true, tipo: 'CONSUMO_POR_CLIENTE', fecha_generacion: new Date(),
      parametros: { fecha_desde, fecha_hasta, cliente_id },
      data: reporte,
      resumen: {
        total_clientes: reporte.length,
        total_conexiones: reporte.reduce((s, c) => s + c.resumen.total_conexiones, 0),
        conexiones_activas: reporte.reduce((s, c) => s + c.resumen.conexiones_activas, 0)
      }
    };

    return enviarReporteEnFormato(res, resultado, 'consumo_cliente', formato);
  } catch (error) {
    console.error('Error en reporteConsumoPorCliente:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// ─── Reporte 3: Estado técnico ────────────────────────────────────────────────
const reporteEstadoTecnico = async (req, res) => {
  try {
    const { formato = 'json' } = req.query;

    const naps = await NAP.findAll({
      include: [
        {
          model: Puerto, as: 'puertos',
          include: [{ model: Conexion, as: 'conexion', required: false, where: { estado: 'ACTIVA' } }]
        },
        {
          model: Mantenimiento, as: 'mantenimientos',
          include: [{ model: Usuario, as: 'tecnico', attributes: ['nombre'] }],
          limit: 5, order: [['fecha', 'DESC']]
        }
      ]
    });

    const reporte = naps.map(nap => {
      const puertosOcupados = nap.puertos.filter(p => p.estado === 'OCUPADO').length;
      const porcentaje = nap.total_puertos > 0 ? Math.round((puertosOcupados / nap.total_puertos) * 100) : 0;
      let estadoTecnico = 'BUENO';
      if (nap.estado === 'MANTENIMIENTO') estadoTecnico = 'MANTENIMIENTO';
      else if (nap.estado === 'SATURADO' || porcentaje >= 90) estadoTecnico = 'CRITICO';
      else if (porcentaje >= 75) estadoTecnico = 'ADVERTENCIA';

      const ultimo = nap.mantenimientos[0];
      return {
        nap: { id: nap.id, codigo: nap.codigo, modelo: nap.modelo, firmware: nap.firmware, ubicacion: nap.ubicacion, estado: nap.estado },
        estado_tecnico: estadoTecnico,
        ocupacion: { porcentaje, puertos_ocupados: puertosOcupados, total_puertos: nap.total_puertos },
        mantenimiento: {
          ultimo_mantenimiento: ultimo ? { fecha: ultimo.fecha, tipo: ultimo.tipo, tecnico: ultimo.tecnico?.nombre } : null,
          total_mantenimientos: nap.mantenimientos.length,
          mantenimientos_correctivos: nap.mantenimientos.filter(m => m.tipo === 'CORRECTIVO').length,
          dias_desde_ultimo: ultimo ? Math.ceil((new Date() - new Date(ultimo.fecha)) / 86400000) : null
        }
      };
    });

    const resultado = {
      success: true, tipo: 'ESTADO_TECNICO', fecha_generacion: new Date(),
      parametros: {},
      data: reporte,
      resumen: {
        total_naps: reporte.length,
        buenos: reporte.filter(n => n.estado_tecnico === 'BUENO').length,
        advertencia: reporte.filter(n => n.estado_tecnico === 'ADVERTENCIA').length,
        criticos: reporte.filter(n => n.estado_tecnico === 'CRITICO').length,
        mantenimiento: reporte.filter(n => n.estado_tecnico === 'MANTENIMIENTO').length
      }
    };

    return enviarReporteEnFormato(res, resultado, 'estado_tecnico', formato);
  } catch (error) {
    console.error('Error en reporteEstadoTecnico:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// ─── Reporte 4: Caídas e interrupciones ──────────────────────────────────────
const reporteCaidasInterrupciones = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, formato = 'json' } = req.query;

    let whereCondition = { tipo: 'CORRECTIVO' };
    if (fecha_desde || fecha_hasta) {
      whereCondition.fecha = {};
      if (fecha_desde) whereCondition.fecha[Op.gte] = new Date(fecha_desde);
      if (fecha_hasta) whereCondition.fecha[Op.lte] = finDelDia(fecha_hasta);
    }

    const mantenimientos = await Mantenimiento.findAll({
      where: whereCondition,
      include: [
        {
          model: NAP, as: 'nap',
          include: [{
            model: Puerto, as: 'puertos',
            where: { estado: 'OCUPADO' },
            required: false
          }]
        },
        { model: Usuario, as: 'tecnico', attributes: ['nombre'] }
      ],
      order: [['fecha', 'DESC']]
    });

    const reporte = mantenimientos.map(m => ({
      id: m.id,
      fecha: m.fecha,
      nap_codigo: m.nap.codigo,
      nap_modelo: m.nap.modelo,
      nap_ubicacion: m.nap.ubicacion,
      nap_estado_actual: m.nap.estado,
      causa: m.descripcion,
      usuarios_afectados: m.nap.puertos ? m.nap.puertos.length : 0,
      tecnico_responsable: m.tecnico?.nombre || 'N/A'
    }));

    const napsUnicas = new Set(reporte.map(r => r.nap_codigo)).size;

    const resultado = {
      success: true, tipo: 'CAIDAS_INTERRUPCIONES', fecha_generacion: new Date(),
      parametros: { fecha_desde, fecha_hasta },
      data: reporte,
      resumen: {
        total_incidentes: reporte.length,
        naps_afectadas: napsUnicas,
        total_usuarios_afectados: reporte.reduce((s, r) => s + r.usuarios_afectados, 0),
        promedio_usuarios_por_incidente: reporte.length > 0
          ? Math.round(reporte.reduce((s, r) => s + r.usuarios_afectados, 0) / reporte.length)
          : 0
      }
    };

    return enviarReporteEnFormato(res, resultado, 'caidas_interrupciones', formato);
  } catch (error) {
    console.error('Error en reporteCaidasInterrupciones:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// ─── Reporte 5: Disponibilidad de servicio ────────────────────────────────────
const reporteDisponibilidadServicio = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, formato = 'json' } = req.query;

    const fechaInicio = fecha_desde ? new Date(fecha_desde) : new Date(Date.now() - 30 * 86400000);
    const fechaFin = fecha_hasta ? finDelDia(fecha_hasta) : new Date();
    const diasPeriodo = Math.max(1, Math.ceil((fechaFin - fechaInicio) / 86400000));

    let mantWhere = { tipo: 'CORRECTIVO', fecha: { [Op.gte]: fechaInicio, [Op.lte]: fechaFin } };

    const naps = await NAP.findAll({
      include: [
        {
          model: Mantenimiento, as: 'mantenimientos',
          where: mantWhere, required: false,
          include: [{ model: Usuario, as: 'tecnico', attributes: ['nombre'] }]
        },
        {
          model: Puerto, as: 'puertos',
          where: { estado: 'OCUPADO' }, required: false
        }
      ],
      order: [['codigo', 'ASC']]
    });

    const reporte = naps.map(nap => {
      const incidentes = nap.mantenimientos.length;
      // Estimación conservadora: 4 horas de interrupción por incidente correctivo
      const horasEstimFuera = incidentes * 4;
      const horasPeriodo = diasPeriodo * 24;
      const disponibilidad = Math.max(0, Math.round(((horasPeriodo - horasEstimFuera) / horasPeriodo) * 1000) / 10);

      const ultimo = nap.mantenimientos
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];

      return {
        nap_codigo: nap.codigo,
        nap_modelo: nap.modelo,
        nap_ubicacion: nap.ubicacion,
        estado_actual: nap.estado,
        disponibilidad_porcentaje: disponibilidad,
        incidentes_en_periodo: incidentes,
        horas_estimadas_fuera: horasEstimFuera,
        clientes_activos: nap.puertos ? nap.puertos.length : 0,
        ultimo_incidente: ultimo ? ultimo.fecha : null
      };
    });

    const resultado = {
      success: true, tipo: 'DISPONIBILIDAD_SERVICIO', fecha_generacion: new Date(),
      parametros: { fecha_desde: fechaInicio.toISOString().slice(0, 10), fecha_hasta: fechaFin.toISOString().slice(0, 10) },
      data: reporte,
      resumen: {
        total_naps: reporte.length,
        disponibilidad_promedio_pct: reporte.length > 0
          ? Math.round(reporte.reduce((s, n) => s + n.disponibilidad_porcentaje, 0) / reporte.length * 10) / 10
          : 100,
        naps_sin_incidentes: reporte.filter(n => n.incidentes_en_periodo === 0).length,
        total_incidentes: reporte.reduce((s, n) => s + n.incidentes_en_periodo, 0),
        dias_periodo: diasPeriodo
      }
    };

    return enviarReporteEnFormato(res, resultado, 'disponibilidad_servicio', formato);
  } catch (error) {
    console.error('Error en reporteDisponibilidadServicio:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// ─── Reporte 6: Altas y bajas de servicio ─────────────────────────────────────
const reporteAltasYBajas = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, formato = 'json' } = req.query;

    const fechaInicioStr = fecha_desde || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const fechaFinStr = fecha_hasta || new Date().toISOString().slice(0, 10);
    const fechaInicio = new Date(fechaInicioStr);
    const fechaFin = finDelDia(fechaFinStr);

    const altas = await Conexion.findAll({
      where: { fecha_inicio: { [Op.gte]: fechaInicioStr, [Op.lte]: fechaFinStr } },
      include: [
        { model: Cliente, as: 'cliente', attributes: ['nombre', 'apellido', 'ci', 'telefono'] },
        { model: Plan, as: 'plan', attributes: ['nombre', 'velocidad_mbps'] },
        { model: Puerto, as: 'puerto', include: [{ model: NAP, as: 'nap', attributes: ['codigo', 'ubicacion'] }] }
      ],
      order: [['fecha_inicio', 'DESC']]
    });

    const bajas = await Conexion.findAll({
      where: {
        estado: 'FINALIZADA',
        [Op.or]: [
          { fecha_fin: { [Op.gte]: fechaInicioStr, [Op.lte]: fechaFinStr } },
          { updatedAt: { [Op.gte]: fechaInicio, [Op.lte]: fechaFin } }
        ]
      },
      include: [
        { model: Cliente, as: 'cliente', attributes: ['nombre', 'apellido', 'ci', 'telefono'] },
        { model: Plan, as: 'plan', attributes: ['nombre', 'velocidad_mbps'] }
      ],
      order: [['fecha_fin', 'DESC']]
    });

    const data = [
      ...altas.map(c => ({
        movimiento: 'ALTA',
        fecha: c.fecha_inicio,
        cliente: [c.cliente?.nombre, c.cliente?.apellido].filter(Boolean).join(' ') || 'N/A',
        ci: c.cliente?.ci || 'N/A',
        telefono: c.cliente?.telefono || 'N/A',
        plan: c.plan?.nombre || 'N/A',
        velocidad_mbps: c.plan?.velocidad_mbps || 0,
        nap: c.puerto?.nap?.codigo || 'N/A',
        ubicacion: c.puerto?.nap?.ubicacion || 'N/A',
        estado_conexion: c.estado
      })),
      ...bajas.map(c => ({
        movimiento: 'BAJA',
        fecha: c.fecha_fin || c.updatedAt,
        cliente: [c.cliente?.nombre, c.cliente?.apellido].filter(Boolean).join(' ') || 'N/A',
        ci: c.cliente?.ci || 'N/A',
        telefono: c.cliente?.telefono || 'N/A',
        plan: c.plan?.nombre || 'N/A',
        velocidad_mbps: c.plan?.velocidad_mbps || 0,
        nap: 'N/A',
        ubicacion: 'N/A',
        estado_conexion: c.estado
      }))
    ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const resultado = {
      success: true, tipo: 'ALTAS_BAJAS', fecha_generacion: new Date(),
      parametros: { fecha_desde: fechaInicioStr, fecha_hasta: fechaFinStr },
      data,
      resumen: {
        total_altas: altas.length,
        total_bajas: bajas.length,
        movimiento_neto: altas.length - bajas.length,
        periodo_dias: Math.ceil((fechaFin - fechaInicio) / 86400000)
      }
    };

    return enviarReporteEnFormato(res, resultado, 'altas_bajas', formato);
  } catch (error) {
    console.error('Error en reporteAltasYBajas:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// ─── Reporte 7: Reporte de clientes ──────────────────────────────────────────
const reporteClientes = async (req, res) => {
  try {
    const { formato = 'json' } = req.query;

    const clientes = await Cliente.findAll({
      include: [{
        model: Conexion, as: 'conexiones',
        include: [
          { model: Plan, as: 'plan', attributes: ['nombre', 'velocidad_mbps'] },
          { model: Puerto, as: 'puerto', include: [{ model: NAP, as: 'nap', attributes: ['codigo', 'ubicacion'] }] }
        ]
      }],
      order: [['nombre', 'ASC']]
    });

    const reporte = clientes.map(c => {
      const activa = c.conexiones.find(x => x.estado === 'ACTIVA');
      const suspendida = c.conexiones.find(x => x.estado === 'SUSPENDIDA');
      const estadoServicio = activa ? 'ACTIVO' : suspendida ? 'SUSPENDIDO' : (c.conexiones.length > 0 ? 'INACTIVO' : 'SIN_SERVICIO');

      return {
        nombre: [c.nombre, c.apellido].filter(Boolean).join(' '),
        ci: c.ci,
        telefono: c.telefono || 'N/A',
        correo: c.correo || 'N/A',
        direccion: c.direccion || 'N/A',
        estado_servicio: estadoServicio,
        plan_actual: activa?.plan?.nombre || suspendida?.plan?.nombre || 'N/A',
        velocidad_mbps: activa?.plan?.velocidad_mbps || suspendida?.plan?.velocidad_mbps || 0,
        nap: activa?.puerto?.nap?.codigo || suspendida?.puerto?.nap?.codigo || 'N/A',
        ubicacion_nap: activa?.puerto?.nap?.ubicacion || 'N/A',
        fecha_alta_servicio: activa?.fecha_inicio || null,
        total_conexiones_historicas: c.conexiones.length
      };
    });

    const resultado = {
      success: true, tipo: 'CLIENTES_ESTADO', fecha_generacion: new Date(),
      parametros: {},
      data: reporte,
      resumen: {
        total_clientes: reporte.length,
        clientes_activos: reporte.filter(c => c.estado_servicio === 'ACTIVO').length,
        clientes_suspendidos: reporte.filter(c => c.estado_servicio === 'SUSPENDIDO').length,
        clientes_inactivos: reporte.filter(c => c.estado_servicio === 'INACTIVO').length,
        sin_servicio: reporte.filter(c => c.estado_servicio === 'SIN_SERVICIO').length
      }
    };

    return enviarReporteEnFormato(res, resultado, 'clientes_estado', formato);
  } catch (error) {
    console.error('Error en reporteClientes:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// ─── Tipos disponibles ────────────────────────────────────────────────────────
const obtenerTiposReporte = async (req, res) => {
  try {
    const tipos = [
      {
        id: 'ocupacion',
        nombre: 'Ocupación por NAP',
        descripcion: 'Estado actual de ocupación de puertos por cada NAP y conexiones activas',
        categoria: 'Infraestructura',
        parametros: [],
        formatos: ['json', 'pdf', 'excel']
      },
      {
        id: 'tecnico',
        nombre: 'Estado Técnico de NAPs',
        descripcion: 'Estado técnico actual, ocupación y últimos mantenimientos de cada NAP',
        categoria: 'Infraestructura',
        parametros: [],
        formatos: ['json', 'pdf', 'excel']
      },
      {
        id: 'caidas-interrupciones',
        nombre: 'Caídas e Interrupciones',
        descripcion: 'Registro de fallas correctivas: fecha, NAP afectada, causa y usuarios impactados',
        categoria: 'Infraestructura',
        parametros: ['fecha_desde', 'fecha_hasta'],
        formatos: ['json', 'pdf', 'excel']
      },
      {
        id: 'disponibilidad',
        nombre: 'Disponibilidad de Servicio',
        descripcion: 'Porcentaje de disponibilidad por NAP estimado a partir de incidentes correctivos',
        categoria: 'Infraestructura',
        parametros: ['fecha_desde', 'fecha_hasta'],
        formatos: ['json', 'pdf', 'excel']
      },
      {
        id: 'consumo',
        nombre: 'Consumo por Cliente',
        descripcion: 'Detalle del historial de conexiones y planes utilizados por cliente',
        categoria: 'Clientes',
        parametros: ['fecha_desde', 'fecha_hasta', 'cliente_id'],
        formatos: ['json', 'pdf', 'excel']
      },
      {
        id: 'altas-bajas',
        nombre: 'Altas y Bajas de Servicio',
        descripcion: 'Movimiento de clientes en el periodo: nuevas contrataciones y cancelaciones',
        categoria: 'Clientes',
        parametros: ['fecha_desde', 'fecha_hasta'],
        formatos: ['json', 'pdf', 'excel']
      },
      {
        id: 'clientes',
        nombre: 'Reporte de Clientes',
        descripcion: 'Lista completa de clientes con su estado de servicio, plan y NAP asignada',
        categoria: 'Clientes',
        parametros: [],
        formatos: ['json', 'pdf', 'excel']
      }
    ];

    res.json({ success: true, data: tipos });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

module.exports = {
  reporteOcupacionNAPs,
  reporteConsumoPorCliente,
  reporteEstadoTecnico,
  reporteCaidasInterrupciones,
  reporteDisponibilidadServicio,
  reporteAltasYBajas,
  reporteClientes,
  obtenerTiposReporte
};
