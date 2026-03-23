# zCorvus Backend API

API RESTful backend para zCorvus - Librería de Iconos con sistema freemium (Free, Pro, Admin).

## 🎯 Descripción

Backend completo para una librería de iconos que permite a los usuarios personalizar cómo visualizan los iconos (temas, estilos, capas). Sistema de roles con acceso diferenciado para usuarios free, pro y administradores.

## 🚀 Inicio Rápido

### Prerequisitos

- Node.js (v14 o superior)
- MySQL (XAMPP recomendado para desarrollo)
- npm o yarn

### Instalación

1. Clona el repositorio
```bash
git clone https://github.com/Lautaro073/zcorvus_backend.git
cd zcorvus_backend
```

2. Instala las dependencias
```bash
npm install
```

3. Configura las variables de entorno
```bash
cp .env.example .env
# Edita el archivo .env con tus configuraciones
```

4. Configura la base de datos
```bash
# Importa database.sql en tu MySQL
# Asegúrate de que XAMPP esté corriendo
```

5. Inicia el servidor
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

6. Accede a la documentación Swagger
```
http://localhost:3000/api-docs
```

## 📁 Estructura del Proyecto

```
Backend/
├── config/         # Configuraciones (DB, Swagger)
├── controllers/    # Lógica de negocio
├── middlewares/    # Auth, permisos, validaciones
├── models/         # Modelos de datos (User, Role, SettingsIcons)
├── routes/         # Definición de endpoints
├── tests/          # Tests unitarios e integración (Jest)
├── utils/          # Helpers (JWT, UUID, validadores)
├── app.js          # Configuración Express
├── server.js       # Punto de entrada
├── database.sql    # Script SQL inicial
└── package.json
```

## 🔐 Sistema de Autenticación

### Roles
- **Admin (ID=1)**: Acceso completo a toda la API
- **User/Free (ID=2)**: Acceso limitado, funciones básicas
- **Pro (ID=3)**: Acceso premium, **requiere 2FA para ver tokens**

### JWT/Refresh Token Architecture

#### Configuración de Tokens
- **Access Token**: 5 minutos de duración (JWT_ACCESS_EXPIRE=5m)
- **Refresh Token**: 30 días de duración (JWT_REFRESH_EXPIRE=30d)
- **Inactividad**: Tokens inválidos después de 10 días sin uso (JWT_REFRESH_INACTIVITY_DAYS=10)

#### Características de Seguridad
- ✅ **Ventana de exposición reducida**: Access tokens de solo 5 minutos
- ✅ **Revocación**: Refresh tokens almacenados en BD permiten invalidación inmediata
- ✅ **Detección de abandono**: Tokens inactivos por 10 días se invalidan automáticamente
- ✅ **Separación de privilegios**: Refresh token no se devuelve automáticamente en login/register
- ✅ **Trazabilidad**: Campo last_used_at para auditoría de uso

#### Flujo de Autenticación
```
1. Usuario hace login/register
   → Recibe solo accessToken (5 min)

2. Para obtener refresh token (opcional):
   → POST /api/auth/refresh-token (requiere autenticación)
   → Recibe refreshToken (30 días) + metadata

3. Cuando accessToken expira:
   → POST /api/auth/refresh (con refreshToken)
   → Recibe nuevo accessToken (5 min)
   → Se actualiza last_used_at en BD

4. RefreshToken es válido si:
   ✓ No ha expirado (< 30 días desde creación)
   ✓ Se ha usado en los últimos 10 días
   ✓ Existe en la base de datos
```

### Two-Factor Authentication (2FA)
- Autenticación de dos factores con TOTP (Google Authenticator, Authy, etc.)
- **Obligatorio para usuarios Pro** al acceder a tokens
- 10 códigos de respaldo generados automáticamente
- Códigos de respaldo de un solo uso
- Regeneración de códigos con autenticación

## 📚 Endpoints API

### Autenticación (`/api/auth`)
- `POST /register` - Registrar nuevo usuario (devuelve solo accessToken)
- `POST /login` - Iniciar sesión (devuelve solo accessToken)
- `POST /logout` - Cerrar sesión
- `GET /profile` - Obtener perfil del usuario autenticado
- `POST /refresh-token` - Obtener refresh token **(requiere autenticación)**
- `POST /refresh` - Refrescar access token usando refresh token

### Two-Factor Authentication (`/api/auth/2fa`)
- `POST /setup` - Configurar 2FA (genera QR code)
- `POST /verify` - Verificar y activar 2FA (devuelve backup codes)
- `POST /disable` - Desactivar 2FA
- `GET /backup-codes` - Ver códigos de respaldo restantes
- `POST /backup-codes/regenerate` - Regenerar códigos de respaldo

