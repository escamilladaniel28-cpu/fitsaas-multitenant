import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { withIdempotency } from '@/lib/idempotency';
import { checkRateLimit, buildRateLimitResponse } from '@/lib/rate-limit';
import { z } from 'zod';

const createAsistenciaSchema = z.object({
  socioId: z.string().uuid('El ID del socio debe ser un UUID válido'),
  tipoAcceso: z.enum(['entrada', 'salida']).default('entrada'),
  observaciones: z.string().max(500, 'Las observaciones no pueden exceder 500 caracteres').optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const asistencias = await query(
      `SELECT a.id, a.socio_id, a.fecha_hora, a.tipo_acceso, a.observaciones,
              s.nombre as socio_nombre, s.documento as socio_documento, s.estado as socio_estado,
              p.nombre as plan_nombre
       FROM asistencias a
       JOIN socios s ON a.socio_id = s.id
       LEFT JOIN planes p ON s.plan_id = p.id
       ORDER BY a.fecha_hora DESC
       LIMIT 50;`,
      [],
      session.tenantSchema
    );

    return NextResponse.json({ asistencias });
  } catch (error: any) {
    console.error('[/api/asistencias GET]', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Ha ocurrido un error interno' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Rate Limiting
  const rateLimit = checkRateLimit(`checkin:${session.tenantId}`, {
    limit: 60,
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

  return withIdempotency(idempotencyKey, '/api/asistencias', session.tenantId, body, async () => {
    try {
      const parsed = createAsistenciaSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'validation_error', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { socioId, tipoAcceso, observaciones } = parsed.data;

      // Verify socio exists and check status
      const socioRows = await query<{ id: string; nombre: string; estado: string }>(
        `SELECT id, nombre, estado FROM socios WHERE id = $1 LIMIT 1;`,
        [socioId],
        session.tenantSchema
      );

      if (socioRows.length === 0) {
        return NextResponse.json({ error: 'Socio no encontrado' }, { status: 404 });
      }

      const socio = socioRows[0];
      if (socio.estado !== 'activo') {
        return NextResponse.json(
          {
            error: `El socio se encuentra en estado '${socio.estado}'. No se permite el acceso.`,
            socio,
          },
          { status: 403 }
        );
      }

      const rows = await query(
        `INSERT INTO asistencias (socio_id, tipo_acceso, observaciones)
         VALUES ($1, $2, $3)
         RETURNING id, socio_id, fecha_hora, tipo_acceso, observaciones;`,
        [socioId, tipoAcceso, observaciones || 'Acceso regular registrado'],
        session.tenantSchema
      );

      return NextResponse.json(
        {
          success: true,
          message: `Acceso concedido a ${socio.nombre}`,
          asistencia: rows[0],
          socio,
        },
        { status: 201 }
      );
    } catch (error: any) {
      console.error('[/api/asistencias POST]', error);
      return NextResponse.json(
        { error: 'internal_error', message: 'Ha ocurrido un error interno' },
        { status: 500 }
      );
    }
  });
}
