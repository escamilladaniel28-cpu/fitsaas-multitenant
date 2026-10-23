# 📋 CONTEXT HANDOVER — PROYECTO SAAS MULTITENANT (FitSaaS)
> **Documento de Contexto y Estado del Proyecto para LLMs (Claude, DeepSeek, ChatGPT, etc.)**
> **Fecha de Actualización:** 2026-10-23  
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
2. **Autenticación, Seguridad y RBAC (15 pts):**
   - Registro e inicio de sesión con JWT en cookie `httpOnly` llamada `fit_session` (SameSite: Lax).
   - Fail-fast si falta `JWT_SECRET` (sin fallbacks inseguros en el código).
   - Endpoint dedicado de cierre de sesión: `POST /api/auth/logout`.
   - Protección de errores internos: los errores 500 se registran en el servidor y responden `{ error: 'internal_error' }` sin exponer detalles de la BD.
   - **Control de Acceso Basado en Roles (RBAC):** Roles `admin` (acceso total a finanzas, planes y telemetría) y `empleado` (acceso restringido a operaciones diarias: Resumen, Socios, Asistencias y Clases, ocultando Planes y la tarjeta de Ingresos).
3. **Dominio de Negocio (CRUD Completo & Clases con PIN):**
   - Nicho seleccionado: **Gimnasios y Estudios Fitness (Opción 2 del enunciado)**.
   - Entidades de dominio por tenant: `planes`, `socios`, `asistencias`, `clases`, `reservas`.
   - Validación estricta con **Zod** en todos los endpoints de entrada (`POST /api/socios`, `POST /api/asistencias`, `POST /api/clases`, `POST /api/reservas`, etc.).
   - **Módulo de Clases y Reservas con PIN:** Ciclo de vida con PIN de 6 dígitos (`pendiente` -> `asistio`), validación concurrente segura con `SELECT ... FOR UPDATE` y registro atómico de asistencia en torniquete.
4. **Idempotencia Obligatoria (15 pts):**
   - Operaciones de escritura protegidas con header `Idempotency-Key` (registro de tenant, socios, clases, reservas y check-in).
   - Clave scoped a `(tenant_id, endpoint, key)` en `public.idempotency_records` con hash canónico SHA-256 (`stableStringify`).
   - Reintento con la misma clave devuelve el resultado original sin duplicar el registro (`X-Idempotent-Replay: true`).
   - Reutilización con payload modificado devuelve HTTP `422 Unprocessable Entity` (`idempotency_key_reused`).
   - Persistencia de claves en `public.idempotency_records` con TTL de 24 horas y limpieza preventiva de expiradas.
5. **Rate Limiting Obligatorio (15 pts):**
   - Algoritmo de **Ventana Deslizante (Sliding Window Log)** en memoria.
   - Aplicado en Login (`/api/auth/login`, máx 5 req/min por IP) y creación de recursos.
   - Al excederse: HTTP `429 Too Many Requests` + header estándar `Retry-After: <segundos>`.
6. **Estrategias de Renderizado (Sección 4.9):**
   - **SSG:** Landing pública (`/`).
   - **SSR:** Dashboard autenticado (`/dashboard`).
   - **CSR:** Formularios interactivos, modales y consola de pruebas en vivo.
7. **Diseño Visual e Interfaz (Kinetic Bento):**
   - Interfaz completa unificada bajo la estética oscura **v0 Kinetic Bento** (`obsidian`, verde neón `volt`, `plasma` orange, tipografías `Space Grotesk` e `Inter`).
8. **Docker, Producción y VPS (10 pts):**
   - `docker-compose.yml` para desarrollo local.
   - `docker-compose.prod.yml` para despliegue en VPS de producción con PostgreSQL aislado en red interna, contenedor Next.js (`web:3000`) y **Nginx Reverse Proxy** en puertos 80 y 443.
9. **Puntos Adicionales (+20 pts extras):**
   - **IA con Google Gemini (+10 pts):** Diagnóstico de afluencia y retención del gimnasio con caché y rate limiting (`/api/ai/analytics`).
   - **Automatización n8n (+10 pts):** Webhook dispatcher ante eventos (`src/lib/webhooks.ts`).

