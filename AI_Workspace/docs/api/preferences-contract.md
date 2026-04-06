# Preferences API Contract

**Base URL:** `/api/preferences`

---

## Overview

API para persistencia de preferencias de usuario (theme, iconSet, layer) mediante cookies. Permite que las preferencias persistan entre sesiones y sean accesibles desde el servidor (SSR).

---

## Cookie: `user_prefs`

| Attribute | Type | Description |
|-----------|------|-------------|
| `theme` | `"dark" \| "light"` | Tema visual de la aplicación |
| `iconSet` | `"neo" \| "core" \| "mina" \| "fa-solid" \| "fa-regular"` | Conjunto de iconos activo |
| `layer` | `"compact" \| "expanded"` | Modo de visualización de iconos |

**Default Values:**

```json
{
  "theme": "light",
  "iconSet": "core",
  "layer": "expanded"
}
```

**Cookie Options:**

- `httpOnly: false` - Accesible desde cliente (JavaScript)
- `secure: true` en producción
- `sameSite: "lax"`
- `maxAge: 31536000` (1 año)
- `path: "/"`

---

## Endpoints

### GET /api/preferences

Retorna las preferencias actuales del usuario.

**Response:**

```json
{
  "theme": "dark",
  "iconSet": "neo",
  "layer": "compact"
}
```

**Status Codes:**
- `200` - Preferences retrieved successfully
- `500` - Server error

---

### POST /api/preferences

Guarda las preferencias del usuario. Los valores inválidos se reemplazan con defaults.

**Request Body:**

```json
{
  "theme": "dark",
  "iconSet": "neo",
  "layer": "compact"
}
```

**Response:**

```json
{
  "theme": "dark",
  "iconSet": "neo",
  "layer": "compact"
}
```

**Status Codes:**
- `200` - Preferences saved successfully
- `500` - Server error

---

## SSR Compatibility

### Server-Side Reading

```typescript
// src/lib/server/preferences.ts
import { cookies } from "next/header";

export async function getServerPreferences() {
  const cookieStore = await cookies();
  const prefs = JSON.parse(cookieStore.get("user_prefs")?.value || "{}");
  return prefs;
}
```

### Client-Side Writing

```typescript
// src/components/controllers/AppearanceSync.tsx
const AppearanceSync = () => {
  const store = useUIStoreApi();

  useEffect(() => {
    const unsub = store.subscribe(
      (state) => ({
        iconSet: state.iconSet,
        layer: state.layer,
        theme: state.theme,
      }),
      async (prefs) => {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(prefs.theme);
        await fetch("/api/preferences", {
          method: "POST",
          body: JSON.stringify(prefs),
          headers: { "Content-Type": "application/json" },
        });
      },
      { equalityFn: shallow }
    );
    return () => unsub();
  }, [store]);

  return null;
};
```

---

## TypeScript Types

```typescript
export type UserPreferences = {
  theme: "dark" | "light";
  iconSet: "neo" | "core" | "mina" | "fa-solid" | "fa-regular";
  layer: "compact" | "expanded";
};
```

---

## Backward Compatibility

Esta API es backward-compatible:
- Valores inválidos se reemplazan con defaults seguros
- Si la cookie no existe, retorna defaults
- No rompe el flujo existente de AppearanceSync
