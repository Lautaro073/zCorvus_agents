# 📄 zCorvus Icons - Información del Proyecto
## Documento Base para IA de Backend

---

## 📍 Información Institucional

**Universidad**: Universidad Tecnológica Nacional – Facultad Regional Tucumán  
**Carrera**: Tecnicatura Universitaria en Programación  
**Año**: 2025  
**Ubicación**: Tucumán, Argentina

---

## 1️⃣ Datos Generales del Proyecto

### Nombre del Proyecto
**zCorvus Icons** - Sistema de Iconos Premium con Gestión de Tokens NPM

### Descripción General
Sistema web completo que proporciona acceso a bibliotecas de iconos premium mediante un modelo de suscripción. Los usuarios pueden registrarse, adquirir planes premium mediante Stripe, y obtener tokens NPM personalizados para instalar paquetes de iconos privados en sus proyectos.

---

## 2️⃣ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    SISTEMA COMPLETO                      │
├──────────────────────┬──────────────────────────────────┤
│    FRONTEND          │         BACKEND                  │
│    (Next.js 16)      │         (Express.js)             │
│    Puerto: 3000      │         Puerto: 3001             │
├──────────────────────┴──────────────────────────────────┤
│                                                          │
│  Autenticación JWT (Cookies + Access/Refresh Tokens)    │
│  Integración Stripe (Checkout + Webhooks)               │
│  Base de Datos: Turso (LibSQL)                          │
│  Gestión de Tokens NPM Personalizados                   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 3️⃣ Resumen Ejecutivo

### Breve Descripción
zCorvus Icons es una plataforma web fullstack que democratiza el acceso a bibliotecas de iconos profesionales mediante un modelo freemium. El sistema integra autenticación segura, procesamiento de pagos con Stripe, y generación automática de tokens NPM para instalación de paquetes privados.

### Objetivos Principales
1. **Proporcionar acceso controlado** a bibliotecas de iconos premium
2. **Implementar sistema de autenticación seguro** con JWT y 2FA
3. **Integrar pagos recurrentes** mediante Stripe
4. **Generar tokens NPM automáticos** para usuarios premium
5. **Ofrecer experiencia multiidioma** (Español/Inglés)

### Metodología Utilizada
- **Desarrollo Ágil** con iteraciones incrementales
- **Arquitectura de Microservicios** (Frontend/Backend desacoplados)
- **API RESTful** con autenticación basada en tokens
- **Testing continuo** y validación de seguridad

### Resultados Esperados
- Plataforma funcional con autenticación segura
- Procesamiento automatizado de pagos
- Generación dinámica de tokens NPM
- Gestión de usuarios y roles (Admin, User, Premium)
- Sistema escalable y mantenible

### Conclusiones Generales
El proyecto demuestra la capacidad de integrar múltiples tecnologías modernas (Next.js, Express, Turso, Stripe) en una solución cohesiva que resuelve un problema real del desarrollo web: la distribución controlada de recursos premium.

---

## 4️⃣ Introducción

### Contexto y Antecedentes
En el desarrollo web moderno, las bibliotecas de iconos (Font Awesome, Material Icons, etc.) son esenciales para crear interfaces atractivas. Sin embargo, muchas bibliotecas premium tienen modelos de licenciamiento complejos que dificultan su uso en proyectos.

### Justificación
- **Necesidad de control de acceso**: Los iconos premium deben estar protegidos
- **Simplicidad para desarrolladores**: Instalación vía NPM como cualquier paquete
- **Monetización justa**: Pago único o suscripción para acceso ilimitado
- **Gestión centralizada**: Un solo token NPM por usuario premium

### Objetivos Generales
Crear una plataforma completa que permita la **distribución segura y controlada** de bibliotecas de iconos premium mediante tokens NPM personalizados.

### Objetivos Específicos

