# 🗺️ ROADMAP - zCorvus Backend API

## 📋 Estructura de Base de Datos
```
- roles (id, name)
- token (id, token, type, start_date, finish_date)
- settings_icons (id, icon, layer)
- user (id, username, email, password, roles_id, token_id, settings_icons_id)
```

---

## 🎯 FASE 1: Configuración Base y Conexión a BD
**Objetivo:** Establecer la conexión con MySQL y configurar dependencias necesarias

### Tareas:
- [x] Instalar dependencias base (express, dotenv, cors, etc.)
- [x] Configurar variables de entorno para MySQL
- [x] Instalar dependencias para BD (mysql2, uuid)
- [x] Crear conexión a MySQL
- [x] Probar conexión a BD
- [x] Crear pool de conexiones

**Archivos creados:**
- `config/database.js` - Configuración y conexión MySQL
- `utils/db.js` - Utilidades para queries SQL

---

## 🔐 FASE 2: Sistema de Autenticación
**Objetivo:** Implementar registro, login y manejo de tokens JWT

### 2.1 Dependencias de Autenticación
- [x] Instalar bcryptjs (para encriptar contraseñas)
- [x] Instalar jsonwebtoken (para JWT)
- [x] Instalar express-validator (para validaciones)
- [x] Instalar uuid (para generar IDs únicos)

### 2.2 Modelos (UUID para user, token, settings_icons)
- [x] Crear modelo User
- [x] Crear modelo Role
- [x] Crear modelo Token
- [x] Crear utilidad UUID

**Archivos creados:**
- `models/User.js` - Con UUID
- `models/Role.js` - Con INT AUTO_INCREMENT
- `models/Token.js` - Con UUID
- `models/SettingsIcons.js` - Con UUID
- `utils/uuid.js`

### 2.3 Controladores de Autenticación
- [x] Crear AuthController
  - [x] register() - Registro de usuarios
  - [x] login() - Inicio de sesión
  - [x] logout() - Cerrar sesión
  - [x] refreshToken() - Renovar token
  - [x] getProfile() - Obtener perfil

**Archivos creados:**
- `controllers/auth.controller.js`

### 2.4 Middlewares de Autenticación
- [x] Middleware para verificar JWT
- [x] Middleware para verificar roles
- [x] Middleware para validar datos de entrada

**Archivos creados:**
- `middlewares/auth.middleware.js`
- `middlewares/role.middleware.js`

### 2.5 Rutas de Autenticación
- [x] POST `/api/auth/register` - Registrar usuario
- [x] POST `/api/auth/login` - Iniciar sesión
- [x] POST `/api/auth/logout` - Cerrar sesión
- [x] POST `/api/auth/refresh` - Renovar token
- [x] GET `/api/auth/profile` - Obtener perfil

**Archivos creados:**
- `routes/auth.routes.js`

### 2.6 Utilidades
- [x] Función para generar JWT
- [x] Función para hashear contraseñas
- [x] Función para comparar contraseñas
- [x] Función para validar email

**Archivos creados:**
- `utils/jwt.js`
- `utils/validators.js`
- `database.sql` - Script SQL actualizado con UUID

---

## 👥 FASE 3: Gestión de Usuarios
**Objetivo:** CRUD completo de usuarios

### 3.1 Controladores de Usuarios
- [x] Crear UserController
  - [x] getAll() - Obtener todos los usuarios
  - [x] getById() - Obtener usuario por ID
  - [x] update() - Actualizar usuario
  - [x] delete() - Eliminar usuario
  - [x] changePassword() - Cambiar contraseña
  - [x] updateProfile() - Actualizar perfil

**Archivos creados:**
- `controllers/user.controller.js`

### 3.2 Rutas de Usuarios
- [x] GET `/api/users` - Listar usuarios (admin)
- [x] GET `/api/users/:id` - Obtener usuario
- [x] PUT `/api/users/:id` - Actualizar usuario
- [x] DELETE `/api/users/:id` - Eliminar usuario
- [x] PUT `/api/users/:id/password` - Cambiar contraseña
- [x] PUT `/api/users/profile` - Actualizar perfil actual

**Archivos creados:**
- `routes/user.routes.js`

---

## 🎭 FASE 4: Gestión de Roles
**Objetivo:** Administrar roles y permisos

### 4.1 Controladores de Roles
- [x] Crear RoleController
  - [x] getAll() - Listar roles
  - [x] create() - Crear rol
  - [x] update() - Actualizar rol
  - [x] delete() - Eliminar rol
  - [x] getById() - Obtener rol por ID

**Archivos creados:**
- `controllers/role.controller.js`

