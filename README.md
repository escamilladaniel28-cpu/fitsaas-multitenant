# 🏋️ FitSaaS — Plataforma SaaS Multitenant para Gimnasios y Estudios Fitness

Plataforma SaaS multitenant de alto rendimiento diseñada bajo el modelo **un schema por tenant en PostgreSQL**, con autenticación segura en cookies `httpOnly`, operaciones idempotentes garantizadas por clave, limitación de tasa por ventana deslizante (Rate Limiting) y recomendaciones ejecutivas con Inteligencia Artificial (Gemini).

---

## 📌 1. Nicho Elegido y Descripción del Dominio

* **Nicho:** Gimnasios, boxes de crossfit y centros de entrenamiento funcional.
* **Organización (Tenant):** Cada gimnasio registrado representa una organización independiente (ej. *PowerFit Gym*, *IronBox*, etc.).
* **Aislamiento:** Cada gimnasio opera en su propio esquema de PostgreSQL (`tenant_<slug>`), garantizando que jamás existan colisiones ni filtración de información entre gimnasios.

### Entidades del Dominio (3 entidades por tenant)
1. **Planes de Membresía (`planes`):** Catálogo de suscripciones con precio, vigencia en días y descripción (ej. Pase Diario, Membresía Mensual, Plan Trimestral VIP).
2. **Socios / Miembros (`socios`):** Información de atletas/clientes (nombre, documento de identidad, email, teléfono, plan asignado y estado: `activo` o `inactivo`).
3. **Control de Asistencias (`asistencias`):** Registro cronológico de acceso en recepción/torniquetes, validando en tiempo real que el socio pertenezca al gimnasio y tenga membresía activa.

---

## 🏛️ 2. Arquitectura Multitenant

```mermaid
graph TD
    User([Cliente / Navegador]) -->|HTTPS / Petición + Cookie httpOnly| Gateway[Next.js App Router]
    
    subgraph "Next.js Fullstack Server"
        Resolver[Tenant Resolver & Auth Middleware]
        Idemp[Idempotency Guard]
        Rate[Sliding Window Rate Limiter]
        API[Route Handlers & Server Components]
    end

    Gateway --> Resolver
    Resolver --> Rate
    Rate --> Idemp
    Idemp --> API

    subgraph "PostgreSQL Database Engine"
        subgraph "Schema Global: public"
            T_Tenants[(tenants)]
            T_Users[(users)]
            T_Idemp[(idempotency_records)]
        end

        subgraph "Schema Tenant A: tenant_powerfit"
            T_PlanesA[(planes)]
            T_SociosA[(socios)]
            T_AsistA[(asistencias)]
        end

        subgraph "Schema Tenant B: tenant_ironbox"
            T_PlanesB[(planes)]
            T_SociosB[(socios)]
            T_AsistB[(asistencias)]
        end
    end

    API -->|SET search_path TO tenant_powerfit, public| T_PlanesA
    API -->|SET search_path TO tenant_ironbox, public| T_PlanesB
```

### Organización de Schemas en PostgreSQL
* **Schema compartido (`public`):**
  * `tenants`: Registro global de gimnasios aprovisionados (`id`, `slug`, `name`, `schema_name`, `created_at`).
  * `users`: Cuentas de administradores asociadas a un tenant (`id`, `tenant_id`, `email`, `password_hash`, `role`).
  * `idempotency_records`: Registro centralizado de peticiones idempotentes y sus respuestas en caché con TTL de 24 horas.
* **Schema exclusivo (`tenant_<slug>`):**
  * Creado dinámicamente mediante `CREATE SCHEMA IF NOT EXISTS "tenant_<slug>"` al momento del registro.
  * Tablas de negocio: `planes`, `socios`, `asistencias`.

---

## 🔑 3. Resolución del Tenant en Cada Petición

La resolución se realiza de manera segura y transparente:
1. **Autenticación con JWT:** Tras el login o registro de un gimnasio, el servidor emite un JWT firmado que contiene:
   ```json
   {
     "userId": "uuid...",
     "email": "admin@powerfit.com",
     "tenantId": "uuid...",
     "tenantSlug": "powerfit",
     "tenantSchema": "tenant_powerfit"
   }
   ```
2. **Almacenamiento Seguro:** El token se guarda en una cookie `httpOnly` llamada `fit_session` (`SameSite: Lax`, protegida contra ataques XSS).
3. **Ejecución Scoped:** En cada Server Action, Route Handler o Server Component, la función `getSession()` extrae y valida el JWT.
4. **Conexión en Base de Datos:** Antes de ejecutar cualquier consulta de negocio, la conexión al pool ejecuta:
   ```sql
   SET search_path TO "tenant_powerfit", public;
   ```
   Al finalizar, el `search_path` se restablece a `public` antes de devolver la conexión al pool de PostgreSQL.

---

## ⚡ 4. Idempotencia y Rate Limiting

