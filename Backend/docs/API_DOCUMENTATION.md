# 📚 API Backend - Documentación para Frontend

> **Backend URL:** `http://localhost:3001`  
> **Base Path:** `/api`

---

## 🔐 Autenticación

El backend usa **JWT (JSON Web Tokens)** con dos tipos de tokens:
- **Access Token**: Duración de 5 minutos
- **Refresh Token**: Duración de 30 días (con límite de inactividad de 10 días)

### Headers requeridos para endpoints protegidos:
```javascript
Authorization: Bearer <accessToken>
```

---

## 📋 Índice de Endpoints

1. [Autenticación](#autenticación)
2. [Usuarios](#usuarios)
3. [Roles](#roles)
4. [Autenticación 2FA](#autenticación-2fa)
5. [Tokens (NPM)](#tokens-npm)
6. [Settings Icons](#settings-icons)
7. [Stripe (Pagos)](#stripe-pagos)

---

## 🔑 Autenticación

### 1. Registrar Usuario
```http
POST /api/auth/register
```

**Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "data": {
    "user": {
      "id": "uuid-v4",
      "username": "johndoe",
      "email": "john@example.com",
      "roles_id": 2,
      "role_name": "user",
      "two_factor_enabled": false,
      "created_at": "2026-02-05T10:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Notas:**
- El rol por defecto es `user` (ID: 2)
- Solo devuelve `accessToken`, usar `/auth/refresh-token` para obtener refresh token
- El password debe tener mínimo 6 caracteres

---

### 2. Login
```http
POST /api/auth/login
```

**Body:**
```json
{
  "email": "john@example.com",
  "password": "password123",
  "twoFactorCode": "123456"  // Opcional, solo si 2FA está habilitado
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "user": {
      "id": "uuid-v4",
      "username": "johndoe",
      "email": "john@example.com",
      "roles_id": 2,
      "role_name": "user"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response con 2FA requerido (401):**
```json
{
  "success": false,
  "message": "2FA code required",
  "requires2FA": true
}
```

---

### 3. Obtener Refresh Token
```http
POST /api/auth/refresh-token
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Refresh token generated successfully",
  "data": {
    "refreshToken": "uuid-v4-refresh-token",
    "expiresAt": "2026-03-07T10:00:00.000Z"
  }
}
```

---

### 4. Refrescar Access Token
```http
POST /api/auth/refresh
```

**Body:**
```json
{
  "refreshToken": "uuid-v4-refresh-token"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-v4",
      "username": "johndoe",
      "email": "john@example.com"
    }
  }
}
```

---

### 5. Obtener Perfil
```http
GET /api/auth/profile
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "username": "johndoe",
    "email": "john@example.com",
    "roles_id": 2,
    "role_name": "user",
    "token_id": null,
    "settings_icons_id": null,
    "two_factor_enabled": false,
    "created_at": "2026-02-05T10:00:00.000Z"
  }
}
```

---

### 6. Logout
```http
POST /api/auth/logout
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

## 👥 Usuarios

### 1. Obtener Todos los Usuarios (Admin)
```http
GET /api/users
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Permisos:** Solo Admin (roles_id: 1)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-v4",
      "username": "admin",
      "email": "admin@example.com",
      "roles_id": 1,
      "role_name": "admin",
      "two_factor_enabled": true,
      "created_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 2. Obtener Usuario por ID
```http
GET /api/users/:id
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Permisos:** El mismo usuario o Admin

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "username": "johndoe",
    "email": "john@example.com",
    "roles_id": 2,
    "role_name": "user",
    "token_id": null,
    "settings_icons_id": null,
    "two_factor_enabled": false,
    "created_at": "2026-02-05T10:00:00.000Z"
  }
}
```

---

### 3. Actualizar Mi Perfil
```http
PUT /api/users/profile
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "username": "newusername",
  "email": "newemail@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "uuid-v4",
    "username": "newusername",
    "email": "newemail@example.com"
  }
}
```

---

### 4. Actualizar Usuario (Admin o Self)
```http
PUT /api/users/:id
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "username": "updatedname",
  "email": "updated@example.com",
  "roles_id": 3  // Solo admin puede cambiar rol
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": { "id": "uuid-v4" }
}
```

---

### 5. Cambiar Contraseña
```http
PUT /api/users/:id/password
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body (Usuario normal):**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

