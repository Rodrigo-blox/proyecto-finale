# Backend API - Sistema de Gestión NAPs

Backend para el sistema de gestión de NAPs (Network Access Points) para ISP, desarrollado con Node.js, Express y PostgreSQL.

## 🚀 Tecnologías

- **Runtime:** Node.js
- **Framework:** Express.js
- **Base de datos:** PostgreSQL
- **ORM:** Sequelize
- **Autenticación:** JWT
- **Validación:** express-validator
- **Seguridad:** helmet, cors, rate-limiting

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Configurar variables en .env
# Crear base de datos PostgreSQL
createdb rodrigo_nap_db

# Ejecutar migraciones (cuando estén disponibles)
npm run migrate

# Ejecutar seeders (cuando estén disponibles)
npm run seed
```

## 🛠️ Scripts

```bash
npm run dev      # Desarrollo con nodemon
npm start        # Producción
npm test         # Ejecutar tests
npm run migrate  # Ejecutar migraciones
npm run seed     # Ejecutar seeders
```

## 🌐 API Endpoints

### Autenticación
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/perfil` - Perfil usuario

### Usuarios (Solo Admin)
- `GET /api/v1/usuarios` - Listar usuarios
- `POST /api/v1/usuarios` - Crear usuario
- `GET /api/v1/usuarios/:id` - Obtener usuario
- `PUT /api/v1/usuarios/:id` - Actualizar usuario
- `DELETE /api/v1/usuarios/:id` - Desactivar usuario
- `PATCH /api/v1/usuarios/cambiar-clave` - Cambiar clave

### NAPs
- `GET /api/v1/naps` - Listar NAPs (con filtros)
- `GET /api/v1/naps/mapa` - NAPs para mapa
- `GET /api/v1/naps/:id` - Obtener NAP
- `POST /api/v1/naps` - Crear NAP (Admin/Supervisor)
- `PUT /api/v1/naps/:id` - Actualizar NAP (Admin/Técnico)

### Otros
- `GET /api/v1/health` - Health check

## 🔐 Roles y Permisos

- **ADMIN:** Acceso completo
- **SUPERVISOR:** Gestión de NAPs y visualización
- **TECNICO:** Mantenimientos y consultas

## 🗄️ Estructura de Base de Datos

### Tablas principales:
- `usuarios` - Gestión de usuarios del sistema
- `naps` - Dispositivos NAP con coordenadas
- `puertos` - Puertos de cada NAP
- `clientes` - Información de clientes
- `planes` - Planes de servicio
- `conexiones` - Asociación puerto-cliente-plan
- `mantenimientos` - Historial de mantenimientos
- `auditoria` - Trazabilidad de cambios

## 🌍 Coordenadas Geográficas

Los NAPs incluyen campos `latitud` y `longitud` para integración con mapas:
- Formato: Decimal degrees
- Validación: lat (-90 a 90), lng (-180 a 180)
- Endpoint especial: `/api/v1/naps/mapa`

## 🔧 Variables de Entorno

```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rodrigo_nap_db
DB_USER=postgres
DB_PASSWORD=tu_password

# JWT
JWT_SECRET=tu_secreto_jwt
JWT_EXPIRES_IN=24h

# Servidor
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:4200
```

## 📝 Desarrollo

La API está preparada para integrarse con un frontend Angular y manejo de mapas con Leaflet. Incluye:

- Autenticación JWT con roles
- Validaciones robustas
- Manejo de errores estandarizado
- Rate limiting
- CORS configurado
- Logging en desarrollo
- Estructura escalable con Clean Architecture