---

## 🛠️ 2. Stack Tecnológico Elegido
* **Framework Fullstack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS 4.
* **Base de Datos:** PostgreSQL 16 (ejecutándose en Docker en red bridge interna).
* **Servidor Web / Proxy Inverso:** Nginx Alpine para producción en puertos 80 y 443.
* **ORM / Conexión:** Pool nativo de `pg` (`node-postgres`) para control preciso y dinámico de `SET search_path` y `SET LOCAL search_path`.
* **Validación de Datos:** `zod` para validación de entrada en endpoints de dominio.
* **Seguridad:** `jsonwebtoken` (JWT con rol en cookie `httpOnly`) + `bcryptjs` (hashing de contraseñas con sal).
* **Identificadores:** `uuid` v4 para claves de idempotencia e IDs primarios.
* **Componentes UI & Iconos:** Tailwind CSS + `lucide-react` + componentes Bento.

---

## 📂 3. Mapa de Archivos del Proyecto y Qué Hace Cada Uno

### Configuración e Infraestructura
* `docker-compose.yml`: Orquesta PostgreSQL en puerto `5436` y el servicio web Next.js en puerto `3001` para desarrollo local.
* `docker-compose.prod.yml`: Orquestación de producción con PostgreSQL (puerto no expuesto), app web Next.js (puerto 3000) y Nginx en puertos 80/443.
* `nginx/nginx.conf`: Configuración del proxy inverso Nginx con soporte para WebSockets, compresión gzip y caché de assets estáticos Next.js.
* `Dockerfile`: Construcción multi-etapa optimizada con build ARG dummy y puerto 3000.
* `.env.example` y `.env.production.example`: Plantillas de variables de entorno para desarrollo y producción en VPS.
* `.github/workflows/ci.yml`: Pipeline de CI/CD que corre PostgreSQL, ejecuta ESLint, el test de aislamiento y `next build`.
* `package.json`: Scripts: `npm run dev`, `npm run build`, `npm run lint`, `npm test`.

### Capa de Lógica y Base de Datos (`src/lib/`)
* `src/lib/db.ts`: Pool de conexiones `pg` y funciones `query(sql, params, schemaName)` y `withTenantTransaction()`. Destrucción preventiva de conexiones si falla el reseteo del search_path.
* `src/lib/tenants.ts`: 
  * `initGlobalSchema()`: Crea tablas `public.tenants`, `public.users` y `public.idempotency_records`.
  * `provisionTenantAtomic(params)`: Crea el schema del tenant, tablas (`planes`, `socios`, `asistencias`, `clases`, `reservas`), planes iniciales, tenant global y admin user en una única transacción con `SET LOCAL search_path` y `ROLLBACK` total ante fallos.
* `src/lib/auth.ts`: Emisión y validación de JWT con validación estricta de `JWT_SECRET`, manejo de cookie `fit_session` (`httpOnly`, `SameSite: Lax`), hash y verificación de contraseñas, e inclusión de `role`.
* `src/lib/idempotency.ts`: Función `withIdempotency()` con scoping por `(tenant_id, endpoint, key)`, hash canónico recursivo (`stableStringify`), expiración de 24h y respuesta HTTP 422 ante payload modificado.
* `src/lib/rate-limit.ts`: Implementación en memoria del algoritmo de ventana deslizante con respuestas 429 y `Retry-After`.
* `src/lib/gemini.ts`: Integración con Google Gemini (caché de 10 min y fallback automático sin crash).
* `src/lib/webhooks.ts`: Despachador para eventos hacia flujos de n8n.

### Componentes de Interfaz (`src/components/kinetic/`)
* `floating-sidebar.tsx`: Barra de navegación flotante con soporte para RBAC (filtra ítems si `userRole === 'empleado'`).
* `classes-view.tsx`: Vista completa del módulo de Clases con tarjeta de check-in de PIN gigante de 6 dígitos, banners reactivos de acceso/error, tabla con aforos y modal de programación con Zod e idempotencia.
* `active-members-card.tsx`, `live-capacity-card.tsx`, `revenue-card.tsx`, `checkins-table.tsx`, `quick-actions-card.tsx`: Tarjetas Bento interactivas.

