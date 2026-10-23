import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { withIdempotency } from '@/lib/idempotency';
import { checkRateLimit, buildRateLimitResponse } from '@/lib/rate-limit';
import { z } from 'zod';

const createClaseSchema = z
  .object({
    nombre: z.string().trim().min(1, 'El nombre de la clase es obligatorio').max(100),
    instructor: z.string().trim().min(1, 'El nombre del instructor es obligatorio').max(100),
    horario: z.string().min(1, 'El horario es obligatorio'),
    cupos: z.coerce.number().int().positive('Los cupos deben ser un número entero mayor a 0').optional(),
    cuposTotales: z.coerce.number().int().positive('Los cupos deben ser un número entero mayor a 0').optional(),
    cupos_totales: z.coerce.number().int().positive('Los cupos deben ser un número entero mayor a 0').optional(),
  })
  .refine(
    (data) =>
      data.cupos !== undefined ||
      data.cuposTotales !== undefined ||
      data.cupos_totales !== undefined,
    {
      message: 'Los cupos totales son obligatorios y deben ser mayor a 0',
      path: ['cuposTotales'],
    }
  );

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const clases = await query(
      `SELECT c.id, c.nombre, c.instructor, c.horario, c.cupos_totales, c.created_at,
              COALESCE((SELECT COUNT(*)::int FROM reservas r WHERE r.clase_id = c.id), 0) as reservas_count,
              (c.cupos_totales - COALESCE((SELECT COUNT(*)::int FROM reservas r WHERE r.clase_id = c.id), 0)) as cupos_disponibles
       FROM clases c
       ORDER BY c.horario ASC;`,
      [],
      session.tenantSchema
    );

    return NextResponse.json({ clases });
  } catch (error: any) {
    console.error('[/api/clases GET]', error);
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

  // Rate Limiting: max 30 creaciones por minuto por tenant
  const rateLimit = checkRateLimit(`create-clase:${session.tenantId}`, {
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

  return withIdempotency(idempotencyKey, '/api/clases', session.tenantId, body, async () => {
    try {
      const parsed = createClaseSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'validation_error', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { nombre, instructor, horario } = parsed.data;
      const cuposTotales = parsed.data.cuposTotales ?? parsed.data.cupos_totales ?? parsed.data.cupos!;

      const parsedDate = new Date(horario);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: 'Formato de fecha u horario inválido' },
          { status: 400 }
        );
      }

      const rows = await query(
        `INSERT INTO clases (nombre, instructor, horario, cupos_totales)
         VALUES ($1, $2, $3, $4)
         RETURNING id, nombre, instructor, horario, cupos_totales, created_at;`,
        [nombre, instructor, parsedDate.toISOString(), cuposTotales],
        session.tenantSchema
      );

      return NextResponse.json(
        {
          success: true,
          message: 'Clase creada con éxito',
          clase: rows[0],
        },
        { status: 201 }
      );
    } catch (error: any) {
      console.error('[/api/clases POST]', error);
      return NextResponse.json(
        { error: 'internal_error', message: 'Ha ocurrido un error interno' },
        { status: 500 }
      );
    }
  });
}
