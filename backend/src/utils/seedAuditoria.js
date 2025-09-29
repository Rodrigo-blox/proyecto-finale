const { Auditoria } = require('../models');

const crearDatosPruebaAuditoria = async () => {
  try {
    // Verificar si ya hay datos
    const count = await Auditoria.count();
    if (count > 0) {
      console.log('Ya existen datos de auditoría');
      return;
    }

    // Crear datos de prueba
    const datosPrueba = [
      {
        tabla: 'naps',
        registro_id: '550e8400-e29b-41d4-a716-446655440000',
        accion: 'CREATE',
        datos_anteriores: null,
        datos_nuevos: JSON.stringify({
          codigo: 'NAP001',
          modelo: 'Huawei MA5608T',
          estado: 'ACTIVO',
          ubicacion: 'Zona Centro'
        }),
        cambiado_por: '550e8400-e29b-41d4-a716-446655440001',
        fecha: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Hace 7 días
      },
      {
        tabla: 'clientes',
        registro_id: '550e8400-e29b-41d4-a716-446655440002',
        accion: 'CREATE',
        datos_anteriores: null,
        datos_nuevos: JSON.stringify({
          ci: '12345678',
          nombre: 'Juan Pérez',
          telefono: '70123456',
          correo: 'juan@email.com'
        }),
        cambiado_por: '550e8400-e29b-41d4-a716-446655440001',
        fecha: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // Hace 5 días
      },
      {
        tabla: 'naps',
        registro_id: '550e8400-e29b-41d4-a716-446655440000',
        accion: 'UPDATE',
        datos_anteriores: JSON.stringify({
          estado: 'ACTIVO',
          ubicacion: 'Zona Centro'
        }),
        datos_nuevos: JSON.stringify({
          estado: 'MANTENIMIENTO',
          ubicacion: 'Zona Centro'
        }),
        cambiado_por: '550e8400-e29b-41d4-a716-446655440001',
        fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // Hace 2 días
      },
      {
        tabla: 'conexiones',
        registro_id: '550e8400-e29b-41d4-a716-446655440003',
        accion: 'CREATE',
        datos_anteriores: null,
        datos_nuevos: JSON.stringify({
          cliente_id: '550e8400-e29b-41d4-a716-446655440002',
          puerto_id: '550e8400-e29b-41d4-a716-446655440004',
          plan_id: '550e8400-e29b-41d4-a716-446655440005',
          estado: 'ACTIVA'
        }),
        cambiado_por: '550e8400-e29b-41d4-a716-446655440001',
        fecha: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // Hace 1 día
      },
      {
        tabla: 'usuarios',
        registro_id: '550e8400-e29b-41d4-a716-446655440006',
        accion: 'UPDATE',
        datos_anteriores: JSON.stringify({
          nombre: 'María García',
          activo: true
        }),
        datos_nuevos: JSON.stringify({
          nombre: 'María García López',
          activo: true
        }),
        cambiado_por: '550e8400-e29b-41d4-a716-446655440001',
        fecha: new Date(Date.now() - 12 * 60 * 60 * 1000) // Hace 12 horas
      }
    ];

    await Auditoria.bulkCreate(datosPrueba);
    console.log('✅ Datos de prueba de auditoría creados exitosamente');

  } catch (error) {
    console.error('❌ Error al crear datos de prueba de auditoría:', error);
  }
};

module.exports = { crearDatosPruebaAuditoria };