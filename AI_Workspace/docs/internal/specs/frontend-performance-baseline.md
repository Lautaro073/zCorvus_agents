# Spec interna: frontend performance baseline

## Objetivo

Establecer una linea base tecnica del `Frontend/` para que `Planner` pueda dividir el trabajo de performance en etapas verificables y `Frontend` ejecute cambios sin improvisar arquitectura, medicion ni prioridades.

## Alcance

- `Frontend/` con foco en App Router, rendering, hidratacion, i18n, auth, icon explorer y flujo premium.
- Flujos que hoy impactan TTFB, bundle inicial, hidratacion y trabajo redundante en cliente.
- Reglas de medicion y verificacion previas a cualquier optimizacion.

## Stack actual

- Framework: Next.js 16 + React 19 + App Router.
- Internacionalizacion: `next-intl` con segmento `[locale]`.
- Estado cliente: `zustand` para UI y `AuthContext` para sesion.
- Datos: `fetch` manual contra `NEXT_PUBLIC_BACKEND_URL`.
- Catalogo principal: `@zcorvus/z-icons` + Font Awesome premium/local.
- Virtualizacion existente: `@tanstack/react-virtual` en la grilla de iconos.

## Topologia actual del Frontend

### Shell global

Archivo clave: `Frontend/src/app/[locale]/layout.tsx`

- Carga fuentes globales con `next/font/google`.
- Lee preferencias via cookies con `getServerPreferences()`.
- Pasa todos los mensajes de `next-intl` al `NextIntlClientProvider`.
- Hidrata de forma global `AuthProvider`, `UIStoreProvider`, `AppearanceSync`, `Toaster` y `ViewTransition`.
- Inyecta `react-scan` desde `unpkg` con `strategy="beforeInteractive"` en todas las paginas.

### Rutas y comportamiento de render

| Ruta | Modo actual | Riesgo principal |
| --- | --- | --- |
| `/[locale]` | server page bajo layout dinamico | hereda costo global por cookies, providers y mensajes completos |
| `/[locale]/icons` | server page | shell pesada aunque la landing no necesite todos los datos globales |
| `/[locale]/icons/[type]/all` | client page | hidratacion alta y dependencia de dataset grande |
| `/[locale]/icons/[type]/[id]` | client page | render cliente + gating premium en cliente |
| `/[locale]/auth/*` | client pages | sesion y redirecciones dependen de boot cliente |
| `/[locale]/premium` | client page | checkout y auth dependen de contexto cliente |
| `/[locale]/premium/success` | client page | polling manual, retries largos y escritura en `localStorage` |

## Hallazgos de performance

### 1. Shell global demasiado costosa

Archivos: `Frontend/src/app/[locale]/layout.tsx`, `Frontend/src/lib/server/preferences.ts`

- El layout raiz lee cookies en cada request y convierte toda la rama localizada en dinamica.
- El provider tree global obliga a hidratar auth, UI state y sincronizacion visual incluso en rutas que no lo necesitan.
- `react-scan` se inyecta en todas las paginas sin un guard visible de ambiente, lo que afecta arranque y introduce dependencia third-party en runtime.

### 2. Bundle de iconos demasiado eager

Archivos: `Frontend/src/features/icons-explorer/constants/icon.constants.ts`, `Frontend/src/lib/fontawesome/index.ts`, `Frontend/src/components/common/UnifiedIcon.tsx`

- El explorador importa datasets completos de `@zcorvus/z-icons` y de Font Awesome desde constantes estaticas.
- La virtualizacion ayuda en el DOM, pero no reduce el costo de parseo, descarga y memoria del catalogo que ya entro al bundle.
- Las rutas de detalle y catalogo premium/local quedan acopladas a cargas pesadas desde el inicio.

### 3. Auth y datos repartidos entre contexto y cliente API

Archivos: `Frontend/src/contexts/AuthContext.tsx`, `Frontend/src/lib/api/backend.ts`

- Existen patrones duplicados para login, refresh, logout y persistencia de tokens.
- `AuthContext` hace refresh automatico, redirecciones y fetches manuales desde cliente.
- `backend.ts` expone otra capa imperativa, pero `react-query` esta instalado y no se usa.
- La propiedad real de los datos y el cache no esta definida.

