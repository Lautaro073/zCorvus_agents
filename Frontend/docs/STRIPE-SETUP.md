# Sistema de Pago Premium con Stripe

Este documento describe cómo funciona el sistema de pagos premium en zCorvus, incluyendo la integración con Stripe y el backend.

## 📋 Flujo Completo

### 1. Usuario Intenta Acceder a Iconos Premium

- **Sin estar logueado**: El middleware redirige a `/auth/login?callbackUrl=/premium&reason=premium_required`
- **Logueado pero sin plan premium**: Puede ver la página pero se le invita a suscribirse

### 2. Usuario Visita `/premium`

La página muestra dos planes:
- **Pro Plan**: $29.99/mes
- **Enterprise Plan**: $49.99/mes (recomendado)

### 3. Usuario Hace Click en "Comenzar Plan"

1. Se llama a `POST /api/stripe/checkout`
2. Se crea una sesión de Stripe con:
   - Precio según el plan elegido
   - Metadata del usuario (id, email, name, sessionToken)
   - URLs de éxito y cancelación
3. Usuario es redirigido a Stripe Checkout

### 4. Usuario Completa el Pago en Stripe

1. Stripe procesa el pago
2. Stripe llama al webhook `POST /api/stripe/webhook`
3. El webhook:
   - Verifica la firma de Stripe
   - Crea el usuario en el backend (si no existe)
   - Genera un token npm premium
   - Crea el registro del token en el backend
   - Asigna el token al usuario
   - El backend automáticamente actualiza el rol del usuario a `pro` (roleId = 3)

### 5. Usuario es Redirigido a `/premium/success`

La página:
- Espera 3 segundos para que el webhook procese
- Consulta el token del usuario desde el backend
- Muestra el token npm
- Ofrece botón para copiar el token
- Muestra instrucciones de configuración

## 🔧 Configuración Requerida

### Variables de Entorno

Agrega estas variables a tu archivo `.env.local`:

```env
# Backend API
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### Obtener las Claves de Stripe

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copia `Publishable key` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
3. Copia `Secret key` → `STRIPE_SECRET_KEY`

### Configurar Webhook de Stripe

1. Ve a [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click en "Add endpoint"
3. URL del endpoint: `https://tu-dominio.com/api/stripe/webhook`
4. Selecciona estos eventos:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
5. Copia el `Signing secret` → `STRIPE_WEBHOOK_SECRET`

**Para desarrollo local**, usa Stripe CLI:

```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

Esto te dará un webhook secret temporal.

## 🏗️ Arquitectura del Sistema

### Frontend (Next.js)

```
src/
├── app/
│   ├── api/
│   │   ├── stripe/
│   │   │   ├── checkout/route.ts    # Crear sesión de pago
│   │   │   └── webhook/route.ts     # Procesar eventos de Stripe
│   │   └── tokens/
│   │       └── npmrc/route.ts       # Descargar archivo .npmrc
│   └── [locale]/
│       └── premium/
│           ├── page.tsx              # Página de planes
│           ├── success/page.tsx      # Pago exitoso
│           └── cancel/page.tsx       # Pago cancelado
├── lib/
│   └── api/
│       └── backend.ts                # Cliente API del backend
└── middleware.ts                     # Protección de rutas premium
```

### Backend (Express)

Según el README del backend, las rutas son:

- `POST /api/users` - Crear usuario
- `GET /api/users/me` - Obtener perfil actual
- `POST /api/tokens` - Crear token premium (Admin)
- `GET /api/tokens/me` - Obtener mi token
- `POST /api/users/:userId/assign-token` - Asignar token a usuario

## 🔐 Sistema de Roles

El backend gestiona automáticamente los roles:

- `roleId = 1` → Admin
- `roleId = 2` → User (por defecto)
- `roleId = 3` → Pro (con token activo)

**Auto-gestión**: Cada vez que un usuario hace una petición, el backend verifica:
- Si tiene `tokenIconsId` apuntando a un token válido → Upgrade a `pro`
- Si el token expiró o no existe → Downgrade a `user`

## 📦 Uso del Token NPM

Una vez que el usuario tiene su token, puede:

### Opción 1: Archivo .npmrc (Recomendado)

Crear `.npmrc` en la raíz del proyecto:

```
@zcorvus:registry=https://registry.npmjs.org/
//registry.npmjs.org/:_authToken=npm_xxxxxxxxxxxxx
```

### Opción 2: Descargar desde la Aplicación

El usuario puede descargar el archivo directamente desde:
```
GET /api/tokens/npmrc
```

Esto descarga un archivo `.npmrc` pre-configurado.

### Instalar Paquetes Premium

```bash
npm install @zcorvus/z-icons-premium
# o
pnpm add @zcorvus/z-icons-premium
```

## 🧪 Testing en Desarrollo

### Tarjetas de Prueba de Stripe

- **Éxito**: `4242 4242 4242 4242`
- **Fallo**: `4000 0000 0000 0002`
- Fecha: Cualquier fecha futura
- CVC: Cualquier 3 dígitos
- ZIP: Cualquier 5 dígitos

### Probar el Flujo Completo

1. Inicia el servidor de desarrollo:
   ```bash
   pnpm dev
   ```

2. Inicia el backend:
   ```bash
   cd Backend
   npm start
   ```

3. Inicia el webhook de Stripe:
   ```bash
   stripe listen --forward-to localhost:3001/api/stripe/webhook
   ```

4. Navega a `http://localhost:3001/premium`
5. Haz click en un plan
6. Usa la tarjeta de prueba `4242 4242 4242 4242`
7. Completa el pago
8. Verifica que te redirija a `/premium/success` con el token

