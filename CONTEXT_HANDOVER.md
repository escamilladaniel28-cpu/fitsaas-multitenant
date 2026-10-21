# 📋 CONTEXT HANDOVER — PROYECTO SAAS MULTITENANT (FitSaaS)
> **Documento de Contexto y Estado del Proyecto para LLMs (Claude, DeepSeek, ChatGPT, etc.)**
> **Fecha de Actualización:** 2026-10-21  
> **Workspace:** `/home/Coder/Documentos/mdescamilla`  
> **Autor del Resumen:** Antigravity AI Assistant

---

## 🎯 1. Objetivo y Requisitos del Proyecto
Este es un **Proyecto Integrador de Evaluación Individual (duración: 1 semana)** calificado con **sustentación oral en vivo y modificación de código en tiempo real**.

### Reglas Clave de la Rúbrica (Total: 100 pts + 20 extras):
1. **Multitenancy con un Schema por Tenant en PostgreSQL (25 pts):**
   - Schema compartido (`public`): Almacena tablas globales (`tenants`, `users`, `idempotency_records`).
   - Cada tenant tiene su propio schema con sus tablas de dominio (`tenant_<slug>`).
   - Aprovisionamiento automático al registrarse el tenant (crear schema y tablas sin intervención manual).
   - Aislamiento estricto: En cada petición el sistema resuelve el tenant y opera con `SET search_path TO "tenant_<slug>", public;`.
2. **Autenticación y Seguridad (15 pts):**
   - Registro e inicio de sesión.
   - JWT guardado en cookie `httpOnly` (no en `localStorage`).
   - Rutas protegidas en backend y frontend.
3. **Dominio de Negocio (CRUD Completo):**
   - Nicho seleccionado: **Gimnasios y Estudios Fitness (Opción 2 del enunciado)**.
   - 3 entidades de dominio por tenant: `planes`, `socios`, `asistencias` (control de acceso/torniquete).
4. **Idempotencia Obligatoria (15 pts):**
   - Mínimo 2 operaciones de escritura con header `Idempotency-Key` (ej. registro de tenant, socios y check-in).
   - Reintento con la misma clave devuelve el resultado original sin duplicar el registro (`X-Idempotent-Replay: true`).
   - Persistencia de claves en `public.idempotency_records` con TTL de 24 horas.
5. **Rate Limiting Obligatorio (15 pts):**
   - Algoritmo de **Ventana Deslizante (Sliding Window Log)**.
   - Aplicado en Login (`/api/auth/login`, máx 5 req/min por IP) y creación de recursos.
   - Al excederse: HTTP `429 Too Many Requests` + header estándar `Retry-After: <segundos>`.
6. **Estrategias de Renderizado (Sección 4.9):**
   - **SSG:** Landing pública (`/`).
   - **SSR:** Dashboard autenticado (`/dashboard`).
   - **CSR:** Formularios interactivos, modales y consola de pruebas en vivo.
7. **Docker y CI/CD (10 pts):**
   - `docker-compose.yml` que levanta PostgreSQL y Next.js con un solo comando.
   - Pipeline de GitHub Actions (`.github/workflows/ci.yml`) con lint, build y tests de aislamiento.
8. **Puntos Adicionales (+20 pts extras):**
   - **IA con Google Gemini (+10 pts):** Diagnóstico de afluencia y retención del gimnasio con caché y rate limiting (`/api/ai/analytics`).
   - **Automatización n8n (+10 pts):** Webhook dispatcher ante eventos (`src/lib/webhooks.ts`).

---

## 🛠️ 2. Stack Tecnológico Elegido
* **Framework Fullstack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS 4.
* **Base de Datos:** PostgreSQL 16 (ejecutándose en Docker en el puerto `5436`).
* **ORM / Conexión:** Pool nativo de `pg` (`node-postgres`) para control preciso y dinámico de `SET search_path`.
* **Seguridad:** `jsonwebtoken` (JWT en cookie `httpOnly`) + `bcryptjs` (hashing de contraseñas con sal).
* **Identificadores:** `uuid` v4 para claves de idempotencia e IDs primarios.
* **Componentes UI & Iconos:** Tailwind CSS + `lucide-react`.

---

## 📂 3. Mapa de Archivos del Proyecto y Qué Hace Cada Uno

### Configuración e Infraestructura
* `docker-compose.yml`: Orquesta PostgreSQL en puerto `5436` y el servicio web Next.js en puerto `3001` con healthchecks.
* `Dockerfile`: Construcción multi-etapa optimizada para Next.js en producción.
* `.env` y `.env.example`: Variables de entorno (`DATABASE_URL`, `JWT_SECRET`, `PORT`, `GEMINI_API_KEY`, etc.).
* `.github/workflows/ci.yml`: Pipeline de CI/CD que corre PostgreSQL, ejecuta ESLint, el test de aislamiento y `next build`.
* `package.json`: Scripts: `npm run dev`, `npm run build`, `npm run lint`, `npm test`.

### Capa de Lógica y Base de Datos (`src/lib/`)
* `src/lib/db.ts`: Pool de conexiones `pg` y funciones `query(sql, params, schemaName)` y `withTenantTransaction()`. Implementa **destrucción de conexiones envenenadas** (`client.release(destroy)`) si ocurre un fallo al resetear `SET search_path TO public` o durante un `ROLLBACK`, garantizando inmunidad contra fugas de schema entre tenants concurrentes.
* `src/lib/tenants.ts`: 
  * `initGlobalSchema()`: Crea tablas `public.tenants`, `public.users` y `public.idempotency_records`.
  * `createTenantSchema(slug, name)`: Crea dinámicamente `CREATE SCHEMA "tenant_<slug>"` y sus tablas `planes`, `socios`, `asistencias` con planes iniciales.
