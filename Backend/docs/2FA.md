# Two-Factor Authentication (2FA) - zCorvus API

## Descripción

Sistema de autenticación de dos factores (2FA) usando códigos TOTP (Time-based One-Time Password) compatibles con aplicaciones como:
- Google Authenticator
- Microsoft Authenticator
- Authy
- 1Password
- Cualquier app compatible con RFC 6238

## 🔐 Política de 2FA para Usuarios Pro

**IMPORTANTE**: Los usuarios Pro (role 3) **DEBEN tener 2FA habilitado** para acceder a sus tokens. Esto es obligatorio por razones de seguridad.

### Restricciones para Usuarios Pro:

- ✅ **Pueden registrarse** y hacer login normalmente
- ✅ **Automáticamente obtienen role Pro** si tienen token activo asignado
- ❌ **NO pueden ver sus tokens** sin 2FA habilitado
- ✅ **GET /api/tokens/me** requiere 2FA obligatoriamente para Pro

### Para Usuarios Normales:

- ✅ 2FA es **opcional** (recomendado pero no obligatorio)
- ✅ Pueden ver información sin restricciones 2FA

## Códigos de Respaldo (Backup Codes)

Cuando habilitas 2FA, el sistema genera **10 códigos de respaldo de 8 caracteres** que puedes usar si pierdes acceso a tu aplicación de autenticación.

### Características:

- ✅ **10 códigos** únicos generados automáticamente
- ✅ Cada código se puede usar **solo una vez**
- ✅ Se pueden **regenerar** en cualquier momento (invalida los anteriores)
- ✅ Se pueden usar en lugar del código 2FA durante el login

## Flujo de Uso

### 1. Configurar 2FA

**Endpoint:** `POST /api/auth/2fa/setup`

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,...",
    "manualEntry": "otpauth://totp/zCorvus..."
  }
}
```

**Pasos:**
1. Escanea el QR code con tu app de autenticación
2. O ingresa manualmente el `secret` en tu app
3. La app generará códigos de 6 dígitos que cambian cada 30 segundos

### 2. Verificar y Activar 2FA

**Endpoint:** `POST /api/auth/2fa/verify`

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}
```

**Body:**
```json
{
  "token": "123456"
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "2FA enabled successfully",
  "backupCodes": [
    "A1B2C3D4",
    "E5F6G7H8",
    "I9J0K1L2",
    "M3N4O5P6",
    "Q7R8S9T0",
    "U1V2W3X4",
    "Y5Z6A7B8",
    "C9D0E1F2",
    "G3H4I5J6",
    "K7L8M9N0"
  ],
  "warning": "Save these backup codes in a safe place. Each can only be used once."
}
```

**IMPORTANTE:** Guarda los backup codes en un lugar seguro. Los necesitarás si pierdes acceso a tu app de autenticación.

**Nota:** El código tiene una ventana de tolerancia de ±2 intervalos (±60 segundos).

### 3. Login con 2FA

Cuando un usuario tiene 2FA habilitado:

**Endpoint:** `POST /api/auth/login`

**Body sin 2FA code:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Respuesta (401):**
```json
{
  "success": false,
  "message": "2FA code required",
  "requires2FA": true
}
```

**Body con 2FA code o backup code:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "twoFactorCode": "123456"  // O un backup code como "A1B2C3D4"
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "username": "...",
      "email": "...",
      "role": "...",
      "two_factor_enabled": true
    },
    "accessToken": "...",
    "refreshToken": "..."
  },
  "message": "Login successful"
}
```

### 4. Deshabilitar 2FA

**Endpoint:** `POST /api/auth/2fa/disable`

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}
```

**Body:**
```json
{
  "password": "password123",
  "token": "123456"
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "2FA disabled successfully"
}
```

## Errores Comunes

### 400 - Invalid token format
```json
{
  "success": false,
  "message": "Invalid token format"
}
```
El código debe ser exactamente 6 dígitos.

### 400 - Invalid verification code
```json
{
  "success": false,
  "message": "Invalid verification code"
}
```
El código no es válido o expiró. Intenta con el código más reciente de tu app.

### 400 - 2FA already enabled
```json
{
  "success": false,
  "message": "2FA already enabled"
}
```
El usuario ya tiene 2FA activado. Debe deshabilitarlo primero si quiere generar un nuevo secret.

### 400 - No 2FA setup found or expired
```json
{
  "success": false,
  "message": "No 2FA setup found or expired. Please setup 2FA first."
}
```
Debes llamar a `/api/auth/2fa/setup` primero. Los secrets temporales expiran en 10 minutos.

### 401 - Invalid password
```json
{
  "success": false,
  "message": "Invalid password"
}
```
La contraseña proporcionada es incorrecta.

### 401 - Invalid 2FA code or backup code
```json
{
  "success": false,
  "message": "Invalid 2FA code or backup code"
}
```
Ni el código 2FA ni el backup code son válidos, o el backup code ya fue usado.

## Gestión de Backup Codes

### Obtener Códigos de Respaldo Restantes

**Endpoint:** `GET /api/auth/2fa/backup-codes`

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "codes": ["A1B2C3D4", "E5F6G7H8", "I9J0K1L2"],
    "count": 3
  }
}
```

### Regenerar Códigos de Respaldo

**Endpoint:** `POST /api/auth/2fa/backup-codes/regenerate`

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}
```

**Body:**
```json
{
  "password": "password123",
  "token": "123456"
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Backup codes regenerated successfully",
  "backupCodes": [
    "X1Y2Z3A4",
    "B5C6D7E8",
    ...
  ],
  "warning": "Old backup codes are now invalid. Save these new codes in a safe place."
}
```