## 🔍 Debugging

### Ver Logs del Webhook

El webhook imprime logs en la consola del servidor Next.js:
```
Payment successful for user: uuid-1234
Premium token created and assigned: token-uuid
```

### Verificar en Stripe Dashboard

1. Ve a [Stripe Payments](https://dashboard.stripe.com/test/payments)
2. Verifica que el pago aparezca
3. Ve a [Webhooks](https://dashboard.stripe.com/test/webhooks)
4. Verifica que el evento `checkout.session.completed` se haya enviado

### Verificar en el Backend

Consulta la base de datos del backend:

```sql
-- Ver usuarios con tokens
SELECT 
  u.id, 
  u.email, 
  u.roleId,
  t.token,
  t.finishDate
FROM user u
LEFT JOIN token_icons t ON u.tokenIconsId = t.id;
```

## 📝 Notas Importantes

1. **Webhook Signature**: El webhook verifica la firma de Stripe para prevenir ataques. Nunca expongas el `STRIPE_WEBHOOK_SECRET`.

2. **Session Token**: El middleware de Better Auth usa cookies. El token de sesión se obtiene con `auth.getSession()`.

3. **Token Expiration**: El backend verifica automáticamente la expiración del token en cada request. No necesitas implementar lógica adicional.

4. **NPM Token Format**: Los tokens npm generados tienen el formato `npm_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

5. **Production**: En producción, asegúrate de:
   - Usar claves de Stripe de producción (`pk_live_*` y `sk_live_*`)
   - Configurar el webhook en Stripe con la URL de producción
   - Usar HTTPS para todas las comunicaciones

## 🚀 Próximos Pasos

- [ ] Agregar botón de "Descargar .npmrc" en la página de éxito
- [ ] Implementar verificación de rol premium en el middleware
- [ ] Agregar página de gestión de suscripción
- [ ] Implementar cancelación de suscripción
- [ ] Agregar email de confirmación después del pago
- [ ] Crear panel de admin para gestionar usuarios y tokens

## 🆘 Troubleshooting

### Error: "No signature found"
El webhook no está recibiendo la firma de Stripe. Verifica que estés usando Stripe CLI o que el webhook esté configurado correctamente en producción.

### Error: "Missing metadata"
La sesión de checkout no tiene la metadata del usuario. Verifica que el usuario esté logueado antes de crear la sesión.

### Error: "Failed to create premium token in backend"
El backend no pudo crear el token. Verifica:
- Que el backend esté corriendo
- Que la URL del backend sea correcta (`NEXT_PUBLIC_BACKEND_URL`)
- Que el sessionToken sea válido

### Token no aparece después del pago
Espera unos segundos más. El webhook puede tardar hasta 10 segundos en procesarse. Si persiste:
1. Verifica los logs del servidor Next.js
2. Verifica los logs del backend
3. Consulta la base de datos para ver si el token se creó
