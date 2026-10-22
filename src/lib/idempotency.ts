import { query } from './db';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  return '{' + Object.keys(obj).sort().map((k) => 
    JSON.stringify(k) + ':' + stableStringify(obj[k])
  ).join(',') + '}';
}

export interface IdempotencyRecord {
  id?: string;
  key: string;
  tenant_id?: string;
  endpoint: string;
  request_hash?: string;
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
  bodyOrHandler: any,
  maybeHandler?: () => Promise<NextResponse>
): Promise<NextResponse> {
  let requestBody: any = null;
  let handler: () => Promise<NextResponse>;

  if (typeof bodyOrHandler === 'function') {
    handler = bodyOrHandler;
  } else {
    requestBody = bodyOrHandler;
    if (!maybeHandler) {
      throw new Error('withIdempotency: handler required when body is provided');
    }
    handler = maybeHandler;
  }

  // If client didn't supply an Idempotency-Key, proceed normally
  if (!key || key.trim() === '') {
    return await handler();
  }

  const cleanKey = key.trim();
  const requestHash = requestBody !== null && requestBody !== undefined
    ? crypto.createHash('sha256').update(typeof requestBody === 'string' ? requestBody : stableStringify(requestBody)).digest('hex')
    : null;

  // 0. Clean expired record for this key/endpoint/tenant to prevent stale unique conflicts
  await query(
    `DELETE FROM public.idempotency_records 
     WHERE key = $1 AND endpoint = $2 AND tenant_id IS NOT DISTINCT FROM $3 
       AND expires_at <= NOW();`,
    [cleanKey, endpoint, tenantId || null]
  );

  // 1. Look for existing valid cached response scoped to (tenant_id, endpoint, key)
  const existing = await query<IdempotencyRecord>(
    `SELECT * FROM public.idempotency_records 
     WHERE key = $1 AND endpoint = $2 AND tenant_id IS NOT DISTINCT FROM $3 AND expires_at > NOW() 
     LIMIT 1;`,
    [cleanKey, endpoint, tenantId || null]
  );

  if (existing.length > 0) {
    const cached = existing[0];
    if (requestHash && cached.request_hash && requestHash !== cached.request_hash) {
      return NextResponse.json(
        { error: 'idempotency_key_reused', message: 'Idempotency key already used with different request payload' },
        { status: 422 }
      );
    }
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
           (key, tenant_id, endpoint, request_hash, status_code, response_body, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '24 hours')
           ON CONFLICT (tenant_id, endpoint, key) DO UPDATE
             SET response_body = EXCLUDED.response_body,
                 status_code   = EXCLUDED.status_code,
                 request_hash  = EXCLUDED.request_hash,
                 expires_at    = EXCLUDED.expires_at
             WHERE public.idempotency_records.expires_at <= NOW();`,
          [
            cleanKey,
            tenantId || null,
            endpoint,
            requestHash,
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
