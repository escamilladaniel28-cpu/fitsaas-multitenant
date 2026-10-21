import { query } from './db';
import { NextResponse } from 'next/server';

export interface IdempotencyRecord {
  key: string;
  tenant_id?: string;
  endpoint: string;
  status_code: number;
  response_body: any;
  created_at: Date;
  expires_at: Date;
}

/**
 * Checks if an Idempotency-Key has already been processed.
 * If yes, returns the cached NextResponse.
 * If no, executes the operation and stores the response with a 24h TTL.
 */
export async function withIdempotency(
  key: string | null,
  endpoint: string,
  tenantId: string | undefined,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  // If client didn't supply an Idempotency-Key, proceed normally
  if (!key || key.trim() === '') {
    return await handler();
  }

  const cleanKey = key.trim();

  // 1. Look for existing valid cached response
  const existing = await query<IdempotencyRecord>(
    `SELECT * FROM public.idempotency_records 
     WHERE key = $1 AND expires_at > NOW() 
     LIMIT 1;`,
    [cleanKey]
  );

  if (existing.length > 0) {
    const cached = existing[0];
    const res = NextResponse.json(cached.response_body, {
      status: cached.status_code,
    });
    res.headers.set('X-Idempotent-Replay', 'true');
    res.headers.set('X-Idempotency-Key', cleanKey);
    return res;
  }

  // 2. Execute original handler
  const response = await handler();

  // Only cache successful or client-validated creation responses (200, 201)
  if (response.status === 200 || response.status === 201) {
    try {
      // Clone response to read body for caching
      const bodyClone = await response.clone().json().catch(() => null);

      if (bodyClone) {
        // TTL: 24 hours
        await query(
          `INSERT INTO public.idempotency_records 
           (key, tenant_id, endpoint, status_code, response_body, expires_at)
           VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '24 hours')
           ON CONFLICT (key) DO NOTHING;`,
          [
            cleanKey,
            tenantId || null,
            endpoint,
            response.status,
            JSON.stringify(bodyClone),
          ]
        );
      }
    } catch (err) {
      console.error('Error saving idempotency record:', err);
    }
  }

  response.headers.set('X-Idempotency-Key', cleanKey);
  return response;
}
