# 🔐 Flujo de Tokens - Guía para Frontend

## 📌 Tipos de Tokens

### Access Token (JWT)
- ⏱️ **Duración**: 5 minutos
- 📦 **Uso**: Autenticar cada petición a la API
- 💾 **Almacenamiento**: Estado global (Context/Redux) - NO localStorage
- 🔄 **Renovación**: Usar refresh token

### Refresh Token
- ⏱️ **Duración**: 30 días desde creación
- ⚠️ **Inactividad**: Se elimina si no se usa por 10 días consecutivos
- 📦 **Uso**: Obtener nuevos access tokens
- 💾 **Almacenamiento**: localStorage o httpOnly cookie
- 🔄 **Renovación**: Cada vez que se usa, se actualiza `last_used_at`

---

## 🚀 Flujo Completo de Autenticación

### 1️⃣ Login/Register

```javascript
// Login o Register
const response = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { data } = await response.json();

// ✅ Guardar access token en estado (NO en localStorage)
setAccessToken(data.accessToken); // Context/Redux

// ❌ NO guardes el access token en localStorage
// localStorage.setItem('accessToken', data.accessToken); // MAL ❌
```

---

### 2️⃣ Obtener Refresh Token (Inmediatamente después de login)

```javascript
// IMPORTANTE: Llamar justo después de login/register
const refreshResponse = await fetch('http://localhost:3001/api/auth/refresh-token', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

const { data: refreshData } = await refreshResponse.json();

// ✅ Guardar refresh token en localStorage
localStorage.setItem('refreshToken', refreshData.refreshToken);
localStorage.setItem('refreshTokenExpiry', refreshData.expiresAt);
```

---

### 3️⃣ Hacer Peticiones Autenticadas

```javascript
const fetchProtectedData = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/users/profile', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.status === 401) {
      // Token expirado, intentar refrescar
      await refreshAccessToken();
      // Reintentar petición
      return fetchProtectedData();
    }

    return await response.json();
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

### 4️⃣ Refrescar Access Token

**Opción A: Refrescar automáticamente cada 4 minutos**

```javascript
// useEffect en tu AuthContext/Provider
useEffect(() => {
  if (!accessToken) return;

  // Refrescar cada 4 minutos (antes de que expire a los 5)
  const interval = setInterval(async () => {
    await refreshAccessToken();
  }, 4 * 60 * 1000); // 4 minutos

  return () => clearInterval(interval);
}, [accessToken]);
```

**Opción B: Refrescar solo cuando falle una petición (401)**

```javascript
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!refreshToken) {
    // No hay refresh token, redirigir a login
    logout();
    return;
  }

  try {
    const response = await fetch('http://localhost:3001/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      // Refresh token inválido/expirado
      logout();
      return;
    }

    const { data } = await response.json();
    
    // ✅ Actualizar access token en estado
    setAccessToken(data.accessToken);
    
    return data.accessToken;
  } catch (error) {
    console.error('Refresh error:', error);
    logout();
  }
};
```

---

### 5️⃣ Logout

```javascript
const logout = async () => {
  try {
    // Llamar al endpoint de logout
    await fetch('http://localhost:3001/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // ✅ Limpiar TODO
    setAccessToken(null);
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('refreshTokenExpiry');
    // Redirigir a login
    navigate('/login');
  }
};
```

---

## 💡 Implementación Recomendada con Context

```javascript
// AuthContext.tsx
import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);

  // Auto-refresh cada 4 minutos
  useEffect(() => {
    if (!accessToken) return;

    const interval = setInterval(async () => {
      const newToken = await refreshAccessToken();
      if (newToken) setAccessToken(newToken);
    }, 4 * 60 * 1000);

    return () => clearInterval(interval);
  }, [accessToken]);

  // Restaurar sesión al cargar la app
  useEffect(() => {
    const restoreSession = async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          setAccessToken(newToken);
          await fetchUserProfile(newToken);
        }
      }
    };
    restoreSession();
  }, []);

  const login = async (email, password) => {
    // 1. Login
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const { data } = await loginRes.json();
    
    setAccessToken(data.accessToken);
    setUser(data.user);

    // 2. Obtener refresh token
    const refreshRes = await fetch('http://localhost:3001/api/auth/refresh-token', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${data.accessToken}` }
    });
    const refreshData = await refreshRes.json();
    localStorage.setItem('refreshToken', refreshData.data.refreshToken);
  };

  const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    try {
      const res = await fetch('http://localhost:3001/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!res.ok) {
        logout();
        return null;
      }

      const { data } = await res.json();
      return data.accessToken;
    } catch {
      logout();
      return null;
    }
  };

  const logout = async () => {
    if (accessToken) {
      await fetch('http://localhost:3001/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
    }
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem('refreshToken');
  };

  return (
    <AuthContext.Provider value={{ accessToken, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

---

## 🔧 Interceptor de Axios (Alternativa)

```javascript
// api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api'
});

