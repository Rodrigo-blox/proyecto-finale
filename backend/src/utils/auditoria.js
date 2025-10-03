const Auditoria = require('../models/Auditoria');

/**
 * Registra una acción en la tabla de auditoría del sistema
 * 
 * @async
 * @function registrarAuditoria
 * @param {string} tabla - Nombre de la tabla auditada
 * @param {string|number} registroId - ID del registro afectado
 * @param {string} accion - Tipo de acción: 'CREATE', 'UPDATE', 'DELETE'
 * @param {Object|null} datosAnteriores - Datos antes del cambio (para UPDATE/DELETE)
 * @param {Object|null} datosNuevos - Datos después del cambio (para CREATE/UPDATE)
 * @param {string|number} cambiadoPor - ID del usuario que realizó el cambio
 * 
 * @returns {Promise<void>} No retorna valor, registra silenciosamente
 * 
 * @example
 * // Registrar creación de NAP:
 * await registrarAuditoria(
 *   'naps',
 *   nap.id,
 *   'CREATE',
 *   null,
 *   nap.toJSON(),
 *   req.usuario.id
 * );
 * 
 * // Registrar actualización:
 * await registrarAuditoria(
 *   'clientes',
 *   cliente.id,
 *   'UPDATE',
 *   { nombre: 'Nombre Viejo' },
 *   { nombre: 'Nombre Nuevo' },
 *   req.usuario.id
 * );
 * 
 * @description
 * - Registra todas las operaciones críticas del sistema
 * - Serializa objetos complejos como JSON
 * - No lanza errores para no afectar operaciones principales
 * - Omite registro si no hay usuario (operaciones del sistema)
 * - Esencial para compliance y debugging
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
 * Configura hooks automáticos de auditoría para un modelo de Sequelize
 * 
 * @function configurarAuditoriaParaModelo
 * @param {Object} modelo - Modelo de Sequelize al cual agregar hooks
 * @param {string} nombreTabla - Nombre de la tabla para identificación en auditoría
 * 
 * @returns {void} Configura hooks directamente en el modelo
 * 
 * @example
 * // Configurar auditoría para modelo NAP:
 * const NAP = require('./NAP');
 * configurarAuditoriaParaModelo(NAP, 'naps');
 * 
 * // Ahora todas las operaciones en NAP serán auditadas automáticamente
 * 
 * @description
 * - Agrega hooks afterCreate, afterUpdate, afterDestroy
 * - Captura automáticamente userId de options o transaction
 * - Detecta cambios específicos en actualizaciones
 * - Solo audita operaciones con usuario identificado
 * - Configuración one-time por modelo
 * - Logging detallado para debugging
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
 * Extrae el ID del usuario desde el objeto request de Express
 * 
 * @function obtenerUsuarioDeRequest
 * @param {Object} req - Objeto request de Express
 * @param {Object} [req.usuario] - Usuario autenticado (del middleware auth)
 * @param {string|number} [req.usuario.id] - ID del usuario autenticado
 * 
 * @returns {string|number|null} ID del usuario o null si no está autenticado
 * 
 * @example
 * // En un middleware personalizado:
 * const usuarioId = obtenerUsuarioDeRequest(req);
 * if (usuarioId) {
 *   await registrarAuditoria('operacion_especial', recordId, 'CUSTOM', null, data, usuarioId);
 * }
 * 
 * @description
 * - Útil para extraer ID de usuario en middleware personalizado
 * - Compatible con el middleware de autenticación del sistema
 * - Retorna null si no hay usuario autenticado
 * - Simplifica el acceso al contexto de usuario
 */

function obtenerUsuarioDeRequest(req) {
  return req.usuario?.id || null;
}

module.exports = {
  registrarAuditoria,
  configurarAuditoriaParaModelo,
  obtenerUsuarioDeRequest
};
