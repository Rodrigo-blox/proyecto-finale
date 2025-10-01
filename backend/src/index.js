require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const { sequelize } = require('./models');
const routes = require('./routes');
const { crearDatosPruebaAuditoria } = require('./utils/seedAuditoria');

const app = express();

const swagger = require('./utils/swagger');
const swaggerUi = require('swagger-ui-express');

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta IP, intente más tarde'
  }
});

app.use(helmet());
// app.use(limiter);
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  
}));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swagger));
app.use('/api/v1', routes);

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

app.use((error, req, res, next) => {
  console.error('Error:', error);

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errores: error.errors
    });
  }

  if (error.name === 'SequelizeConnectionError') {
    return res.status(503).json({
      success: false,
      message: 'Error de conexión a la base de datos'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

const PORT = process.env.PORT || 3000;

const iniciarServidor = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a base de datos establecida');

    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Modelos sincronizados');

      // Crear datos de prueba para auditoría
      // await crearDatosPruebaAuditoria();
    }

    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🌐 URL: http://localhost:${PORT}/api/v1`);
      console.log(`📚 Documentación API: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
};

iniciarServidor();