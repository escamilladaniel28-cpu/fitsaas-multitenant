import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { withIdempotency } from '@/lib/idempotency';
import { checkRateLimit, buildRateLimitResponse } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('q') || '';
  const estado = searchParams.get('estado') || '';

  try {
    let sql = `
      SELECT s.id, s.plan_id, s.nombre, s.documento, s.email, s.telefono, 
             s.fecha_inicio, s.estado, s.created_at,
             p.nombre as plan_nombre, p.precio as plan_precio
      FROM socios s
      LEFT JOIN planes p ON s.plan_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (s.nombre ILIKE $${params.length} OR s.documento ILIKE $${params.length})`;
    }

    if (estado) {
      params.push(estado);
      sql += ` AND s.estado = $${params.length}`;
    }

    sql += ` ORDER BY s.created_at DESC;`;

    const socios = await query(sql, params, session.tenantSchema);
    return NextResponse.json({ socios });
  } catch (error: any) {
    console.error('Error al listar socios:', error);
    return NextResponse.json({ error: 'Error al consultar socios' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Rate Limiting: max 30 creations per minute per tenant
  const rateLimit = checkRateLimit(`create-socio:${session.tenantId}`, {
    limit: 30,
    windowMs: 60000,
  });
  if (!rateLimit.isAllowed) {
    return buildRateLimitResponse(rateLimit.limit, rateLimit.remaining, rateLimit.resetInSeconds);
  }

  const idempotencyKey = req.headers.get('idempotency-key');

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Cuerpo de solicitud requerido' }, { status: 400 });
  }

  return withIdempotency(idempotencyKey, '/api/socios', session.tenantId, body, async () => {
    try {

      const { planId, nombre, documento, email, telefono, fechaInicio, estado } = body;

      if (!nombre || !documento) {
        return NextResponse.json(
          { error: 'Nombre y documento son obligatorios' },
          { status: 400 }
        );
      }

      // Check if document already exists in this tenant
      const existing = await query(
        `SELECT id FROM socios WHERE documento = $1 LIMIT 1;`,
        [documento.trim()],
        session.tenantSchema
      );
      if (existing.length > 0) {
        return NextResponse.json(
          { error: 'Ya existe un socio con este documento en el gimnasio' },
          { status: 409 }
        );
      }

      const rows = await query(
        `INSERT INTO socios (plan_id, nombre, documento, email, telefono, fecha_inicio, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, plan_id, nombre, documento, email, telefono, fecha_inicio, estado, created_at;`,
        [
          planId || null,
          nombre.trim(),
          documento.trim(),
          email ? email.trim() : null,
          telefono ? telefono.trim() : null,
          fechaInicio || new Date().toISOString().split('T')[0],
          estado || 'activo',
        ],
        session.tenantSchema
      );

      return NextResponse.json(
        { success: true, message: 'Socio registrado con éxito', socio: rows[0] },
        { status: 201 }
      );
    } catch (error: any) {
      console.error('Error al crear socio:', error);
      return NextResponse.json({ error: 'Error al registrar socio' }, { status: 500 });
    }
  });
}
