# Configuración de JWT - Ejemplos

## 📋 Formato de Tiempo Soportado

El sistema acepta formatos flexibles para todos los tiempos de expiración:

- **`s`** - Segundos (ejemplo: `30s` = 30 segundos)
- **`m`** - Minutos (ejemplo: `5m` = 5 minutos)
- **`h`** - Horas (ejemplo: `2h` = 2 horas)
- **`d`** - Días (ejemplo: `30d` = 30 días)

## 🔧 Configuraciones Recomendadas

### Para Desarrollo/Testing

```env
# Access Token - Corto para testing rápido
JWT_ACCESS_EXPIRE=30s

# Refresh Token - Moderado para no tener que regenerar constantemente
JWT_REFRESH_EXPIRE=1h

# Inactividad - Corto para testear la lógica de expiración
JWT_REFRESH_INACTIVITY=5m
```

### Para Staging

```env
# Access Token - Balance entre seguridad y UX
JWT_ACCESS_EXPIRE=15m

# Refresh Token - Una semana
JWT_REFRESH_EXPIRE=7d

# Inactividad - Dos días
JWT_REFRESH_INACTIVITY=2d
```

### Para Producción

```env
# Access Token - Seguridad óptima
JWT_ACCESS_EXPIRE=5m

# Refresh Token - Conveniencia de usuario (30 días)
JWT_REFRESH_EXPIRE=30d

# Inactividad - 10 días sin uso = token inválido
JWT_REFRESH_INACTIVITY=10d
```

## 🧪 Ejemplos de Testing

### Test de Expiración Rápida

```env
JWT_ACCESS_EXPIRE=10s
JWT_REFRESH_EXPIRE=1m
JWT_REFRESH_INACTIVITY=30s
```

Con esta configuración:
- Access token expira en 10 segundos
- Refresh token expira en 1 minuto
- Si no se usa el refresh token por 30 segundos, se invalida

### Test de Tokens de Larga Duración

```env
JWT_ACCESS_EXPIRE=1h
JWT_REFRESH_EXPIRE=7d
JWT_REFRESH_INACTIVITY=1d
```

### Test de Alta Seguridad

```env
JWT_ACCESS_EXPIRE=1m
JWT_REFRESH_EXPIRE=5m
JWT_REFRESH_INACTIVITY=2m
```

## ⚠️ Consideraciones Importantes

1. **Access Token**: Debe ser corto (5-15 minutos en producción) para minimizar ventana de exposición si es comprometido.

2. **Refresh Token**: Puede ser más largo (7-30 días) pero debe estar en base de datos para permitir revocación.

3. **Inactividad**: Debe ser menor que la expiración del refresh token. Ejemplo válido:
   - ✅ `JWT_REFRESH_EXPIRE=30d` y `JWT_REFRESH_INACTIVITY=10d`
   - ❌ `JWT_REFRESH_EXPIRE=7d` y `JWT_REFRESH_INACTIVITY=10d` (no tiene sentido)

4. **Testing**: Para tests rápidos, usa segundos o minutos. Para tests de integración E2E, usa tiempos más realistas.

## 🔄 Flujo de Tokens

```
1. Login → Recibe accessToken (ej: 5m)

2. Obtener refreshToken → POST /api/auth/refresh-token
   → Recibe refreshToken (ej: 30d) con inactividad (ej: 10d)

3. AccessToken expira → POST /api/auth/refresh
   → Recibe nuevo accessToken (5m)
   → Se actualiza last_used_at del refreshToken

4. Si no se usa el refreshToken por 10d:
   → refreshToken se invalida automáticamente
   → Usuario debe hacer login nuevamente
```

## 📊 Tabla de Conversión Rápida

| Formato | Equivalencia |
|---------|--------------|
| `30s`   | 30 segundos  |
| `5m`    | 5 minutos    |
| `15m`   | 15 minutos   |
| `1h`    | 1 hora       |
| `2h`    | 2 horas      |
| `1d`    | 1 día (24h)  |
| `7d`    | 7 días       |
| `30d`   | 30 días      |

## 🛠️ Validación

Si usas un formato incorrecto, recibirás un error:

```javascript
// ✅ Válidos
'5m'
'30s'
'2h'
'7d'

// ❌ Inválidos
'5minutes'  // debe ser '5m'
'5 m'       // sin espacios
'5x'        // unidad no válida
'5'         // debe incluir unidad
```
