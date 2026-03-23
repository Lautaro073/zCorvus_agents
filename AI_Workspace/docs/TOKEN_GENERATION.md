# zCorvus: JWT Token Generation Documentation

Este documento explica de forma oficial y detallada cómo funciona el proceso de generación de JSON Web Tokens (JWT) dentro del ecosistema Backend de zCorvus.

## Resumen Arquitectónico
El backend utiliza la librería estándar `jsonwebtoken` (versión 9.0.3) para firmar y verificar tokens. Toda la lógica ha sido correctamente abstraída en un módulo de utilidades independiente para evitar acoplamiento en los controladores.

- **Ubicación del Código:** `Backend/utils/jwt.js`
- **Fuente de Configuración:** `Backend/config/config.js` y variables de entorno (`.env`).

## Tipos de Tokens y Expiración

El sistema de autenticación de zCorvus implementa un flujo dual moderno de tokens (Access + Refresh) para mayor seguridad.

### 1. Access Token (Token de Acceso)
Se genera mediante la función `generateAccessToken()`.
- **Propósito:** Autorizar cada petición a la API.
- **Payload:** Contiene el `id` del usuario, el `email` y su `role`.
- **Expiración:** Es de corta vida. Usa la variable de entorno `JWT_ACCESS_EXPIRE` o expira en **5 minutos** (`'5m'`) por defecto.

### 2. Refresh Token (Token de Refresco)
Se genera mediante la función `generateRefreshToken()`.
- **Propósito:** Obtener un nuevo Access Token cuando este caduca, sin obligar al usuario a iniciar sesión de nuevo.
- **Payload:** Contiene el `id` del usuario y un flag `type: 'refresh'`.
- **Expiración:** Es de larga vida. Usa la variable de entorno `JWT_REFRESH_EXPIRE` o expira en **30 días** (`'30d'`) por defecto.

## Seguridad y Claves (Secret)

Para que el token se firme (`jwt.sign`), el sistema lee la clave secreta principal desde:
1. La variable de entorno `process.env.JWT_SECRET`.
2. O bien, un valor por defecto inseguro (`'your_secret_key'`) si la variable de entorno no está configurada (esto **nunca** debe ocurrir en producción).

```javascript
// Ejemplo de la función core que firma el token en utils/jwt.js
const generateToken = (payload, expiresIn = config.jwt.expire) => {
    return jwt.sign(payload, config.jwt.secret, { expiresIn });
};
```

## Flujo de Invocación
Cuando un usuario hace login exitoso en `auth.controller.js`, el controlador importa `generateAccessToken` y `generateRefreshToken` desde `utils/jwt.js`, genera ambos tokens y los devuelve al cliente en la respuesta JSON o a través de cookies HTTP-Only.