### 4.2 Rutas de Roles
- [x] GET `/api/roles` - Listar roles (admin)
- [x] GET `/api/roles/:id` - Obtener rol por ID (admin)
- [x] POST `/api/roles` - Crear rol (admin)
- [x] PUT `/api/roles/:id` - Actualizar rol (admin)
- [x] DELETE `/api/roles/:id` - Eliminar rol (admin)

**Archivos creados:**
- `routes/role.routes.js`

---

## ✅ FASE 5: Gestión de Settings Icons
**Objetivo:** Administrar iconos y configuraciones de usuario

### 5.1 Modelo y Controlador
- [x] Crear modelo SettingsIcons
- [x] Crear SettingsIconsController
  - [x] getAll() - Listar iconos
  - [x] getById() - Obtener icono
  - [x] create() - Crear icono
  - [x] update() - Actualizar icono
  - [x] remove() - Eliminar icono
  - [x] getUserSettings() - Obtener settings del usuario

**Archivos creados:**
- `models/SettingsIcons.js`
- `controllers/settingsIcons.controller.js`

### 5.2 Rutas de Settings Icons
- [x] GET `/api/settings-icons` - Listar iconos (admin)
- [x] GET `/api/settings-icons/me` - Obtener settings del usuario actual
- [x] GET `/api/settings-icons/:id` - Obtener icono
- [x] POST `/api/settings-icons` - Crear icono (admin)
- [x] PUT `/api/settings-icons/:id` - Actualizar icono (admin)
- [x] DELETE `/api/settings-icons/:id` - Eliminar icono (admin)

**Archivos creados:**
- `routes/settingsIcons.routes.js`

### 5.3 Tests de Settings Icons
- [x] Crear suite de tests completa (24 tests)
- [x] Probar autenticación y autorización
- [x] Probar validaciones
- [x] Probar casos edge

**Archivos creados:**
- `tests/settingsIcons.test.js`

**Estado:** ✅ COMPLETADA - 24/24 tests pasando

---

## ✅ FASE 6: Documentación Swagger
**Objetivo:** Documentar todos los endpoints

### Tareas:
- [x] Agregar schemas completos (User, Role, SettingsIcons, Error, Success)
- [x] Documentar endpoints de autenticación
- [x] Documentar endpoints de usuarios
- [x] Documentar endpoints de roles
- [x] Documentar endpoints de settings icons (con descripción clara de preferencias visuales)
- [x] Definir schemas en Swagger
- [x] Agregar ejemplos de request/response
- [x] Configurar bearerAuth JWT
- [x] Actualizar descripción general del API

**Archivos actualizados:**
- `config/swagger.js` - Schemas completos y configuración mejorada
- `routes/settingsIcons.routes.js` - Documentación detallada con ejemplos
- `routes/user.routes.js` - Documentación mejorada con schemas

**Estado:** ✅ COMPLETADA - Documentación Swagger completa y funcional en /api-docs

---

## 🧪 FASE 7: Testing (Opcional)
**Objetivo:** Pruebas unitarias y de integración

### Tareas:
- [ ] Configurar Jest o Mocha
- [ ] Tests para autenticación
- [ ] Tests para usuarios
- [ ] Tests para roles
- [ ] Tests para settings icons

---

## 🚀 FASE 8: Despliegue
**Objetivo:** Preparar para producción

### Tareas:
- [ ] Configurar variables de entorno de producción
- [ ] Configurar CORS para producción
- [ ] Optimizar seguridad (rate limiting, helmet)
- [ ] Configurar logging avanzado
- [ ] Crear scripts de migración de BD
- [ ] Documentación de deployment

---

## 📊 Orden de Implementación Recomendado

1. **Conexión a BD** → Base fundamental
2. **Modelos** → Definir estructura de datos
3. **Autenticación** → Sistema de login primero
4. **Usuarios** → CRUD básico
5. **Roles** → Sistema de permisos
6. **Settings Icons** → Configuraciones
7. **Documentación** → Swagger completo
8. **Testing** → Asegurar calidad
9. **Despliegue** → A producción
## 🎯 Próximo Paso
**CONTINUAR CON FASE 8**: Preparación para Despliegue

---

## ✅ COMPLETADO HASTA AHORA

### ✅ Fase 1: Configuración Base
- Conexión MySQL funcionando
- Pool de conexiones configurado
- Utilidades de DB creadas

### ✅ Fase 2: Sistema de Autenticación Completo
- **Modelos:** User, Role, Token, SettingsIcons (con UUID)
- **Controladores:** AuthController completo
- **Middlewares:** Autenticación y roles
- **Rutas:** Todas las rutas de auth
- **Utilidades:** JWT, validaciones, UUID
- **Endpoints funcionando:**
  - POST /api/auth/register
  - POST /api/auth/login
  - POST /api/auth/logout
  - GET /api/auth/profile
  - POST /api/auth/refresh

