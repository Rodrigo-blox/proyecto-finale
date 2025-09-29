const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Auditoria = sequelize.define('Auditoria', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  tabla: {
    type: DataTypes.STRING,
    allowNull: false
  },
  registro_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  accion: {
    type: DataTypes.ENUM('CREATE', 'UPDATE', 'DELETE'),
    allowNull: false
  },
  datos_anteriores: {
    type: DataTypes.TEXT
  },
  datos_nuevos: {
    type: DataTypes.TEXT
  },
  cambiado_por: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  fecha: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'auditoria',
  timestamps: false
});

module.exports = Auditoria;