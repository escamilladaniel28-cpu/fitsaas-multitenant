import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { withIdempotency } from '@/lib/idempotency';
import { checkRateLimit, buildRateLimitResponse } from '@/lib/rate-limit';
import { z } from 'zod';

const createReservaSchema = z
  .object({
    claseId: z.string().uuid('El claseId debe ser un UUID válido').optional(),
    clase_id: z.string().uuid('El clase_id debe ser un UUID válido').optional(),
    socioId: z.string().uuid('El socioId debe ser un UUID válido').optional(),
    socio_id: z.string().uuid('El socio_id debe ser un UUID válido').optional(),
  })
  .refine((data) => data.claseId || data.clase_id, {
    message: 'El identificador de la clase (claseId) es obligatorio',
    path: ['claseId'],
  })
  .refine((data) => data.socioId || data.socio_id, {
    message: 'El identificador del socio (socioId) es obligatorio',
    path: ['socioId'],
  });

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const claseId = searchParams.get('claseId');
  const socioId = searchParams.get('socioId');
  const estado = searchParams.get('estado');

  try {
    let sql = `
      SELECT r.id, r.clase_id, r.socio_id, r.estado, r.codigo_pin, r.created_at,
             s.nombre as socio_nombre, s.documento as socio_documento, s.email as socio_email,
             c.nombre as clase_nombre, c.instructor as clase_instructor, c.horario as clase_horario
      FROM reservas r
      JOIN socios s ON r.socio_id = s.id
      JOIN clases c ON r.clase_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (claseId) {
      params.push(claseId);
      sql += ` AND r.clase_id = $${params.length}`;
    }

    if (socioId) {
      params.push(socioId);
      sql += ` AND r.socio_id = $${params.length}`;
    }

    if (estado) {
      params.push(estado);
      sql += ` AND r.estado = $${params.length}`;
    }

    sql += ` ORDER BY r.created_at DESC;`;

    const reservas = await query(sql, params, session.tenantSchema);
    return NextResponse.json({ reservas });
  } catch (error: any) {
    console.error('[/api/reservas GET]', error);
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

  // Rate Limiting: max 45 reservas por minuto por tenant
  const rateLimit = checkRateLimit(`create-reserva:${session.tenantId}`, {
    limit: 45,
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

  return withIdempotency(idempotencyKey, '/api/reservas', session.tenantId, body, async () => {
    try {
      const parsed = createReservaSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'validation_error', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const claseId = parsed.data.claseId || parsed.data.clase_id!;
      const socioId = parsed.data.socioId || parsed.data.socio_id!;

      // 1. Validar que la clase exista y tenga cupos disponibles
      const claseRows = await query<{
        id: string;
        nombre: string;
        cupos_totales: number;
        instructor: string;
        horario: string;
        reservas_count: number;
      }>(
        `SELECT c.id, c.nombre, c.cupos_totales, c.instructor, c.horario,
                (SELECT COUNT(*)::int FROM reservas r WHERE r.clase_id = c.id) as reservas_count
         FROM clases c
         WHERE c.id = $1
         LIMIT 1;`,
        [claseId],
        session.tenantSchema
      );

      if (claseRows.length === 0) {
        return NextResponse.json({ error: 'La clase especificada no existe' }, { status: 404 });
      }

      const clase = claseRows[0];
      if (clase.reservas_count >= clase.cupos_totales) {
        return NextResponse.json(
          { error: 'No hay cupos disponibles en esta clase', cuposTotales: clase.cupos_totales },
          { status: 409 }
        );
      }

      // 2. Validar que el socio exista y esté activo
      const socioRows = await query<{ id: string; nombre: string; estado: string; documento: string }>(
        `SELECT id, nombre, estado, documento FROM socios WHERE id = $1 LIMIT 1;`,
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
            error: `El socio se encuentra en estado '${socio.estado}'. No se permite realizar reservas.`,
            socio,
          },
          { status: 403 }
        );
      }

      // 3. Verificar si ya tiene una reserva pendiente para esta clase
      const existingReserva = await query(
        `SELECT id FROM reservas WHERE clase_id = $1 AND socio_id = $2 AND estado = 'pendiente' LIMIT 1;`,
        [claseId, socioId],
        session.tenantSchema
      );

      if (existingReserva.length > 0) {
        return NextResponse.json(
          { error: 'El socio ya cuenta con una reserva pendiente para esta clase' },
          { status: 409 }
        );
      }

      // 4. Generar PIN de 6 dígitos
      const codigoPin = Math.floor(100000 + Math.random() * 900000).toString();

      // 5. Guardar la reserva
      const insertRows = await query(
        `INSERT INTO reservas (clase_id, socio_id, estado, codigo_pin)
         VALUES ($1, $2, 'pendiente', $3)
         RETURNING id, clase_id, socio_id, estado, codigo_pin, created_at;`,
        [claseId, socioId, codigoPin],
        session.tenantSchema
      );

      const reserva = insertRows[0];

      return NextResponse.json(
        {
          success: true,
          message: 'Reserva realizada exitosamente',
          reserva,
          socio: {
            id: socio.id,
            nombre: socio.nombre,
            documento: socio.documento,
          },
          clase: {
            id: clase.id,
            nombre: clase.nombre,
            instructor: clase.instructor,
            horario: clase.horario,
          },
        },
        { status: 201 }
      );
    } catch (error: any) {
      console.error('[/api/reservas POST]', error);
      return NextResponse.json(
        { error: 'internal_error', message: 'Ha ocurrido un error interno' },
        { status: 500 }
      );
    }
  });
}
