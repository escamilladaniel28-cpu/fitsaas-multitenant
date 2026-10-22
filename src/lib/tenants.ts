import { pool, query } from './db';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  schema_name: string;
  created_at: Date;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  role: string;
  created_at: Date;
}

/**
 * Ensures global tables exist in public schema
 */
export async function initGlobalSchema() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS public.tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(60) UNIQUE NOT NULL,
        name VARCHAR(120) NOT NULL,
        schema_name VARCHAR(63) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(120) NOT NULL,
        role VARCHAR(30) DEFAULT 'admin',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.idempotency_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(255) NOT NULL,
        tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
        endpoint VARCHAR(255) NOT NULL,
        request_hash VARCHAR(64),
        status_code INT NOT NULL,
        response_body JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        CONSTRAINT uq_idempotency_tenant_endpoint_key UNIQUE NULLS NOT DISTINCT (tenant_id, endpoint, key)
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
      CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
      CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON public.idempotency_records(expires_at);
    `);
  } finally {
    client.release();
  }
}

/**
 * Creates a dedicated PostgreSQL schema for a new tenant and migrates domain tables
 */
export async function createTenantSchema(slug: string, tenantName: string): Promise<string> {
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const schemaName = `tenant_${cleanSlug}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create Schema
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}";`);

    // 2. Set search path to tenant schema for table creation
    await client.query(`SET search_path TO "${schemaName}", public;`);

    // 3. Create domain tables: planes, socios, asistencias
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".planes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre VARCHAR(100) NOT NULL,
        precio NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        duracion_dias INT NOT NULL DEFAULT 30,
        descripcion TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "${schemaName}".socios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id UUID REFERENCES "${schemaName}".planes(id) ON DELETE SET NULL,
        nombre VARCHAR(120) NOT NULL,
        documento VARCHAR(50) NOT NULL,
        email VARCHAR(150),
        telefono VARCHAR(50),
        fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
        estado VARCHAR(20) NOT NULL DEFAULT 'activo',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "${schemaName}".asistencias (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        socio_id UUID NOT NULL REFERENCES "${schemaName}".socios(id) ON DELETE CASCADE,
        fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        tipo_acceso VARCHAR(20) NOT NULL DEFAULT 'entrada',
        observaciones TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_socios_documento ON "${schemaName}".socios(documento);
      CREATE INDEX IF NOT EXISTS idx_asistencias_socio ON "${schemaName}".asistencias(socio_id);
    `);

    // 4. Insert default starter plans for the gym
    await client.query(`
      INSERT INTO "${schemaName}".planes (nombre, precio, duracion_dias, descripcion)
      VALUES 
        ('Pase Diario', 15000, 1, 'Acceso individual por el día a todas las máquinas'),
        ('Membresía Mensual', 90000, 30, 'Acceso libre durante 30 días con asesoría básica'),
        ('Plan VIP Trimestral', 240000, 90, 'Acceso ilimitado por 3 meses + área de pesas y funcional')
      ON CONFLICT DO NOTHING;
    `);

    await client.query('COMMIT');
    return schemaName;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.query('SET search_path TO public;').catch(() => {});
    client.release();
  }
}
