const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * Modelo de datos para Usuario del sistema
 * 
 * @class Usuario
 * @description Modelo Sequelize que representa a los usuarios del sistema con autenticación y roles
 * 
 * @property {string} id - UUID único del usuario (primary key)
 * @property {string} correo - Correo electrónico único del usuario (validado como email)
 * @property {string} nombre - Nombre completo del usuario
 * @property {string} rol - Rol del usuario: 'ADMIN', 'TECNICO', 'SUPERVISOR' (default: 'TECNICO')
 * @property {boolean} activo - Estado del usuario (default: true)
 * @property {string} clave - Contraseña hasheada del usuario
 * 
 * @example
 * // Crear un nuevo usuario:
 * const usuario = await Usuario.create({
 *   correo: 'usuario@empresa.com',
 *   nombre: 'Juan Pérez',
 *   rol: 'TECNICO',
 *   clave: 'password123'
 * });
 * 
 * // Verificar contraseña:
 * const esValida = await usuario.compararClave('password123');
 * 
 * @see {@link ../controllers/usuarioController.js} Controlador de usuarios
 * @see {@link ../middleware/auth.js} Middleware de autenticación
 */
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

/**
 * Método de instancia para comparar contraseñas
 * 
 * @async
 * @method compararClave
 * @memberof Usuario
 * @param {string} claveIngresada - Contraseña en texto plano para comparar
 * 
 * @returns {Promise<boolean>} true si la contraseña coincide, false en caso contrario
 * 
 * @example
 * const usuario = await Usuario.findByPk(id);
 * const esValida = await usuario.compararClave('passwordDelUsuario');
 * if (esValida) {
 *   console.log('Contraseña correcta');
 * }
 * 
 * @description
 * - Compara la contraseña ingresada con el hash almacenado
 * - Utiliza bcrypt para comparación segura
 * - Método esencial para autenticación de usuarios
 * - No expone la contraseña hasheada
 */
Usuario.prototype.compararClave = async function(claveIngresada) {
  return await bcrypt.compare(claveIngresada, this.clave);
};

module.exports = Usuario;