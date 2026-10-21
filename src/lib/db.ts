import { Pool, PoolClient } from 'pg';

// Singleton pool for PostgreSQL
const globalForDb = globalThis as unknown as { dbPool: Pool };

export const pool =
  globalForDb.dbPool ||
  new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5436/fitsaas_db',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.dbPool = pool;
}

/**
 * Execute query on public schema or specified schema using SET search_path
 */
export async function query<T = any>(
  text: string,
  params: any[] = [],
  schemaName?: string
): Promise<T[]> {
  const client = await pool.connect();
  try {
    if (schemaName) {
      // Sanitize schema name to prevent SQL injection
      const sanitizedSchema = schemaName.replace(/[^a-zA-Z0-9_]/g, '');
      await client.query(`SET search_path TO "${sanitizedSchema}", public;`);
    } else {
      await client.query(`SET search_path TO public;`);
    }
    const res = await client.query(text, params);
    return res.rows as T[];
  } finally {
    // Reset search path before releasing back to pool
    await client.query(`SET search_path TO public;`).catch(() => {});
    client.release();
  }
}

/**
 * Run operations within a transaction scoped to a specific tenant schema
 */
export async function withTenantTransaction<T>(
  schemaName: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sanitizedSchema = schemaName.replace(/[^a-zA-Z0-9_]/g, '');
    await client.query(`SET search_path TO "${sanitizedSchema}", public;`);
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.query(`SET search_path TO public;`).catch(() => {});
    client.release();
  }
}
