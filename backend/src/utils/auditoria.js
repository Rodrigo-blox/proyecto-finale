const Auditoria = require('../models/Auditoria');

/**
 * Registra una acción en la tabla de auditoría
 * @param {string} tabla - Nombre de la tabla auditada
 * @param {string} registroId - ID del registro afectado
 * @param {string} accion - Tipo de acción: CREATE, UPDATE, DELETE
 * @param {object} datosAnteriores - Datos antes del cambio (para UPDATE/DELETE)
 * @param {object} datosNuevos - Datos después del cambio (para CREATE/UPDATE)
 * @param {string} cambiadoPor - ID del usuario que realizó el cambio
 */
async function registrarAuditoria(tabla, registroId, accion, datosAnteriores, datosNuevos, cambiadoPor) {
  try {
    // No auditar si no hay usuario (operaciones del sistema)
    if (!cambiadoPor) {
      return;
    }

    await Auditoria.create({
      tabla,
      registro_id: registroId,
      accion,
      datos_anteriores: datosAnteriores ? JSON.stringify(datosAnteriores) : null,
      datos_nuevos: datosNuevos ? JSON.stringify(datosNuevos) : null,
      cambiado_por: cambiadoPor,
      fecha: new Date()
    });
  } catch (error) {
    console.error('Error al registrar auditoría:', error);
    // No lanzar error para no afectar la operación principal
  }
}

/**
 * Configura hooks de auditoría para un modelo de Sequelize
 * @param {Model} modelo - Modelo de Sequelize
 * @param {string} nombreTabla - Nombre de la tabla para auditoría
 */
function configurarAuditoriaParaModelo(modelo, nombreTabla) {
  // Hook después de crear
  modelo.addHook('afterCreate', async (instancia, options) => {
    const usuarioId = options.userId || options.transaction?.userId;
    console.log(`[AUDITORIA] CREATE en ${nombreTabla}, userId:`, usuarioId);
    if (usuarioId) {
      await registrarAuditoria(
        nombreTabla,
        instancia.id,
        'CREATE',
        null,
        instancia.toJSON(),
        usuarioId
      );
    }
  });

  // Hook después de actualizar
  modelo.addHook('afterUpdate', async (instancia, options) => {
    const usuarioId = options.userId || options.transaction?.userId;
    console.log(`[AUDITORIA] UPDATE en ${nombreTabla}, userId:`, usuarioId);
    if (usuarioId) {
      // Obtener solo los campos que cambiaron
      const cambios = {};
      const datosAnteriores = {};

      instancia._changed.forEach(campo => {
        cambios[campo] = instancia.get(campo);
        datosAnteriores[campo] = instancia._previousDataValues[campo];
      });

      console.log(`[AUDITORIA] Cambios detectados:`, cambios);
      if (Object.keys(cambios).length > 0) {
        await registrarAuditoria(
          nombreTabla,
          instancia.id,
          'UPDATE',
          datosAnteriores,
          cambios,
          usuarioId
        );
      }
    }
  });

  // Hook después de eliminar
  modelo.addHook('afterDestroy', async (instancia, options) => {
    const usuarioId = options.userId || options.transaction?.userId;
    if (usuarioId) {
      await registrarAuditoria(
        nombreTabla,
        instancia.id,
        'DELETE',
        instancia.toJSON(),
        null,
        usuarioId
      );
    }
  });
}

/**
 * Obtiene el contexto de usuario desde la solicitud
 * Útil para middleware
 */
function obtenerUsuarioDeRequest(req) {
  return req.usuario?.id || null;
}

module.exports = {
  registrarAuditoria,
  configurarAuditoriaParaModelo,
  obtenerUsuarioDeRequest
};
