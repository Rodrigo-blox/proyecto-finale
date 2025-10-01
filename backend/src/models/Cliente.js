const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cliente = sequelize.define('Cliente', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ci: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  apellido: {
    type: DataTypes.STRING,
    allowNull: true
  },
  telefono: {
    type: DataTypes.STRING
  },
  correo: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true
    }
  },
  direccion: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'clientes'
});

module.exports = Cliente;