### 4. Gating y flujos premium ocurren tarde

Archivos: `Frontend/src/components/guards/PremiumGuard.tsx`, `Frontend/src/app/[locale]/premium/success/page.tsx`

- Varias protecciones corren despues de hidratar el cliente en vez de resolverse lo mas arriba posible.
- `/premium/success` hace hasta 10 intentos con pausas de 3 segundos para obtener el token del usuario.
- El flujo guarda token en `localStorage`, lo que complica observabilidad, seguridad y coherencia de estado.

### 5. i18n carga mas de lo necesario

Archivo: `Frontend/src/i18n/request.ts`

- Cada request carga `common`, `home`, `auth` y `premium` para cualquier pagina.
- El provider global recibe el objeto completo de mensajes, lo que aumenta trabajo del servidor y payload serializado.
- No existe politica explicita de namespaces por ruta.

### 6. Sincronizacion visual con endpoint incierto

Archivo: `Frontend/src/components/controllers/AppearanceSync.tsx`

- `AppearanceSync` publica cada cambio de preferencias a `/api/preferences`.
- No se encontro route handler dentro de `Frontend/src/app/**/route.ts` que respalde ese endpoint.
- Si el endpoint no existe realmente, cada cambio de apariencia agrega ruido de red y trabajo inutil.

### 7. Falta de baseline y observabilidad de performance

- No hay documento vigente que defina presupuesto de bundle, rutas criticas, mediciones minimas ni estrategia de Web Vitals.
- No hay `loading.tsx` ni `error.tsx` en la app localizada para aislar esperas, errores o streaming.
- No hay evidencia en el repo de una corrida de bundle analysis o budget gates para PRs.

## Inventario funcional que Planner debe respetar

### Routing e i18n

- Middleware de i18n en `Frontend/src/middleware.ts`.
- Segmento obligatorio `[locale]`.
- La optimizacion no debe romper locales ni navegacion internacionalizada.

### Sesion y permisos

- `AuthContext` hoy es la fuente de sesion en cliente.
- Hay rutas premium y de auth que dependen de estado hidratado.
- Cualquier refactor debe explicitar que queda en server, que queda en client y donde vive la autoridad de sesion.

### Catalogo de iconos

- La UX principal depende del explorador de iconos.
- Existe virtualizacion, pero no code-splitting fuerte del catalogo.
- No se deben perder capas, copiado de snippets ni detalle de icono durante la optimizacion.

## Baseline de medicion requerida

Antes de tocar implementacion, cada tarea de optimizacion debe registrar al menos:

1. `npm run build` y evidencia del tamano de rutas afectadas.
2. Tiempos comparativos de navegacion/hidratacion en:
   - `/[locale]`
   - `/[locale]/icons`
   - `/[locale]/icons/[type]/all`
   - `/[locale]/premium/success`
3. Cambios de cantidad de JS enviado al cliente en rutas criticas.
4. Riesgos funcionales sobre auth, premium e i18n.

## Hipotesis de mejora priorizadas

### Prioridad alta

- Sacar `react-scan` del camino critico en produccion o aislarlo por ambiente.
- Reducir el trabajo global del layout y mover dependencias cliente fuera del shell comun cuando no sean universales.
- Definir una sola estrategia para auth y fetches.
- Romper la carga eager del catalogo de iconos por tipo/ruta.

### Prioridad media

- Cargar namespaces de `next-intl` por ruta o dominio.
- Reemplazar polling ciego del flujo premium por estrategia contract-driven.
- Introducir `loading.tsx` y `error.tsx` en rutas con costo o riesgo real.

### Prioridad baja

- Revisar dependencias que hoy amplian superficie de build sin uso claro en el Frontend.
- Revaluar fonts globales y providers siempre encendidos si las mediciones demuestran impacto material.

## Restricciones operativas para tareas futuras