**Body (Admin cambiando a otro usuario):**
```json
{
  "newPassword": "newpassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

### 6. Eliminar Usuario (Admin)
```http
DELETE /api/users/:id
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Permisos:** Solo Admin (no puede eliminar su propia cuenta)

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## 🎭 Roles

### 1. Obtener Todos los Roles (Admin)
```http
GET /api/roles
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "admin" },
    { "id": 2, "name": "user" },
    { "id": 3, "name": "pro" }
  ]
}
```

---

### 2. Obtener Rol por ID (Admin)
```http
GET /api/roles/:id
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "user"
  }
}
```

---

### 3. Crear Rol (Admin)
```http
POST /api/roles
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "name": "moderator"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Role created successfully",
  "data": {
    "id": 4,
    "name": "moderator"
  }
}
```

---

### 4. Actualizar Rol (Admin)
```http
PUT /api/roles/:id
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "name": "super-admin"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Role updated successfully"
}
```

---

### 5. Eliminar Rol (Admin)
```http
DELETE /api/roles/:id
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Restricciones:**
- No se pueden eliminar los roles `admin` (1) ni `user` (2)

**Response (200):**
```json
{
  "success": true,
  "message": "Role deleted successfully"
}
```

---

## 🔒 Autenticación 2FA

### 1. Setup 2FA (Generar QR)
```http
POST /api/auth/2fa/setup
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "2FA setup initiated",
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "manualEntry": "JBSWY3DPEHPK3PXP"
  }
}
```

**Notas:**
- El QR code se puede mostrar en un `<img src={qrCode} />`
- `manualEntry` es el código para ingresar manualmente en apps como Google Authenticator

---

### 2. Verificar y Activar 2FA
```http
POST /api/auth/2fa/verify
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "token": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "2FA enabled successfully",
  "data": {
    "backupCodes": [
      "abc123def",
      "ghi456jkl",
      "mno789pqr",
      "stu012vwx",
      "yza345bcd"
    ]
  }
}
```

**Importante:** Guardar los `backupCodes` en un lugar seguro

---

### 3. Desactivar 2FA
```http
POST /api/auth/2fa/disable
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "password": "mypassword123",
  "twoFactorCode": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "2FA disabled successfully"
}
```

---

### 4. Obtener Backup Codes
```http
GET /api/auth/2fa/backup-codes
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "backupCodes": [
      { "code": "abc123def", "used": false },
      { "code": "ghi456jkl", "used": true },
      { "code": "mno789pqr", "used": false }
    ]
  }
}
```

---

### 5. Regenerar Backup Codes
```http
POST /api/auth/2fa/backup-codes/regenerate
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "password": "mypassword123",
  "twoFactorCode": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Backup codes regenerated successfully",
  "data": {
    "backupCodes": [
      "new123abc",
      "new456def",
      "new789ghi",
      "new012jkl",
      "new345mno"
    ]
  }
}
```

---

## 🎟️ Tokens (NPM)

### 1. Obtener Mi Token
```http
GET /api/tokens/me
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "token": "npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "type": "pro",
    "start_date": "2026-02-05T00:00:00.000Z",
    "finish_date": "2027-02-05T00:00:00.000Z",
    "created_at": "2026-02-05T10:00:00.000Z"
  }
}
```

**Response (404) - Sin token:**
```json
{
  "success": false,
  "message": "No token found for user"
}
```

**Restricción:** Usuarios Pro sin 2FA habilitado recibirán error 403

---

### 2. Obtener Todos los Tokens (Admin)
```http
GET /api/tokens
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Permisos:** Solo Admin

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-v4",
      "token": "npm_xxxx...",
      "type": "pro",
      "start_date": "2026-02-05T00:00:00.000Z",
      "finish_date": "2027-02-05T00:00:00.000Z",
      "assigned_to": "john@example.com",
      "created_at": "2026-02-05T10:00:00.000Z"
    }
  ]
}
```

---

### 3. Crear Token (Admin)
```http
POST /api/tokens
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "type": "pro",
  "start_date": "2026-02-05",
  "finish_date": "2027-02-05"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Token created successfully",
  "data": {
    "id": "uuid-v4",
    "token": "npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "type": "pro",
    "start_date": "2026-02-05T00:00:00.000Z",
    "finish_date": "2027-02-05T00:00:00.000Z"
  }
}
```

---

### 4. Actualizar Token (Admin)
```http
PUT /api/tokens/:id
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "type": "enterprise",
  "finish_date": "2028-02-05"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token updated successfully"
}
```

---

### 5. Eliminar Token (Admin)
```http
DELETE /api/tokens/:id
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token deleted successfully"
}
```

---

## 🎨 Settings Icons

### 1. Obtener Todos los Settings Icons (Admin)
```http
GET /api/settings-icons
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-v4",
      "icon": "🎨",
      "layer": "solid",
      "created_at": "2026-02-05T10:00:00.000Z"
    }
  ]
}
```

---

### 2. Obtener Mis Settings
```http
GET /api/settings-icons/me
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "icon": "🎨",
    "layer": "solid"
  }
}
```

**Response (404) - Sin settings:**
```json
{
  "success": false,
  "message": "No settings found for user"
}
```

---

### 3. Obtener Settings Icon por ID
```http
GET /api/settings-icons/:id
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "icon": "🎨",
    "layer": "solid"
  }
}
```

---

### 4. Crear Settings Icon
```http
POST /api/settings-icons
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "icon": "🎨",
  "layer": "solid"  // Opcional: "solid", "regular", "light", "duotone"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Settings icon created successfully",
  "data": {
    "id": "uuid-v4",
    "icon": "🎨",
    "layer": "solid"
  }
}
```

---

### 5. Actualizar Settings Icon
```http
PUT /api/settings-icons/:id
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "icon": "🚀",
  "layer": "regular"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Settings icon updated successfully",
  "data": {
    "id": "uuid-v4",
    "icon": "🚀",
    "layer": "regular"
  }
}
```

---

### 6. Eliminar Settings Icon
```http
DELETE /api/settings-icons/:id
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Settings icon deleted successfully"
}
```

---

## 💳 Stripe (Pagos)

### 1. Crear Checkout Session
```http
POST /api/stripe/checkout
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "planType": "pro"  // "pro" o "enterprise"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "url": "https://checkout.stripe.com/c/pay/cs_test_xxxxx..."
  }
}
```

**Notas:**
- Redirigir al usuario a la URL devuelta
- Stripe redirigirá a `/premium/success?session_id={CHECKOUT_SESSION_ID}` en éxito
- Redirigirá a `/premium/cancel` en cancelación

**Precios:**
- **Pro**: $49/año
- **Enterprise**: $99/año

---

### 2. Webhook (Solo para Stripe)
```http
POST /api/stripe/webhook
```

**Headers:**
```
stripe-signature: t=xxxxx,v1=xxxxx
Content-Type: application/json
```

**Notas:**
- Este endpoint es llamado automáticamente por Stripe
- No debe ser usado desde el frontend
- Procesa el evento `checkout.session.completed`
- Genera un token NPM y actualiza el rol del usuario a Pro automáticamente

---

## 🔐 Modelo de Datos

### User
```typescript
{
  id: string;              // UUID v4
  username: string;
  email: string;
  password: string;        // Hasheado con bcrypt
  roles_id: number;        // 1=admin, 2=user, 3=pro
  role_name?: string;      // Nombre del rol (en respuestas)
  token_id: string | null; // ID del token NPM asignado
  settings_icons_id: string | null;
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  created_at: string;      // ISO 8601
  updated_at: string;      // ISO 8601
}
```

### Token (NPM)
```typescript
{
  id: string;              // UUID v4
  token: string;           // npm_xxxx (68 caracteres)
  type: string;            // "pro", "enterprise"
  start_date: string;      // ISO 8601
  finish_date: string;     // ISO 8601
  created_at: string;
}
```

### Role
```typescript
{
  id: number;
  name: string;            // "admin", "user", "pro"
}
```

### SettingsIcons
```typescript
{
  id: string;              // UUID v4
  icon: string;            // Emoji o nombre del icono
  layer: string | null;    // "solid", "regular", "light", "duotone"
  created_at: string;
}
```

---

## ⚠️ Códigos de Error Comunes

| Código | Significado |
|--------|-------------|
| 400 | Bad Request - Datos inválidos o faltantes |
| 401 | Unauthorized - Token inválido o expirado |
| 403 | Forbidden - Sin permisos suficientes |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Email/username ya existe |
| 500 | Internal Server Error - Error del servidor |

---

## 📝 Notas Importantes

### Flujo de Autenticación Recomendado:

1. **Login/Register**
   - Obtener `accessToken` (5 min)
   - Guardar en estado (context/redux)

2. **Obtener Refresh Token**
   - Llamar a `/api/auth/refresh-token`
   - Guardar `refreshToken` en localStorage (30 días)

3. **Refrescar Access Token**
   - Antes de que expire (cada 4 minutos)
   - O cuando recibas error 401
   - Llamar a `/api/auth/refresh` con el refreshToken

4. **Logout**
   - Llamar a `/api/auth/logout`
   - Limpiar tokens del estado y localStorage

### Manejo de Usuarios Pro:

- Los usuarios Pro (`roles_id: 3`) **DEBEN** tener 2FA habilitado para acceder a su token NPM
- El endpoint `/api/tokens/me` retorna 403 si el usuario Pro no tiene 2FA
- Al comprar a través de Stripe, se:
  1. Genera automáticamente un token NPM
  2. Se asigna al usuario
  3. Se actualiza su rol a Pro (3)

### Refresh Token Behavior:

- **Expiración**: 30 días desde creación
- **Inactividad**: Se elimina si no se usa por 10 días
- **Rotación**: Cada vez que se usa `/api/auth/refresh`, se actualiza `last_used_at`

---

## 🧪 Testing con Postman/Thunder Client

### Variables de entorno recomendadas:
```json
{
  "baseUrl": "http://localhost:3001/api",
  "accessToken": "",
  "refreshToken": "",
  "userId": ""
}
```

### Script para auto-actualizar token:
```javascript
// En Tests de login/register:
pm.environment.set("accessToken", pm.response.json().data.accessToken);
pm.environment.set("userId", pm.response.json().data.user.id);
```

---

## 🚀 Cambios vs Better-Auth

### ❌ Removido de Better-Auth:
- Session management automático
- Social providers (Google, GitHub, etc.)
- Email verification automática
- Tablas: `session`, `account`, `verification`

### ✅ Migrado a Backend Nativo:
- JWT con Access + Refresh Tokens
- 2FA con TOTP (Google Authenticator)
- Backup codes para 2FA
- Role-based access control manual
- Tabla `user` (singular)

### 🔄 Necesitas adaptar en el Frontend:

1. **Cambiar imports** de better-auth a fetch/axios
2. **Manejar tokens manualmente** (no más session automática)
3. **Implementar refresh token logic**
4. **Manejar 2FA flow** en login
5. **Actualizar rutas protegidas** con validación de token

---

## 📞 Soporte

Si encuentras algún endpoint que no esté documentado o comportamiento inesperado, revisar:
- Swagger UI: `http://localhost:3001/api-docs`
- Código fuente en `/routes`
- Tests en `/tests`

---

**Última actualización:** 5 de febrero de 2026  
**Versión del Backend:** 1.0.0
