const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Conexion = sequelize.define('Conexion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  puerto_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'puertos',
      key: 'id'
    }
  },
  cliente_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'clientes',
      key: 'id'
    }
  },
  plan_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'planes',
      key: 'id'
    }
  },
  fecha_inicio: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  fecha_fin: {
    type: DataTypes.DATEONLY
  },
  estado: {
    type: DataTypes.ENUM('ACTIVA', 'SUSPENDIDA', 'FINALIZADA'),
    allowNull: false,
    defaultValue: 'ACTIVA'
  },
  creado_por: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  }
}, {
  tableName: 'conexiones'
});

module.exports = Conexion;