/**
 * Script para actualizar todos los reportes y agregar soporte de formatos
 * Este archivo contiene las funciones actualizadas que soportan PDF, Excel y JSON
 */

// Nota: Este archivo es solo documentación de los cambios necesarios
// Los cambios reales se deben hacer en reporteController.js

const cambiosNecesarios = `
Para cada función de reporte, hacer estos cambios:

1. Agregar 'formato = "json"' en el destructuring de req.query
   Ejemplo: const { fecha_desde, fecha_hasta, formato = 'json' } = req.query;

2. Cambiar la respuesta de res.json() a usar enviarReporteEnFormato()
   Ejemplo:
   // Antes:
   res.json({ success: true, tipo: 'TIPO', data, resumen });

   // Después:
   const resultado = { success: true, tipo: 'TIPO', fecha_generacion: new Date(), parametros, data, resumen };
   return enviarReporteEnFormato(res, resultado, 'nombre_reporte', formato);

Reportes a actualizar:
- reporteConsumoPorCliente ✅
- reporteEstadoTecnico
- reportePlanesPopulares
- reporteTendenciasPlanes
- reporteAnalisisVelocidades
`;

module.exports = { cambiosNecesarios };