#### Frontend (Next.js 16)
- ✅ Interfaz responsive con i18n (ES/EN)
- ✅ Sistema de autenticación con AuthContext
- ✅ Integración con Stripe Checkout
- ✅ Explorador de iconos con filtros y búsqueda
- ✅ Panel de usuario con gestión de perfil y tokens
- ✅ Protección de rutas premium con guards

#### Backend (Express.js) - [INFORMACIÓN PARA LA OTRA IA]
- [ ] API RESTful con endpoints de autenticación
- [ ] Gestión de usuarios y roles en Turso DB
- [ ] Integración con Stripe (Checkout + Webhooks)
- [ ] Generación de tokens NPM únicos por usuario
- [ ] Sistema de refresh tokens para seguridad
- [ ] Middleware de autorización JWT
- [ ] Webhooks para eventos de Stripe
- [ ] Gestión de preferencias de usuario

---

## 5️⃣ Estado del Arte

### Análisis de Soluciones Existentes

#### 1. Font Awesome Pro
- **Modelo**: Licencia anual ($99-$499/año)
- **Distribución**: Tokens NPM por proyecto
- **Limitación**: Un token por proyecto, no por usuario

#### 2. Icons8
- **Modelo**: Suscripción mensual
- **Distribución**: Descarga directa (PNG, SVG)
- **Limitación**: No integración con package managers

#### 3. Iconfinder
- **Modelo**: Pago por ícono o suscripción
- **Distribución**: Descarga manual
- **Limitación**: No automatización

### Ventajas de zCorvus Icons

| Característica | zCorvus | Font Awesome | Icons8 | Iconfinder |
|----------------|---------|--------------|--------|------------|
| Token NPM único por usuario | ✅ | ❌ | ❌ | ❌ |
| Instalación vía NPM | ✅ | ✅ | ❌ | ❌ |
| Interfaz web integrada | ✅ | ⚠️ | ✅ | ✅ |
| Autenticación JWT | ✅ | ⚠️ | ⚠️ | ⚠️ |
| API RESTful pública | ✅ | ❌ | ⚠️ | ⚠️ |
| Múltiples bibliotecas | ✅ | ❌ | ❌ | ❌ |
| 2FA | ✅ | ❌ | ❌ | ❌ |

### Innovación Propuesta
zCorvus Icons **unifica** la experiencia del usuario:
- **Un token** para todas las bibliotecas premium
- **Una interfaz** para buscar, previsualizar e instalar
- **Un pago** para acceso ilimitado

---

## 6️⃣ Descripción del Proyecto

### Problemática Detectada
1. **Complejidad en licenciamiento**: Cada biblioteca tiene su propio sistema
2. **Tokens múltiples**: Desarrolladores deben gestionar varios tokens NPM
3. **Falta de previsualización**: Difícil saber qué iconos incluye cada paquete
4. **Barreras de entrada**: Precios elevados para proyectos pequeños

### Solución Propuesta
Plataforma web que centraliza:
- **Autenticación única** para todas las bibliotecas
- **Token NPM unificado** por usuario premium
- **Explorador visual** de iconos antes de comprar
- **Modelo freemium** accesible

### Alcance del Proyecto

#### ✅ Incluido
- Sistema completo Frontend + Backend
- Autenticación JWT con refresh tokens
- Integración completa con Stripe
- Generación automática de tokens NPM
- Explorador de iconos con filtros
- Panel de usuario con estadísticas
- Internacionalización (ES/EN)
- Seguridad 2FA opcional

#### ❌ Fuera del Alcance (MVP)
- Editor de iconos personalizado
- Sistema de comentarios/reviews
- Aplicación móvil nativa
- Gestión de equipos/organizaciones
- Webhooks externos para integraciones

### Limitaciones
- **Escalabilidad inicial**: Optimizado para ~10,000 usuarios concurrentes
- **Bibliotecas de iconos**: Limitado a las bibliotecas pre-configuradas
- **Pagos**: Solo Stripe (no PayPal, criptomonedas, etc.)

---

## 7️⃣ Metodología

