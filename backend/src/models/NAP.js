const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NAP = sequelize.define('NAP', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  codigo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  modelo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  firmware: {
    type: DataTypes.STRING
  },
  estado: {
    type: DataTypes.ENUM('ACTIVO', 'MANTENIMIENTO', 'SATURADO'),
    allowNull: false,
    defaultValue: 'ACTIVO'
  },
  total_puertos: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 1000
    }
  },
  ubicacion: {
    type: DataTypes.STRING,
    allowNull: false
  },
  latitud: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
    validate: {
      min: -90,
      max: 90
    }
  },
  longitud: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false,
    validate: {
      min: -180,
      max: 180
    }
  }
}, {
  tableName: 'naps'
});

module.exports = NAP;