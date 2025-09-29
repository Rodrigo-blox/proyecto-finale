const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  correo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  rol: {
    type: DataTypes.ENUM('ADMIN', 'TECNICO', 'SUPERVISOR'),
    allowNull: false,
    defaultValue: 'TECNICO'
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  clave: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'usuarios',
  hooks: {
    beforeCreate: async (usuario) => {
      if (usuario.clave) {
        usuario.clave = await bcrypt.hash(usuario.clave, 12);
      }
    },
    beforeUpdate: async (usuario) => {
      if (usuario.changed('clave')) {
        usuario.clave = await bcrypt.hash(usuario.clave, 12);
      }
    }
  }
});

Usuario.prototype.compararClave = async function(claveIngresada) {
  return await bcrypt.compare(claveIngresada, this.clave);
};

module.exports = Usuario;