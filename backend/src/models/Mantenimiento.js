const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Mantenimiento = sequelize.define('Mantenimiento', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  nap_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'naps',
      key: 'id'
    }
  },
  tipo: {
    type: DataTypes.ENUM('PREVENTIVO', 'CORRECTIVO'),
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  fecha: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  realizado_por: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  }
}, {
  tableName: 'mantenimientos'
});

module.exports = Mantenimiento;