* `src/lib/auth.ts`: Emisión y validación de JWT, manejo de cookie segura `fit_session` (`httpOnly`, `SameSite: Lax`), hash de contraseñas.
* `src/lib/idempotency.ts`: Función `withIdempotency()` que intercepta `Idempotency-Key`, consulta caché en DB y evita operaciones duplicadas.
* `src/lib/rate-limit.ts`: Implementación en memoria del algoritmo de ventana deslizante con respuestas 429 y `Retry-After`.
* `src/lib/gemini.ts`: Integración con Google Gemini (modelo configurable por `GEMINI_MODEL`, caché de 10 min y fallback automático sin crash).
* `src/lib/webhooks.ts`: Despachador para eventos hacia flujos de n8n.

### Rutas de API Backend (`src/app/api/`)
* `/api/auth/register-tenant/route.ts`: Registro del gimnasio, aprovisionamiento automático de schema, admin user, JWT cookie e idempotencia.
* `/api/auth/login/route.ts`: Login con Rate Limit estricto (5 intentos/min) devolviendo 429 + Retry-After.
* `/api/auth/me/route.ts`: Verificación de sesión activa.
* `/api/auth/logout/route.ts`: Eliminación de cookie de sesión.
* `/api/planes/route.ts`: CRUD de planes dentro del schema del tenant.
* `/api/socios/route.ts`: Listado con búsqueda y creación de socios con `Idempotency-Key`.
* `/api/socios/[id]/route.ts`: Edición y eliminación de socio en el schema del tenant.
* `/api/asistencias/route.ts`: Registro de check-in en torniquete validando membresía activa e idempotencia.
* `/api/ai/analytics/route.ts`: Análisis de datos con IA Gemini para el tenant.

### Vistas y Frontend (`src/app/`)
* `src/app/page.tsx`: **Landing Page (SSG)** con propuesta de valor y badges arquitectónicos.
* `src/app/register/page.tsx`: Formulario de registro de tenant con validación en vivo de slug.
* `src/app/login/page.tsx`: Login con cuenta regresiva en vivo si se dispara el Rate Limit (429).
* `src/app/dashboard/page.tsx`: **Server Component (SSR)** que valida la sesión y pre-carga métricas en el servidor.
* `src/app/dashboard/DashboardClient.tsx`: **Client Component (CSR)** con 5 pestañas:
  1. *Resumen & Asesor IA:* Tarjetas de estadísticas y botón para generar análisis con Gemini.
  2. *Socios:* Tabla con búsqueda, filtros y modal de creación.
  3. *Control de Asistencias:* Registro rápido de acceso y validación de estado activo.
  4. *Planes:* Gestión de tarifas y vigencia.
  5. *Inspector de Sustentación:* Botones interactivos para disparar en vivo al evaluador la prueba de idempotencia (2 peticiones con la misma key) y la saturación de rate limit (429).

### Pruebas Automatizadas
* `src/scripts/test-isolation.ts`: Script que se ejecuta con `npm test`:
  1. Inicializa el schema público.
  2. Crea Tenant Alfa y Tenant Beta en schemas separados.
  3. Inserta un socio en Tenant Alfa.
  4. Demuestra que Tenant Beta tiene 0 registros de ese socio (cero fuga de datos).
  5. Ejecuta 2 llamadas con la misma `Idempotency-Key` y valida `counter = 1` y `X-Idempotent-Replay: true`.

---

## ⚡ 4. Cómo Levantar y Probar el Proyecto

### Levantar con Docker:
```bash
docker compose up -d --build
```
* **Frontend/App:** `http://localhost:3001`
* **PostgreSQL:** `localhost:5436` (DB: `fitsaas_db`, User: `postgres`, Pass: `postgres`)

### Correr Pruebas Automatizadas:
```bash
npm test
```

### Ejecutar Linter y Build de Next.js:
```bash
npm run lint
npm run build
```

---

## 📌 5. Estado Actual del Repositorio Git
* **Rama:** `main`
* **Commits realizados:**
  * `ecb7500` - `feat(infra): initialize Next.js 16, PostgreSQL docker-compose and CI/CD workflow`
  * `dbf5db9` - `feat(core): implement schema-per-tenant provisioning, auth, idempotency and rate limiting`
  * `e587747` - `feat(ui): add domain CRUD, SSG landing, SSR dashboard and full documentation`
* **Árbol de trabajo:** Completamente limpio (`git status` limpio).

---

## 💡 Instrucciones para el siguiente LLM (DeepSeek / Claude)
Si el usuario te solicita cambios o ampliaciones:
1. **Mantener la integridad de `search_path`:** Nunca mezclar datos de schemas en consultas directas; usar siempre la abstracción de `src/lib/db.ts`.
2. **Next.js 16 Conventions:**
   * En Route Handlers y Server Components, `params` y `cookies()` son promesas (`await params`, `await cookies()`).
   * No usar `export const dynamic = '...'` junto a `cacheComponents` sin verificar compatibilidad.
3. **Idempotencia:** Cualquier nueva operación de creación o pago debe mantener el uso de `withIdempotency` y enviar el header `Idempotency-Key`.
4. **Al terminar tus modificaciones:** Actualiza este archivo `CONTEXT_HANDOVER.md` para mantener la sincronización entre agentes.