### Tokens (`/api/tokens`)
- `GET /me` - Ver mi token **(Pro users require 2FA)**
- `GET /` - Listar todos los tokens **(Admin only)**

### Usuarios (`/api/users`)
- `GET /` - Listar todos los usuarios **(Admin only)**
- `GET /:id` - Obtener usuario por ID **(Self or Admin)**
- `PUT /profile` - Actualizar mi perfil
- `PUT /:id` - Actualizar usuario **(Self or Admin)**
- `PUT /:id/password` - Cambiar contraseña **(Self or Admin)**
- `DELETE /:id` - Eliminar usuario **(Admin only)**

### Roles (`/api/roles`)
- `GET /` - Listar todos los roles **(Admin only)**
- `GET /:id` - Obtener rol por ID **(Admin only)**
- `POST /` - Crear rol **(Admin only)**
- `PUT /:id` - Actualizar rol **(Admin only)**
- `DELETE /:id` - Eliminar rol **(Admin only)**

### Settings Icons (`/api/settings-icons`)
**Nota**: Settings Icons son **preferencias de visualización** (light/dark, layers), no iconos literales.

- `GET /` - Listar todas las preferencias **(Admin only)**
- `GET /me` - Obtener mis preferencias **(Authenticated)**
- `GET /:id` - Obtener preferencias por ID **(Authenticated)**
- `POST /` - Crear preferencias **(Authenticated)** ✅ Cualquier usuario
- `PUT /:id` - Actualizar preferencias **(Authenticated)** ✅ Cualquier usuario
- `DELETE /:id` - Eliminar preferencias **(Authenticated)** ✅ Cualquier usuario

## 🔧 Tecnologías

### Core
- **Express 4.18.2** - Framework web
- **MySQL2** - Base de datos
- **JWT** - Autenticación
- **bcryptjs** - Hash de contraseñas
- **speakeasy** - Two-Factor Authentication (TOTP)
- **qrcode** - Generación de códigos QR para 2FA

### Seguridad
- **Helmet** - Headers HTTP seguros
- **CORS** - Cross-Origin Resource Sharing
- **express-validator** - Validación de datos

### Desarrollo
- **Jest** - Testing (111 tests)
- **Supertest** - Tests de integración
- **Morgan** - Logger HTTP
- **Nodemon** - Hot reload

### Documentación
- **Swagger/OpenAPI 3.0** - Documentación interactiva

## 📝 Scripts Disponibles

- `npm start` - Inicia el servidor en producción
- `npm run dev` - Inicia el servidor con nodemon
- `npm test` - Ejecuta todos los tests (111 tests)
- `npm test -- <file>` - Ejecuta tests específicos

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Tests específicos
npm test -- tests/auth.test.js
npm test -- tests/settingsIcons.test.js

# Coverage
npm test -- --coverage
```

**Estado actual: 152/152 tests pasando** ✅

## 🔑 Variables de Entorno

```env
# Server
PORT=3000
NODE_ENV=development

# Database (XAMPP)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=zcorvus
DB_PORT=3306

# JWT
JWT_SECRET=tu_secret_key_aqui

# Access Token (5 minutos)
JWT_ACCESS_EXPIRE=5m

# Refresh Token (30 días)
JWT_REFRESH_EXPIRE=30d

# Refresh Token Inactividad (10 días sin uso = inválido)
JWT_REFRESH_INACTIVITY_DAYS=10
```

## 📖 Documentación API (Swagger)

Accede a la documentación interactiva completa en:
```
http://localhost:3000/api-docs
```

Incluye:
- Schemas de todos los modelos
- Ejemplos de request/response
- Autenticación JWT integrada
- Try it out interactivo

## 🗄️ Base de Datos

### Tablas
- `roles` - Roles del sistema (admin, user, pro)
- `user` - Usuarios con UUID + campos 2FA (two_factor_enabled, two_factor_secret)
- `token` - Tokens de sesión
- `settings_icons` - Preferencias de visualización de usuarios
- `backup_codes` - Códigos de respaldo para 2FA (10 por usuario)
- `refresh_tokens` - Refresh tokens con tracking de uso (id, user_id, token, expires_at, last_used_at)

### Relaciones
- User -> Role (many-to-one)
- User -> SettingsIcons (one-to-one)
- User -> Token (one-to-many)

## 📄 Licencia

ISC
