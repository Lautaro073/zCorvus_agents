# Tests para zCorvus Backend

## Estructura de Tests

### /tests
- `health.test.js` - Tests de endpoints básicos
- `auth.test.js` - Tests de autenticación completa
- `uuid.test.js` - Tests de utilidades UUID
- `jwt.test.js` - Tests de utilidades JWT
- `user.model.test.js` - Tests del modelo User

## Ejecutar Tests

### Todos los tests
```bash
npm test
```

### Tests en modo watch
```bash
npm run test:watch
```

### Tests con cobertura
```bash
npm run test:coverage
```

## Cobertura de Tests

### ✅ Completados
- Health check y endpoints básicos
- Sistema de autenticación (register, login, logout, profile)
- Two-Factor Authentication (2FA) completo
- Backup codes para 2FA
- Token access con restricciones para usuarios Pro
- Utilidades UUID (generación y validación)
- Utilidades JWT (generación y verificación)
- Modelo User (CRUD completo con UUID)

### Casos de Prueba

#### Auth Tests (auth.test.js)
**Autenticación Básica:**
- ✅ Registro de usuario nuevo (solo devuelve accessToken)
- ✅ Validación de email duplicado
- ✅ Validación de campos requeridos
- ✅ Validación de formato de email
- ✅ Validación de longitud de contraseña
- ✅ Login con credenciales válidas (solo devuelve accessToken)
- ✅ Login con email inválido
- ✅ Login con contraseña incorrecta
- ✅ Obtener perfil con token válido
- ✅ Rechazo de peticiones sin token
- ✅ Rechazo de token inválido
- ✅ Logout exitoso

**Refresh Token (5 nuevos tests):**
- ✅ Generar refresh token para usuario autenticado
- ✅ Rechazar generación sin autenticación
- ✅ Refrescar access token con refresh token válido
- ✅ Rechazar refresh con token inválido
- ✅ Rechazar refresh sin token

#### User Model Tests (user.model.test.js)
- ✅ Crear usuario con UUID
- ✅ Hash de contraseña automático
- ✅ Buscar por UUID
- ✅ Buscar por email
- ✅ Buscar por username
- ✅ Verificar contraseña correcta
- ✅ Verificar contraseña incorrecta
- ✅ Actualizar datos de usuario
- ✅ Hash de nueva contraseña al actualizar
- ✅ Eliminar usuario

#### UUID Tests (uuid.test.js)
- ✅ Generar UUID válido
- ✅ Generar UUIDs únicos
- ✅ Validar UUID correcto
- ✅ Rechazar formato inválido
- ✅ Rechazar UUID no v4

#### JWT Tests (jwt.test.js)
- ✅ Generar token válido
- ✅ Generar token con expiración custom
- ✅ Verificar token válido
- ✅ Rechazar token inválido
- ✅ Rechazar token expirado
- ✅ Generar access token
- ✅ Generar refresh token

#### Two-Factor Authentication Tests (twoFactor.test.js)
- ✅ Setup 2FA genera QR code y secret
- ✅ Verificar código 2FA válido
- ✅ Rechazar código 2FA inválido
- ✅ Login con 2FA habilitado
- ✅ Deshabilitar 2FA con password y código
- ✅ Validaciones de códigos y passwords

#### Token Access Tests (tokenAccess.test.js)
- ✅ Usuario Pro sin 2FA bloqueado de ver tokens
- ✅ Usuario Pro con 2FA puede ver tokens
- ✅ Usuario regular sin restricciones
- ✅ Generación de backup codes (10 códigos)
- ✅ Login con backup code
- ✅ Backup codes de un solo uso
- ✅ Regeneración de backup codes
- ✅ Admin puede ver todos los tokens

## Notas

- Los tests usan una base de datos de prueba
- Se limpian los datos de prueba automáticamente
- Timeout configurado en 10 segundos
- Coverage reportado en carpeta `/coverage`

## Estado Actual

**152 tests pasando (100%)** ✅
- Health: 2 tests
- Autenticación: 19 tests (14 + 5 nuevos de refresh token)
- Two-Factor Authentication: 14 tests
- Token Access: 13 tests
- CRUD Usuarios: 26 tests
- CRUD Roles: 21 tests
- CRUD Settings Icons: 24 tests
- Modelos y Utilidades: 33 tests
