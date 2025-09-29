const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Puerto = sequelize.define('Puerto', {
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
  numero: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  estado: {
    type: DataTypes.ENUM('LIBRE', 'OCUPADO', 'MANTENIMIENTO'),
    allowNull: false,
    defaultValue: 'LIBRE'
  },
  nota: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'puertos',
  indexes: [
    {
      unique: true,
      fields: ['nap_id', 'numero']
    }
  ]
});

module.exports = Puerto;