### Rutas de API Backend (`src/app/api/`)
* `/api/auth/register-tenant/route.ts`: Registro del gimnasio atómico, inicialización de schemas, JWT cookie e idempotencia.
* `/api/auth/login/route.ts`: Login con Rate Limit estricto (5 intentos/min) devolviendo 429 + Retry-After y emisión de JWT con rol.
* `/api/auth/me/route.ts`: Verificación de sesión activa y rol.
* `/api/auth/logout/route.ts`: Endpoint POST para eliminación inmediata de cookie `fit_session`.
* `/api/planes/route.ts`: CRUD de planes dentro del schema del tenant.
* `/api/socios/route.ts` & `/api/socios/[id]/route.ts`: Gestión de socios con validación Zod e `Idempotency-Key`.
* `/api/asistencias/route.ts`: Registro de acceso en recepción validando membresía activa.
* `/api/clases/route.ts`: Listado de clases y creación con validación Zod e `Idempotency-Key`.
* `/api/reservas/route.ts`: Creación de reservas para socios activos con generación aleatoria de PIN de 6 dígitos.
* `/api/reservas/checkin/route.ts`: Validación concurrente de PIN con `SELECT ... FOR UPDATE`, cambio de estado a `'asistio'` e inserción simultánea en `asistencias`.
* `/api/ai/analytics/route.ts`: Análisis de datos con IA Gemini para el tenant.

---

## ⚖️ 4. Limitaciones Conocidas (Trade-offs de Diseño)

1. **Rate Limiting en Memoria (Sliding Window Log):** En memoria Node.js para despliegues de instancia única. En cluster horizontal se requeriría Redis.
2. **Idempotencia Secuencial vs Concurrente:** Persistencia en `public.idempotency_records` con SHA-256 canónico y protección contra reintentos secuenciales.
3. **Control Nativo con `pg` en lugar de un ORM:** Uso deliberado del driver nativo para ejecución determinista y sin sobrecosto de memoria de `SET search_path` y `SET LOCAL search_path`.
4. **Confianza de IP en `X-Forwarded-For`:** En producción Nginx sanitiza y reescribe las cabeceras `X-Forwarded-For` y `X-Real-IP`.
5. **Aprovisionamiento Atómico:** Toda la creación del tenant se ejecuta en una única transacción SQL con `ROLLBACK` total ante fallos.

---

## 📌 5. Estado Actual del Repositorio Git y Commits
* **Estrategia de ramas:**
  * `main`: Producción protegida (solo PRs desde `develop`).
  * `develop`: Integración activa (actualmente con todos los módulos integrados).
  * `feature/*`: Ramas de trabajo para cada funcionalidad antes de hacer PR.
* **Historial de Commits Clave:**
  * `d30fe12` - `fix(auth): fail fast when JWT_SECRET is missing, remove hardcoded fallback` (P0.1)
  * `bbab2e3` - `fix(idempotency): scope by (tenant_id, endpoint, key) and prevent stale key collisions` (P0.2)
  * `044dfda` / `90eea2e` - `fix(docker): pass dummy JWT_SECRET as build ARG for Next.js page data collection`
  * `50d0f0c` - `feat(auth): add POST /api/auth/logout to clear session cookie` (P1.1)
  * `0b96626` - `fix(api): hide internal error details from 500 responses` (P1.3)
  * `861ef7c` - `feat(tenants): atomic tenant provisioning in a single transaction with rollback` (P1.4)
  * `5a8bcba` - `feat(validation): add Zod validation for socios and asistencias routes` (P1.2)
  * `3bf28de` - `feat(ui): unify public pages and dashboard with v0 kinetic bento dark theme`
  * `1539a82` / `80483f7` - `feat(api): add classes, reservations and PIN check-in backend logic`
  * `1341157` - `feat(ui): add kinetic classes view with PIN check-in and modal`
  * `111bf5b` / `5f35ca1` - `feat(security): implement role-based access control (admin vs employee)`
  * `ea3477a` - `feat(infra): add production docker-compose, nginx reverse proxy and deployment docs`