### Enfoque de Desarrollo
- **Metodología**: Desarrollo Ágil con Scrum adaptado
- **Arquitectura**: Cliente-Servidor desacoplado (SPA + API REST)
- **Versionado**: Git con Conventional Commits

### Tecnologías Utilizadas

#### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI**: React 19 + TypeScript
- **Estilos**: Tailwind CSS + shadcn/ui
- **Estado**: Zustand + Context API
- **i18n**: next-intl
- **Validación**: Zod
- **HTTP Client**: Fetch API nativo

#### Backend - [DATOS PARA LA OTRA IA]
- **Framework**: Express.js + TypeScript
- **Base de Datos**: Turso (LibSQL)
- **ORM**: Prisma
- **Autenticación**: JWT (jsonwebtoken)
- **Pagos**: Stripe SDK
- **Seguridad**: bcrypt, helmet, cors
- **Validación**: express-validator

#### DevOps
- **Hosting Frontend**: Vercel
- **Hosting Backend**: Railway / Render
- **Base de Datos**: Turso Cloud
- **CI/CD**: GitHub Actions (si aplica)

### Marco Teórico

#### Autenticación JWT
- **Access Token**: Corta duración (5 min)
- **Refresh Token**: Larga duración (30 días)
- **Almacenamiento**: HTTP-only cookies (refresh) + localStorage (access)

#### Arquitectura RESTful
- **Endpoints CRUD** para recursos (users, tokens, settings)
- **Status HTTP** semánticos (200, 201, 400, 401, 403, 500)
- **Versionado API**: `/api/v1/...` (preparado para futuro)

#### Stripe Webhooks
- **Events**: `checkout.session.completed`, `customer.subscription.deleted`
- **Validación**: Firma de eventos con secret key
- **Idempotencia**: Control de eventos duplicados

---

## 8️⃣ Recursos Necesarios

### Recursos Humanos

#### Desarrollador Frontend
- **Responsabilidades**:
  - Desarrollo de interfaz con Next.js
  - Integración con API backend
  - Implementación de diseño responsive
  - Testing de componentes

#### Desarrollador Backend - [ROL PARA LA OTRA IA]
- **Responsabilidades**:
  - Desarrollo de API REST
  - Integración con Turso DB
  - Implementación de autenticación JWT
  - Integración con Stripe
  - Generación de tokens NPM
  - Testing de endpoints

#### Tester / QA (opcional)
- **Responsabilidades**:
  - Pruebas funcionales
  - Validación de seguridad
  - Testing de integración Stripe

### Recursos Materiales

#### Hardware
- Computadora de desarrollo (mínimo 8GB RAM)
- Conexión a internet estable

#### Software
- Node.js v20+
- pnpm / npm
- VS Code / Editor de código
- Git
- Postman / Thunder Client (testing API)

#### Servicios Cloud
- **Turso**: Base de datos (Plan Free)
- **Stripe**: Procesamiento de pagos (Modo Test)
- **Vercel**: Hosting frontend (Plan Hobby)
- **Railway/Render**: Hosting backend (Plan Free)

#### Licencias
- Font Awesome (para desarrollo)
- Otras bibliotecas de iconos según disponibilidad

---

## 9️⃣ Plan de Trabajo

### Cronograma (8 Semanas)

#### Semana 1-2: Planificación y Setup
- ✅ Definición de requisitos
- ✅ Diseño de arquitectura
- ✅ Setup de repositorios Git
- ✅ Configuración de entornos de desarrollo
- ✅ Creación de schema de base de datos

#### Semana 3-4: Backend (API Core) - [FASE ACTUAL]
- [ ] Implementación de modelos Prisma
- [ ] Endpoints de autenticación (register, login, logout)
- [ ] Sistema de refresh tokens
- [ ] Middleware de autorización
- [ ] Endpoints de usuarios

#### Semana 5: Backend (Integraciones)
- [ ] Integración con Stripe Checkout
- [ ] Webhooks de Stripe
- [ ] Generación de tokens NPM
- [ ] Endpoints de tokens