// Request interceptor: agregar token
api.interceptors.request.use((config) => {
  const token = getAccessToken(); // Desde tu estado
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: refrescar si 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const newToken = await refreshAccessToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

## ⚠️ Errores Comunes

### ❌ ERROR 1: Guardar access token en localStorage
```javascript
// MAL ❌
localStorage.setItem('accessToken', accessToken);
```
**Por qué**: El access token expira cada 5 minutos. Si lo guardas en localStorage, cuando el usuario recargue la página después de 5 minutos, el token estará expirado.

**Solución**: Guardar solo refresh token en localStorage y access token en estado.

---

### ❌ ERROR 2: No refrescar el access token
```javascript
// MAL ❌ - Hacer peticiones sin refrescar
fetch('/api/users/profile', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```
**Por qué**: Después de 5 minutos, empezarás a recibir errores 401.

**Solución**: Implementar auto-refresh cada 4 minutos O manejar 401 y refrescar.

---

### ❌ ERROR 3: No obtener refresh token después de login
```javascript
// MAL ❌ - Solo hacer login
const { data } = await loginAPI(email, password);
setAccessToken(data.accessToken);
// Falta obtener refresh token!
```

**Solución**: Siempre llamar a `/api/auth/refresh-token` después de login/register.

---

### ❌ ERROR 4: Refresh token no se usa por 10 días
**Por qué**: Si el usuario no visita la app por 10 días, su refresh token se elimina automáticamente.

**Solución**: Esto es intencional por seguridad. El usuario deberá hacer login nuevamente.

---

## ✅ Checklist de Implementación

- [ ] Access token guardado en estado (Context/Redux)
- [ ] Refresh token guardado en localStorage
- [ ] Llamar a `/api/auth/refresh-token` después de login/register
- [ ] Auto-refresh cada 4 minutos O manejo de 401
- [ ] Restaurar sesión al cargar app (usando refresh token)
- [ ] Limpiar tokens en logout
- [ ] Interceptor de peticiones para agregar token
- [ ] Interceptor de respuestas para manejar 401

---

## 🔍 Debugging

### Ver tokens en la consola:
```javascript
console.log('Access Token:', accessToken);
console.log('Refresh Token:', localStorage.getItem('refreshToken'));

// Decodificar JWT (sin validar)
const decoded = JSON.parse(atob(accessToken.split('.')[1]));
console.log('Token expira en:', new Date(decoded.exp * 1000));
```

### Verificar si el token expiró:
```javascript
const isTokenExpired = (token) => {
  const decoded = JSON.parse(atob(token.split('.')[1]));
  return decoded.exp * 1000 < Date.now();
};

console.log('Token expirado?', isTokenExpired(accessToken));
```

---

## 📚 Resumen

| Concepto | Access Token | Refresh Token |
|----------|--------------|---------------|
| **Duración** | 5 minutos | 30 días |
| **Inactividad** | N/A | 10 días |
| **Almacenamiento** | Estado (Context/Redux) | localStorage |
| **Uso** | Cada petición API | Obtener nuevos access tokens |
| **Renovación** | Cada 4 min o al recibir 401 | Solo al hacer login |

---

**Última actualización:** 6 de febrero de 2026