### ✅ Fase 3: Gestión de Usuarios (CRUD)
- **Controlador:** UserController completo
- **Rutas:** Todas las rutas de usuarios
- **Endpoints funcionando:**
  - GET /api/users (admin)
  - GET /api/users/:id
  - PUT /api/users/:id
  - DELETE /api/users/:id (admin)
  - PUT /api/users/:id/password
  - PUT /api/users/profile

### ✅ Fase 4: Gestión de Roles
- **Controlador:** RoleController completo
- **Rutas:** Todas las rutas de roles (admin only)
- **Endpoints funcionando:**
  - GET /api/roles (admin)
  - GET /api/roles/:id (admin)
  - POST /api/roles (admin)
  - PUT /api/roles/:id (admin)
  - DELETE /api/roles/:id (admin, protege roles esenciales)

### ✅ Fase 5: Gestión de Settings Icons
- **Controlador:** SettingsIconsController completo
- **Rutas:** Todas las rutas de settings icons
- **Endpoints funcionando:**
  - GET /api/settings-icons (admin)
  - GET /api/settings-icons/me (usuario autenticado)
  - GET /api/settings-icons/:id
  - POST /api/settings-icons (admin)
  - PUT /api/settings-icons/:id (admin)
  - DELETE /api/settings-icons/:id (admin)

### ✅ Fase 6: Documentación Swagger
- **Swagger UI:** Disponible en http://localhost:3000/api-docs
- **Schemas definidos:** User, Role, SettingsIcons, Error, Success
- **Documentación completa de:**
  - Autenticación (register, login, logout, profile)
  - CRUD Usuarios (con permisos)
  - CRUD Roles (admin only)
  - CRUD Settings Icons (preferencias visuales de usuario)
- **Ejemplos de request/response** en todos los endpoints
- **Seguridad JWT documentada** (bearerAuth)

### ✅ Fase 7: Testing
- **111 tests pasando correctamente** ✅
  - Health Check: 2 tests
  - Autenticación: 14 tests
  - CRUD Usuarios: 26 tests
  - CRUD Roles: 21 tests
  - CRUD Settings Icons: 24 tests
  - Modelos y Utilidades: 24 tests
- Tests de autenticación completos
- Tests de CRUD de usuarios
- Tests de CRUD de roles
- Tests de CRUD de settings icons
- Tests de modelos y utilidades
- Cobertura de código configurada

### Base de Datos
- Script SQL actualizado en `database.sql`
- IDs con UUID para user, token, settings_icons
- IDs con INT para roles

---

## 📝 Próximas Fases Pendientes

### ✅ Fase 8: Two-Factor Authentication & Security
- **Sistema 2FA Completo:**
  - Setup 2FA con QR code (speakeasy + qrcode)
  - Verificación de códigos TOTP
  - Backup codes (10 códigos de 8 caracteres)
  - Login con backup codes como fallback
  - Regeneración de backup codes
  - Desactivar 2FA con autenticación
- **Token Access Control:**
  - Usuarios Pro DEBEN tener 2FA para ver tokens (403 sin 2FA)
  - Usuarios regulares sin restricciones
  - Endpoint GET /api/tokens/me
  - Endpoint GET /api/tokens (admin)
- **Base de Datos:**
  - Campos 2FA en tabla user (two_factor_enabled, two_factor_secret)
  - Tabla backup_codes (id, user_id, code, used, timestamps)
  - Foreign key CASCADE para limpieza automática
- **Testing:**
  - 14 tests para 2FA
  - 13 tests para token access y Pro restrictions
  - 147 tests totales pasando (100%)
- **Documentación:**
  - docs/2FA.md completo
  - Swagger actualizado con endpoints 2FA y tokens
  - README y tests documentados

**Estado:** ✅ COMPLETADA

---

### ✅ Fase 8.5: JWT/Refresh Token Architecture Overhaul
**Objetivo:** Implementar arquitectura segura de tokens con separación de access/refresh tokens

#### 8.5.1 Configuración de Tokens
- [x] Access Token: 5 minutos de duración (seguridad mejorada)
- [x] Refresh Token: 30 días de duración (conveniencia de usuario)
- [x] Inactividad: 10 días sin uso = token inválido
- [x] Configuración flexible vía variables de entorno
  - JWT_ACCESS_EXPIRE=5m
  - JWT_REFRESH_EXPIRE=30d
  - JWT_REFRESH_INACTIVITY_DAYS=10

#### 8.5.2 Base de Datos
- [x] Tabla `refresh_tokens` creada:
  - id, user_id, token, expires_at, last_used_at, created_at
  - Índices en user_id, token, expires_at
  - CASCADE DELETE con tabla user