#### Semana 6-7: Frontend
- ✅ Interfaces de autenticación
- ✅ Explorador de iconos
- ✅ Integración con Stripe Checkout
- ✅ Panel de usuario
- ✅ Protección de rutas premium

#### Semana 8: Testing e Integración
- [ ] Testing end-to-end
- [ ] Pruebas de seguridad
- [ ] Optimización de rendimiento
- [ ] Documentación final

### Entregables Parciales

#### Entregable 1 (Semana 2)
- Documento de arquitectura
- Diagramas ER de base de datos
- Setup de proyectos

#### Entregable 2 (Semana 4)
- API Backend funcional (auth + users)
- Documentación de endpoints
- Tests unitarios

#### Entregable 3 (Semana 6)
- Frontend completo integrado
- Flujo de pago funcional
- Sistema de tokens operativo

#### Entregable Final (Semana 8)
- Sistema completo desplegado
- Documentación técnica completa
- Manual de usuario
- Video demo

---

## 🔟 Resultados Esperados

### Productos Entregables

1. **Aplicación Web Funcional**
   - Frontend en Next.js desplegado
   - Backend en Express desplegado
   - Base de datos Turso operativa

2. **Documentación Técnica**
   - README.md del proyecto
   - API_DOCUMENTATION.md
   - FRONTEND_README.md
   - BACKEND_README.md (pendiente)

3. **Código Fuente**
   - Repositorio Git organizado
   - Commits con mensajes descriptivos
   - Código comentado y tipado

### Impacto Esperado

#### Académico
- Demostración de conocimientos fullstack
- Aplicación de patrones de arquitectura modernos
- Integración de múltiples tecnologías complejas

#### Institucional
- Proyecto de referencia para futuros alumnos
- Caso de estudio de integración Stripe + JWT
- Ejemplo de arquitectura desacoplada

#### Social/Comercial
- Plataforma potencialmente comercializable
- Solución real a problema de desarrolladores
- Base para startup o emprendimiento

---

## 1️⃣1️⃣ Referencias

### Documentación Técnica Oficial

**Next.js 16**
- Vercel. (2025). *Next.js Documentation*. https://nextjs.org/docs

**Express.js**
- OpenJS Foundation. (2025). *Express - Node.js web application framework*. https://expressjs.com/

**Stripe**
- Stripe, Inc. (2025). *Stripe API Reference*. https://stripe.com/docs/api

**Turso**
- Turso. (2025). *Turso Documentation - LibSQL Database*. https://docs.turso.tech/

**Prisma ORM**
- Prisma Data, Inc. (2025). *Prisma Documentation*. https://www.prisma.io/docs

**JWT (JSON Web Tokens)**
- Auth0. (2025). *JWT.IO - JSON Web Tokens Introduction*. https://jwt.io/introduction

### Artículos y Recursos Académicos

**Autenticación Moderna**
- OWASP Foundation. (2024). *Authentication Cheat Sheet*. https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

**RESTful API Design**
- Fielding, R. T. (2000). *Architectural Styles and the Design of Network-based Software Architectures* [Tesis doctoral, University of California].

**Seguridad Web**
- Mozilla Developer Network. (2025). *Web security*. https://developer.mozilla.org/en-US/docs/Web/Security

### Librerías y Paquetes NPM

**Frontend**
- next-intl: https://next-intl-docs.vercel.app/
- shadcn/ui: https://ui.shadcn.com/
- Zustand: https://zustand-demo.pmnd.rs/

**Backend**
- bcrypt: https://www.npmjs.com/package/bcrypt
- jsonwebtoken: https://www.npmjs.com/package/jsonwebtoken
- helmet: https://helmetjs.github.io/

---

## 1️⃣2️⃣ Anexos

### A. Diagrama de Flujo de Autenticación