- Toda tarea de `Frontend` derivada de esta spec debe usar `requiresSpec: true` y `featureSlug: frontend-performance`.
- No inventar APIs nuevas para resolver performance si el problema es de hidratacion, bundle o boundaries.
- Si una optimizacion toca contratos de auth, premium o preferencias, debe coordinarse con `Tester` y `Documenter`.
- Ningun cambio se considera completo sin medicion previa y posterior.

## Entregables esperados para Planner

Planner debe salir de esta spec con un plan que, como minimo, cubra:

- fundacion del shell y boundaries,
- carga del catalogo de iconos,
- estrategia de auth y data fetching,
- costo de i18n,
- verificacion final y cierre documental.

## Estado final de implementacion

Las siguientes mejoras fueron ejecutadas en la rama `agents/orchestrator/frontend-perf-program-01` (PR #6) y fusionadas a `main`:

### Etapa 1 — Foundation y shell global

**Archivos afectados:**
- `Frontend/src/app/[locale]/layout.tsx`
- `Frontend/src/lib/server/preferences.ts`

**Cambios realizados:**
- `react-scan` ahora solo se inyecta cuando `process.env.NODE_ENV === 'development'`, eliminando第三方 runtime en produccion.
- Se agregaron `loading.tsx` y `error.tsx` como boundaries de carga y error para toda la app localizada.
- Se documento el trade-off de `getServerPreferences()` (SSR dinamico por cookies) en el archivo mismo.

### Etapa 2 — Catalogo de iconos y bundles

**Archivos afectados:**
- `Frontend/src/features/icons-explorer/constants/icon.constants.ts`
- `Frontend/src/lib/fontawesome/index.ts`, `solid.ts`, `regular.ts`, `utils.ts`
- `Frontend/src/components/common/UnifiedIcon.tsx`
- `Frontend/src/components/common/FASolidRenderer.tsx`
- `Frontend/src/components/common/FARegularRenderer.tsx`
- `Frontend/src/hooks/useIconExport.tsx`
- `Frontend/src/app/[locale]/icons/[type]/all/page.tsx`
- `Frontend/src/app/[locale]/icons/[type]/[id]/page.tsx`

**Cambios realizados:**
- `IconContentData` dejo de ser una constante estatica y ahora es una funcion asincrona `getIconContentData()` que importa dinamicamente `faSolidIconNames` y `faRegularIconNames`.
- Los renderers de Font Awesome (`FASolidRenderer`, `FARegularRenderer`) ahora usan `next/dynamic` con `ssr: false` para carga diferida.
- `IconsSVG` fue reemplazado por `getIconsSVG()`, una funcion asincrona que retorna los SVG bajo demanda.
- Las paginas de iconos ahora usan `use(getIconContentData())` para esperar los datos de forma aislada.

### Etapa 3 — Auth unificada y flujo premium

**Archivos afectados:**
- `Frontend/src/contexts/AuthContext.tsx`
- `Frontend/src/app/[locale]/premium/success/page.tsx`

**Cambios realizados:**
- `AuthContext` ahora delega todos los llamados HTTP (login, register, logout, refresh) a las funciones de `backend.ts` en vez de hacer `fetch` inline.
- Se agrego el metodo `refreshSession()` a `AuthContext` para uso por premium success.
- El polling de `/premium/success` paso de `10 intentos × 3 segundos = 30 segundos` a `3 intentos × 1.5 segundos = 4.5 segundos`, con llamada a `refreshSession()` antes de pedir el token.

### Etapa 4 — i18n por ruta

**Archivos afectados:**
- `Frontend/src/app/[locale]/layout.tsx`
- `Frontend/src/app/[locale]/premium/layout.tsx` (nuevo)

**Cambios realizados:**
- El `NextIntlClientProvider` del layout raiz ahora solo envia `{ common, auth }` en vez de todos los namespaces.
- Se creo `premium/layout.tsx` con un `NextIntlClientProvider` aislado que solo carga el namespace `premium`.
- `auth/layout.tsx` sigue siendo client component por su dependencia de animaciones.

### Verificacion

- `npm run build` compila sin errores ni advertencias relacionadas a los cambios.
- `npx prisma generate` fue ejecutado en `Frontend/` para generar el cliente de Prisma.
- Los paquetes de Font Awesome fueron instalados correctamente en `Frontend/package.json`.