- [x] Modelo RefreshToken con 7 métodos:
  - create(), findByToken(), updateLastUsed()
  - isActive(), deleteByUserId(), deleteByToken()
  - cleanupExpired()

#### 8.5.3 Endpoints Actualizados
- [x] POST /api/auth/register → Devuelve solo accessToken
- [x] POST /api/auth/login → Devuelve solo accessToken
- [x] POST /api/auth/refresh-token (NUEVO)
  - Endpoint autenticado para obtener refresh token
  - Requiere Bearer token válido
  - Devuelve refreshToken + metadata (expiresAt, inactivityDays)
- [x] POST /api/auth/refresh (ACTUALIZADO)
  - Valida token en base de datos (no solo JWT signature)
  - Verifica expiración absoluta (30 días)
  - Verifica inactividad (10 días sin uso)
  - Actualiza last_used_at en cada uso
  - Elimina tokens inválidos automáticamente

#### 8.5.4 Mejoras de Seguridad
- [x] Ventana de exposición reducida (access tokens 5 min)
- [x] Capacidad de revocación (tokens en BD)
- [x] Detección de tokens abandonados (inactividad 10 días)
- [x] Separación de privilegios (refresh token no automático)
- [x] Trazabilidad (last_used_at para auditoría)

#### 8.5.5 Documentación y Tests
- [x] Swagger actualizado con nuevos endpoints
- [x] Documentación detallada de flujo de tokens
- [x] 5 nuevos tests para refresh token endpoints
- [x] Todos los tests actualizados (152 tests pasando)

**Arquitectura Final:**
```
1. Usuario → login/register → Recibe accessToken (5 min)
2. Usuario → POST /api/auth/refresh-token → Recibe refreshToken (30 días)
3. AccessToken expira → POST /api/auth/refresh → Nuevo accessToken
4. Token válido si: no expiró (30d) + usado en últimos 10d + existe en BD
```

**Archivos modificados:**
- .env.example, utils/jwt.js
- database.sql (nueva tabla)
- models/RefreshToken.js (NUEVO)
- models/index.js
- controllers/auth.controller.js
- routes/auth.routes.js
- tests/auth.test.js, tests/twoFactor.test.js

**Estado:** ✅ COMPLETADA - 152/152 tests pasando

---

### ⏳ Fase 9: NPM Package Premium Tokens (JWT)
**Objetivo:** Sistema de tokens JWT para paquete npm @zcorvus/icons-pro (freemium)

#### 9.1 Generación de Claves RSA
- [ ] Generar par de claves RSA (private.pem + public.pem)
- [ ] Almacenar clave privada de forma segura (variables de entorno)
- [ ] Clave pública será hardcodeada en el paquete npm

#### 9.2 Endpoint de Generación de Token NPM
- [ ] Crear endpoint `GET /api/tokens/npm-token`
  - Solo usuarios Pro con token activo
  - Requiere 2FA habilitado
  - Genera JWT firmado con RSA
  - Payload: userId, email, plan: 'pro', exp (1 año)
- [ ] Documentar en Swagger con ejemplos de uso
- [ ] Tests para generación de tokens npm

#### 9.3 Endpoint de Validación (Opcional - para validación online)
- [ ] Crear endpoint `POST /api/tokens/verify-npm`
  - Valida tokens npm
  - Devuelve información del usuario
  - Detecta tokens revocados
  - Rate limiting para evitar abuso

#### 9.4 Documentación para Usuarios
- [ ] Crear `docs/NPM_TOKEN.md` con instrucciones:
  - Cómo obtener el token npm después de comprar
  - Configurar `ZCORVUS_TOKEN` environment variable
  - Alternativa: guardar en `~/.zcorvus/token`
  - Troubleshooting común
- [ ] Actualizar README con sección de npm premium

#### 9.5 Integración con Stripe (Futuro)
- [ ] Webhook para crear tokens automáticamente
- [ ] Sincronizar expiración con suscripción
- [ ] Revocar tokens al cancelar suscripción
- [ ] Renovar tokens al renovar suscripción

**Arquitectura:**
```
Usuario Paga → Stripe Webhook → Crea Token en DB → 
Usuario llama GET /api/tokens/npm-token → Recibe JWT →
Configura en npm → Paquete valida JWT localmente
```

**Ventajas:**
- ✅ Funciona offline (validación local con clave pública)
- ✅ Seguro (no pueden falsificar sin clave privada)
- ✅ No requiere conexión a API para usar el paquete
- ✅ Tokens con expiración (1 año)
- ✅ Revocables (usuario pierde acceso a endpoint de renovación)

**Estado:** ⏳ PENDIENTE

---

### ⏳ Fase 10: Despliegue