## Acceso a Tokens (Usuarios Pro)

### Ver Mi Token

**Endpoint:** `GET /api/tokens/me`

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "token": {
      "id": "...",
      "token": "PRO-TOKEN-ABC123",
      "type": "pro",
      "start_date": "2025-01-01T00:00:00.000Z",
      "finish_date": "2025-12-31T23:59:59.000Z",
      "is_active": true
    }
  }
}
```

**Respuesta si Pro sin 2FA (403):**
```json
{
  "success": false,
  "message": "Pro users must enable 2FA to access their tokens",
  "requires2FA": true,
  "setupUrl": "/api/auth/2fa/setup"
}
```

### Ver Todos los Tokens (Admin)

**Endpoint:** `GET /api/tokens`

**Headers:**
```json
{
  "Authorization": "Bearer ADMIN_ACCESS_TOKEN"
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "tokens": [
      {
        "id": "...",
        "token": "PRO-TOKEN-ABC123",
        "type": "pro",
        "start_date": "...",
        "finish_date": "..."
      }
    ]
  }
}
```

## Campos en Base de Datos

### Tabla `user`:

```sql
two_factor_enabled TINYINT(1) DEFAULT 0 NOT NULL
two_factor_secret VARCHAR(255) DEFAULT NULL
```

- **two_factor_enabled**: 1 = habilitado, 0 = deshabilitado
- **two_factor_secret**: Secret encriptado en base32 (NULL si no está habilitado)

### Tabla `backup_codes`:

```sql
CREATE TABLE backup_codes (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    code VARCHAR(10) NOT NULL,
    used TINYINT(1) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
)
```

- **code**: Código de 8 caracteres hexadecimal (ej: "A1B2C3D4")
- **used**: 0 = no usado, 1 = ya usado
- **used_at**: Timestamp de cuando se usó el código

## Seguridad

- El secret se almacena en la BD y NO se envía al cliente excepto durante setup
- Los códigos 2FA solo son válidos por 30 segundos
- Ventana de tolerancia de ±60 segundos para compensar desfases de reloj
- Se requiere contraseña + código 2FA para deshabilitar
- Los secrets temporales expiran en 10 minutos
- **Backup codes**: cada uno se puede usar solo una vez
- **Pro users**: DEBEN tener 2FA para acceder a tokens (seguridad obligatoria)
- Login acepta tanto códigos 2FA como backup codes
- Al regenerar backup codes, los anteriores quedan invalidados

## Testing

Ejecutar tests de 2FA:
```bash
npm test -- tests/twoFactor.test.js
```

Ejecutar tests de acceso a tokens:
```bash
npm test -- tests/tokenAccess.test.js
```

Tests incluidos:
- ✅ Setup 2FA (generar QR)
- ✅ Verificar código y habilitar
- ✅ Generación de 10 backup codes
- ✅ Login con 2FA
- ✅ Login con backup code
- ✅ Login sin código (rechazar)
- ✅ Login con código inválido (rechazar)
- ✅ Backup code usado una vez no se puede reusar
- ✅ Regenerar backup codes
- ✅ Pro user sin 2FA bloqueado de ver tokens
- ✅ Pro user con 2FA puede ver tokens
- ✅ Usuario normal puede acceder sin 2FA
- ✅ Deshabilitar 2FA
- ✅ Validaciones de seguridad

**Total: 27 tests (14 de 2FA + 13 de tokens/Pro)**

## Ejemplo de Flujo Completo

```javascript
// 1. Usuario inicia sesión
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
// Respuesta: tokens

// 2. Usuario habilita 2FA
POST /api/auth/2fa/setup
Headers: { "Authorization": "Bearer ACCESS_TOKEN" }
// Respuesta: QR code + secret

// 3. Usuario escanea QR en Google Authenticator

// 4. Usuario verifica código
POST /api/auth/2fa/verify
Headers: { "Authorization": "Bearer ACCESS_TOKEN" }
{
  "token": "123456"
}
// Respuesta: 2FA habilitado

// 5. Próximo login requerirá 2FA
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123",
  "twoFactorCode": "654321"
}
// Respuesta: tokens
```

## Notas Importantes

1. **Almacenamiento del Secret**: El secret temporal se guarda en memoria (Map). En producción, considera usar **Redis** para escalabilidad.

2. **Backup Codes**: ✅ **IMPLEMENTADO** - 10 códigos de respaldo generados automáticamente al habilitar 2FA. Cada código se puede usar solo una vez.

3. **Pro Users & 2FA**: Los usuarios Pro **DEBEN** tener 2FA habilitado para acceder a sus tokens. Esto es obligatorio por seguridad.

4. **Rate Limiting**: Considera implementar rate limiting en los endpoints de verificación para prevenir ataques de fuerza bruta.

5. **Auditoría**: Log todos los intentos de habilitación/deshabilitación de 2FA y uso de backup codes para seguridad.

6. **Notificaciones**: Envía emails cuando se habilite/deshabilite 2FA o se usen backup codes para alertar al usuario.

7. **Códigos Usados**: Una vez usado un backup code, queda marcado como `used=1` y no se puede reutilizar.

8. **Regeneración**: Al regenerar backup codes, todos los códigos anteriores quedan invalidados automáticamente.

## Swagger Documentation

Todos los endpoints de 2FA están documentados en:
```
http://localhost:3000/api-docs
```

Busca la sección **"2FA"** en la documentación de Swagger.
