require('dotenv').config();
const { Sequelize } = require('sequelize');

// Usar DATABASE_URL (Render) o STRING_CONEXION_BD (local)
const databaseUrl = process.env.DATABASE_URL || process.env.STRING_CONEXION_BD;

// Detectar si es base de datos de Render (requiere SSL)
const requiresSSL = databaseUrl && databaseUrl.includes('render.com');

const sequelize = new Sequelize(databaseUrl, {
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialect: 'postgres',
  dialectOptions: {
    ssl: requiresSSL ? {
      require: true,
      rejectUnauthorized: false
    } : false
  },
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000
  }
});

module.exports = sequelize;