### 4.1 Idempotencia (Obligatorio)
* **Objetivo:** Evitar duplicación de registros por reintentos de red, caídas de conexión o doble clic en la interfaz.
* **Endpoints Protegidos:**
  * `POST /api/auth/register-tenant` (Creación de gimnasio y aprovisionamiento de schema).
  * `POST /api/socios` (Creación de socios).
  * `POST /api/asistencias` (Validación de acceso en torniquete).
* **Mecanismo:**
  * El cliente envía una clave única en el header `Idempotency-Key` (ej. UUID v4).
  * Si la clave ya existe en `public.idempotency_records` y no ha expirado, el servidor devuelve la respuesta almacenada sin volver a ejecutar la transacción, agregando el header `X-Idempotent-Replay: true`.
  * **Persistencia y TTL:** Se conservan durante **24 horas** en la tabla global `idempotency_records`.

### 4.2 Rate Limiting (Obligatorio)
* **Algoritmo:** **Sliding Window Log (Ventana Deslizante)** en memoria/servidor.
* **Por qué esta elección:** Los algoritmos de ventana fija sufren del problema de ráfagas en los bordes del intervalo (doble cuota en el cambio de minuto). La ventana deslizante rastrea los timestamps exactos de las peticiones en un intervalo continuo de 60 segundos.
* **Límites Configurados:**
  * `/api/auth/login`: Máximo 5 intentos por minuto por IP.
  * Creación de recursos (`/api/socios`, `/api/asistencias`): Máximo 30-60 peticiones por minuto por tenant.
* **Respuesta ante Exceso:** Retorna código HTTP `429 Too Many Requests` con el header estándar `Retry-After: <segundos>` y cuerpo explicativo con cuenta regresiva.

---

## 🖥️ 5. Estrategias de Renderizado (Sección 4.9)

* **SSG (Static Site Generation):**
  * Página de Inicio (`/`): Pre-renderizada estáticamente en build-time con información pública del SaaS, rendimiento ultra rápido y cero carga en base de datos.
* **SSR (Server-Side Rendering):**
  * Panel Principal (`/dashboard`): Renderizado dinámico en el servidor en cada solicitud autenticada. Pre-carga métricas directamente desde el schema del tenant antes de enviar el HTML al navegador.
* **CSR (Client-Side Rendering):**
  * Formularios interactivos, filtros de búsqueda, modal de registro con Idempotency-Key y consola de inspección en vivo para la sustentación.

---

## 🚀 6. Cómo Levantar el Proyecto

### Opción A: Levantar todo con Docker Compose (Recomendado)
Levanta la base de datos PostgreSQL y la aplicación Next.js con un solo comando:

```bash
docker compose up -d --build
```
* **Aplicación Web:** `http://localhost:3001`
* **PostgreSQL:** `localhost:5436` (base de datos: `fitsaas_db`, usuario: `postgres`, password: `postgres`)

Para detener los contenedores:
```bash
docker compose down
```

---

### Opción B: Ejecución Local en Desarrollo

1. Levantar únicamente el contenedor de PostgreSQL:
   ```bash
   docker compose up -d postgres
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Configurar variables de entorno:
   ```bash
   cp .env.example .env
   ```

4. Ejecutar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   Abrir `http://localhost:3000` o `http://localhost:3001`.

---

## 🧪 7. Pruebas Automatizadas

El proyecto incluye una suite de pruebas para verificar el aislamiento entre tenants y la idempotencia:

```bash
npm test
```

Esta prueba automatizada:
1. Crea dos tenants independientes (`Tenant Alfa` y `Tenant Beta`).
2. Inserta datos en el esquema del `Tenant Alfa`.
3. Valida mediante consultas que el `Tenant Beta` tiene **0 registros** (aislamiento estricto).
4. Envía dos peticiones con la misma `Idempotency-Key` y valida que el código se ejecuta exactamente una sola vez (`X-Idempotent-Replay: true`).

---

## 🤖 8. Funcionalidades Adicionales (Puntos Extra)

* **Inteligencia Artificial con Google Gemini (+10 Pts):**
  * Endpoint `/api/ai/analytics` que analiza los socios y afluencia del gimnasio para generar un informe de retención y rentabilidad.
  * Modelo configurable mediante `GEMINI_MODEL` (por defecto `gemini-1.5-flash`).
  * Incluye memoria caché de 10 minutos para proteger la cuota gratuita y manejo tolerante a fallos si se alcanza el error 429 de Google.
* **Automatización con n8n (+10 Pts):**
  * Módulo `src/lib/webhooks.ts` que despacha eventos (ej. `tenant.created`) hacia un webhook configurable mediante `N8N_WEBHOOK_URL`.
* **Inspector para la Sustentación:**
  * Pestaña interactiva en el Dashboard para que el evaluador pueda disparar en vivo pruebas de idempotencia duplicada y saturación de rate limit (HTTP 429).