```
Usuario → Register/Login → Backend API
                              ↓
                        Validar credenciales
                              ↓
                    Generar Access Token (5min)
                              ↓
                    Obtener Refresh Token (30d)
                              ↓
                    Guardar en cookies/localStorage
                              ↓
                    Retornar usuario autenticado
                              ↓
                    Frontend: Guardar en AuthContext
```

### B. Diagrama de Flujo de Pago Stripe

```
Usuario → Click "Upgrade to Premium"
            ↓
    Frontend: createCheckoutSession()
            ↓
    Backend: POST /api/stripe/checkout
            ↓
    Stripe: Crear sesión de pago
            ↓
    Redirigir a Stripe Checkout
            ↓
    Usuario completa pago
            ↓
    Stripe: Enviar webhook
            ↓
    Backend: POST /api/stripe/webhook
            ↓
    Validar firma del evento
            ↓
    Actualizar usuario a Premium
            ↓
    Generar token NPM
            ↓
    Guardar en DB (tokens table)
            ↓
    Redirigir a /premium/success
            ↓
    Frontend: Mostrar token NPM
```

### C. Estructura de Base de Datos (Turso)

#### Tabla: users
```sql
id: UUID PRIMARY KEY
username: VARCHAR(50) UNIQUE
email: VARCHAR(255) UNIQUE
password_hash: VARCHAR(255)
role_name: ENUM('admin', 'user', 'pro')
token_id: UUID FOREIGN KEY
two_factor_enabled: BOOLEAN
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

#### Tabla: tokens
```sql
id: UUID PRIMARY KEY
token: VARCHAR(500) UNIQUE
type: VARCHAR(50)
start_date: TIMESTAMP
finish_date: TIMESTAMP
created_at: TIMESTAMP
```

#### Tabla: settings_icons
```sql
id: UUID PRIMARY KEY
user_id: UUID FOREIGN KEY
appearance: VARCHAR(20)
language: VARCHAR(10)
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

### D. Endpoints de API Backend

Ver documentación completa en: `API_DOCUMENTATION.md`

#### Autenticación
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/refresh-token
GET    /api/auth/profile
```

#### Usuarios
```
GET    /api/users
GET    /api/users/:id
PUT    /api/users/profile
PUT    /api/users/:id/password
```

#### Tokens NPM
```
GET    /api/tokens/me
GET    /api/tokens
```

#### Stripe
```
POST   /api/stripe/checkout
POST   /api/stripe/webhook
```

#### 2FA
```
POST   /api/auth/2fa/setup
POST   /api/auth/2fa/verify
POST   /api/auth/2fa/disable
```

---

## 📝 Notas para la IA de Backend

### Contexto del Frontend
- ✅ Ya implementado y funcional
- ✅ Consume API en `http://localhost:3001`
- ✅ Usa JWT en `Authorization: Bearer <token>`
- ✅ Maneja refresh tokens automáticamente
- ✅ Integración con Stripe completa (lado cliente)

### Lo que el Backend debe hacer
1. **Autenticación completa** (register, login, refresh)
2. **CRUD de usuarios** con roles
3. **Generación de tokens NPM** únicos
4. **Integración con Stripe** (checkout + webhooks)
5. **Middleware de seguridad** (JWT, CORS, helmet)
6. **Validación de requests** con schemas
7. **Manejo de errores** consistente

### Endpoints críticos
- `POST /api/auth/login` → Retorna `{accessToken, user}`
- `POST /api/auth/refresh` → Retorna nuevo `accessToken`
- `GET /api/tokens/me` → Retorna token NPM del usuario
- `POST /api/stripe/checkout` → Crea sesión y retorna `{url}`
- `POST /api/stripe/webhook` → Procesa eventos de Stripe

### Formato de Respuestas
```typescript
// Success
{
  success: true,
  data: { ... }
}

// Error
{
  success: false,
  message: "Error message"
}
```

---

**Última actualización**: 16 de febrero de 2026  
**Versión**: 1.0  
**Autor**: [Nombre del alumno]  
**Universidad**: UTN FRT - Tecnicatura Universitaria en Programación
