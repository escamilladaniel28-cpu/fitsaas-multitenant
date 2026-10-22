# 📋 CONTEXT HANDOVER — PROYECTO SAAS MULTITENANT (FitSaaS)
> **Documento de Contexto y Estado del Proyecto para LLMs (Claude, DeepSeek, ChatGPT, etc.)**
> **Fecha de Actualización:** 2026-10-22  
> **Workspace:** `c:\Users\Milton\Videos\multitenant`  
> **GitHub Repository:** `https://github.com/escamilladaniel28-cpu/fitsaas-multitenant`  
> **Autor del Proyecto:** Milton Escamilla (`escamilladaniel28@gmail.com`)  
> **Asistente AI:** Antigravity AI Assistant

---

## 🎯 1. Objetivo y Requisitos del Proyecto
Este es un **Proyecto Integrador de Evaluación Individual (duración: 1 semana)** calificado con **sustentación oral en vivo y modificación de código en tiempo real**.

### Reglas Clave de la Rúbrica (Total: 100 pts + 20 extras):
1. **Multitenancy con un Schema por Tenant en PostgreSQL (25 pts):**
   - Schema compartido (`public`): Almacena tablas globales (`tenants`, `users`, `idempotency_records`).
   - Cada tenant tiene su propio schema con sus tablas de dominio (`tenant_<slug>`).
   - Aprovisionamiento automático y atómico al registrarse el tenant (`provisionTenantAtomic` con transacción completa y `SET LOCAL search_path`).
   - Aislamiento estricto: En cada petición el sistema resuelve el tenant y opera con `SET search_path TO "tenant_<slug>", public;`.
2. **Autenticación y Seguridad (15 pts):**
   - Registro e inicio de sesión.
   - Fail-fast si falta `JWT_SECRET` (sin fallbacks hardcodeados en el código).
   - JWT guardado en cookie `httpOnly` llamada `fit_session` (SameSite: Lax).
   - Endpoint dedicado de cierre de sesión: `POST /api/auth/logout`.
   - Protección de errores internos: los errores 500 se registran en el servidor y responden `{ error: 'internal_error' }` sin exponer detalles de la BD.
3. **Dominio de Negocio (CRUD Completo):**
   - Nicho seleccionado: **Gimnasios y Estudios Fitness (Opción 2 del enunciado)**.
   - 3 entidades de dominio por tenant: `planes`, `socios`, `asistencias` (control de acceso/torniquete).
   - Validación estricta con **Zod** en socios y asistencias (`z.enum(['activo', 'inactivo', 'suspendido'])`, UUIDs validados contra BD devolviendo 400 en lugar de 500).
4. **Idempotencia Obligatoria (15 pts):**
   - Operaciones de escritura con header `Idempotency-Key` (registro de tenant, socios y check-in).
   - Clave scoped a `(tenant_id, endpoint, key)` en `public.idempotency_records` con hash canónico SHA-256 (`stableStringify`).
   - Reintento con la misma clave devuelve el resultado original sin duplicar el registro (`X-Idempotent-Replay: true`).
   - Reutilización con payload modificado devuelve HTTP `422 Unprocessable Entity` (`idempotency_key_reused`).
   - Persistencia de claves en `public.idempotency_records` con TTL de 24 horas y limpieza preventiva de expiradas.
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
* **ORM / Conexión:** Pool nativo de `pg` (`node-postgres`) para control preciso y dinámico de `SET search_path` y `SET LOCAL search_path`.
* **Validación de Datos:** `zod` para validación de entrada en endpoints de dominio.
* **Seguridad:** `jsonwebtoken` (JWT en cookie `httpOnly`) + `bcryptjs` (hashing de contraseñas con sal).
* **Identificadores:** `uuid` v4 para claves de idempotencia e IDs primarios.
* **Componentes UI & Iconos:** Tailwind CSS + `lucide-react`.

---

## 📂 3. Mapa de Archivos del Proyecto y Qué Hace Cada Uno

### Configuración e Infraestructura
* `docker-compose.yml`: Orquesta PostgreSQL en puerto `5436` y el servicio web Next.js en puerto `3001` con healthchecks.
* `Dockerfile`: Construcción multi-etapa optimizada con build ARG dummy para pre-compilación segura sin secretos en runtime.
* `.env` y `.env.example`: Variables de entorno (`DATABASE_URL`, `JWT_SECRET`, `PORT`, `GEMINI_API_KEY`, etc.).
* `.github/workflows/ci.yml`: Pipeline de CI/CD que corre PostgreSQL, ejecuta ESLint, el test de aislamiento y `next build`.
* `package.json`: Scripts: `npm run dev`, `npm run build`, `npm run lint`, `npm test`.

### Capa de Lógica y Base de Datos (`src/lib/`)
* `src/lib/db.ts`: Pool de conexiones `pg` y funciones `query(sql, params, schemaName)`. Implementa **destrucción de conexiones envenenadas** (`client.release(destroy)`) si ocurre un fallo al resetear el search path.
* `src/lib/tenants.ts`: 
  * `initGlobalSchema()`: Crea tablas `public.tenants`, `public.users` y `public.idempotency_records`.
  * `provisionTenantAtomic(params)`: Crea el schema del tenant, tablas, planes iniciales, tenant global y admin user en una única transacción con `SET LOCAL search_path` y `ROLLBACK` total ante fallos.
