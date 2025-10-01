const sequelize = require('../config/database');

const Usuario = require('./Usuario');
const NAP = require('./NAP');
const Puerto = require('./Puerto');
const Cliente = require('./Cliente');
const Plan = require('./Plan');
const Conexion = require('./Conexion');
const Mantenimiento = require('./Mantenimiento');
const Auditoria = require('./Auditoria');

NAP.hasMany(Puerto, { foreignKey: 'nap_id', as: 'puertos' });
Puerto.belongsTo(NAP, { foreignKey: 'nap_id', as: 'nap' });

Puerto.hasOne(Conexion, { foreignKey: 'puerto_id', as: 'conexion' });
Conexion.belongsTo(Puerto, { foreignKey: 'puerto_id', as: 'puerto' });

Cliente.hasMany(Conexion, { foreignKey: 'cliente_id', as: 'conexiones' });
Conexion.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

Plan.hasMany(Conexion, { foreignKey: 'plan_id', as: 'conexiones' });
Conexion.belongsTo(Plan, { foreignKey: 'plan_id', as: 'plan' });

Usuario.hasMany(Conexion, { foreignKey: 'creado_por', as: 'conexiones_creadas' });
Conexion.belongsTo(Usuario, { foreignKey: 'creado_por', as: 'creador' });

NAP.hasMany(Mantenimiento, { foreignKey: 'nap_id', as: 'mantenimientos' });
Mantenimiento.belongsTo(NAP, { foreignKey: 'nap_id', as: 'nap' });

Usuario.hasMany(Mantenimiento, { foreignKey: 'realizado_por', as: 'mantenimientos_realizados' });
Mantenimiento.belongsTo(Usuario, { foreignKey: 'realizado_por', as: 'tecnico' });

Usuario.hasMany(Auditoria, { foreignKey: 'cambiado_por', as: 'auditorias' });
Auditoria.belongsTo(Usuario, { foreignKey: 'cambiado_por', as: 'usuario' });

// Configurar hooks de auditoría
const { configurarAuditoriaParaModelo } = require('../utils/auditoria');

// Auditar modelos importantes
configurarAuditoriaParaModelo(NAP, 'naps');
configurarAuditoriaParaModelo(Puerto, 'puertos');
configurarAuditoriaParaModelo(Cliente, 'clientes');
configurarAuditoriaParaModelo(Plan, 'planes');
configurarAuditoriaParaModelo(Conexion, 'conexiones');
configurarAuditoriaParaModelo(Usuario, 'usuarios');
configurarAuditoriaParaModelo(Mantenimiento, 'mantenimientos');

module.exports = {
  sequelize,
  Usuario,
  NAP,
  Puerto,
  Cliente,
  Plan,
  Conexion,
  Mantenimiento,
  Auditoria
};