* `src/lib/auth.ts`: Emisión y validación de JWT con validación estricta de `JWT_SECRET` en carga de módulo, manejo de cookie `fit_session` (`httpOnly`, `SameSite: Lax`), hash de contraseñas.
* `src/lib/idempotency.ts`: Función `withIdempotency()` con scoping por `(tenant_id, endpoint, key)`, hash canónico recursivo (`stableStringify`), guardas de expiración (24h) y respuesta HTTP 422 ante colisiones de payload modificado.
* `src/lib/rate-limit.ts`: Implementación en memoria del algoritmo de ventana deslizante con respuestas 429 y `Retry-After`.
* `src/lib/gemini.ts`: Integración con Google Gemini (caché de 10 min y fallback automático sin crash).
* `src/lib/webhooks.ts`: Despachador para eventos hacia flujos de n8n.

### Rutas de API Backend (`src/app/api/`)
* `/api/auth/register-tenant/route.ts`: Registro del gimnasio atómico, inicialización de schemas, JWT cookie e idempotencia.
* `/api/auth/login/route.ts`: Login con Rate Limit estricto (5 intentos/min) devolviendo 429 + Retry-After.
* `/api/auth/me/route.ts`: Verificación de sesión activa.
* `/api/auth/logout/route.ts`: Endpoint POST para eliminación inmediata de cookie `fit_session` (maxAge: 0).
* `/api/planes/route.ts`: CRUD de planes dentro del schema del tenant.
* `/api/socios/route.ts`: Listado con búsqueda y creación de socios con validación Zod e `Idempotency-Key`.
* `/api/socios/[id]/route.ts`: Edición y eliminación de socio validando UUID y esquemas Zod en PUT.
* `/api/asistencias/route.ts`: Registro de check-in en torniquete validando membresía activa, schema Zod e idempotencia.
* `/api/ai/analytics/route.ts`: Análisis de datos con IA Gemini para el tenant.

### Pruebas Automatizadas
* `src/scripts/test-isolation.ts`: Script que se ejecuta con `npm test`, validando 4 escenarios críticos:
  1. Aislamiento multitenant estricto entre Tenant Alfa y Beta (0 registros compartidos).
  2. Idempotencia scoped por tenant (Tenant A y Tenant B con la misma key `"testKey"` no colisionan).
  3. Replay cacheado (`X-Idempotent-Replay: true`) ante repetición del mismo payload.
  4. Detección de clave reutilizada con payload diferente devolviendo HTTP `422 Unprocessable Entity` (`idempotency_key_reused`).

---

## ⚖️ 4. Limitaciones Conocidas (Trade-offs de Diseño)

1. **Rate Limiting en Memoria (Sliding Window Log):**
   * *Estado:* En memoria Node.js para despliegues de instancia única.
   * *Trade-off:* En un entorno multi-instancia horizontal (cluster), los contadores no se comparten entre réplicas. Para escalar horizontalmente se requeriría un almacén distribuido como Redis.
2. **Idempotencia Secuencial vs Concurrente:**
   * *Estado:* Protege contra reintentos de red secuenciales mediante persistencia en `public.idempotency_records` con hash canónico SHA-256 (`stableStringify`) y detección de reutilización con payload diferente (HTTP 422).
   * *Trade-off:* Si dos peticiones idénticas llegan en el microsegundo exacto en paralelo, ambas podrían superar el chequeo inicial antes de que la primera inserte en la tabla (carrera concurrente).
3. **Control Nativo con `pg` en lugar de un ORM:**
   * *Estado:* Uso deliberado del driver nativo `node-postgres` (`pg`).
   * *Justificación:* Prisma y otros ORMs requieren pre-generar o instanciar clientes cacheados por cada esquema dinámico en runtime. `pg` permite ejecutar de forma determinista y sin sobrecosto de memoria comandos como `SET search_path` y `SET LOCAL search_path` por conexión.
4. **Confianza de IP en `X-Forwarded-For`:**
   * *Estado:* El limitador de tasa y registro extraen la IP del cliente de `x-forwarded-for`.
   * *Supuesto Operativo:* En producción se asume la presencia de un Reverse Proxy confiable (Nginx, Traefik, Cloudflare) que sanitiza y reescribe las cabeceras `X-Forwarded-For` y `X-Real-IP`.
5. **Aprovisionamiento Atómico:**
   * *Garantía:* Toda la creación del tenant (`CREATE SCHEMA`, `CREATE TABLEs`, inserción en `public.tenants` y `public.users`) se ejecuta en una única transacción con `SET LOCAL search_path`. Ante cualquier error, el `ROLLBACK` total garantiza cero schemas huérfanos.

---

## 📌 5. Estado Actual del Repositorio Git y Commits
* **Estrategia de ramas:**
  * `main`: Producción protegida (solo PRs desde `develop`).
  * `develop`: Integración activa.
  * `feature/*`: Tareas puntuales.
* **Commits Clave de la Auditoría y Hardening:**
  * `d30fe12` - `fix(auth): fail fast when JWT_SECRET is missing, remove hardcoded fallback` (P0.1)
  * `bbab2e3` - `fix(idempotency): scope by (tenant_id, endpoint, key) and prevent stale key collisions` (P0.2)
  * `044dfda` / `90eea2e` - `fix(docker): pass dummy JWT_SECRET as build ARG for Next.js page data collection`
  * `50d0f0c` - `feat(auth): add POST /api/auth/logout to clear session cookie` (P1.1)
  * `0b96626` - `fix(api): hide internal error details from 500 responses` (P1.3)
  * `861ef7c` - `feat(tenants): atomic tenant provisioning in a single transaction with rollback` (P1.4)
  * `2e706f6` - `fix(auth): ensure global schema exists before idempotency check` (P1.4 Hotfix)
  * `5a8bcba` - `feat(validation): add Zod validation for socios and asistencias routes` (P1.2)
