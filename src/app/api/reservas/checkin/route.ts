import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { withTenantTransaction, query } from '@/lib/db';
import { checkRateLimit, buildRateLimitResponse } from '@/lib/rate-limit';
import { z } from 'zod';

const checkinSchema = z.object({
  pin: z
    .string()
    .trim()
    .min(4, 'El PIN debe tener al menos 4 caracteres')
    .max(10, 'El PIN no puede exceder 10 caracteres'),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Rate Limiting para checkin de reservas: max 60 por minuto
  const rateLimit = checkRateLimit(`reserva-checkin:${session.tenantId}`, {
    limit: 60,
    windowMs: 60000,
  });
  if (!rateLimit.isAllowed) {
    return buildRateLimitResponse(rateLimit.limit, rateLimit.remaining, rateLimit.resetInSeconds);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Cuerpo de solicitud requerido' }, { status: 400 });
    }

    const parsed = checkinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { pin } = parsed.data;

    // Ejecutar check-in de forma atómica dentro del schema del tenant
    const result = await withTenantTransaction(session.tenantSchema, async (client) => {
      // 1. Buscar la reserva pendiente con ese PIN con bloqueo de fila (FOR UPDATE)
      const resQuery = await client.query<{
        id: string;
        clase_id: string;
        socio_id: string;
        estado: string;
        codigo_pin: string;
        socio_nombre: string;
        socio_documento: string;
        clase_nombre: string;
        clase_instructor: string;
        clase_horario: string;
      }>(
        `SELECT r.id, r.clase_id, r.socio_id, r.estado, r.codigo_pin,
                s.nombre as socio_nombre, s.documento as socio_documento,
                c.nombre as clase_nombre, c.instructor as clase_instructor, c.horario as clase_horario
         FROM reservas r
         JOIN socios s ON r.socio_id = s.id
         JOIN clases c ON r.clase_id = c.id
         WHERE r.codigo_pin = $1
         FOR UPDATE OF r;`,
        [pin]
      );

      if (resQuery.rows.length === 0) {
        return { status: 404, error: 'Código PIN no encontrado o no existe reserva asociada' };
      }

      const reserva = resQuery.rows[0];

      if (reserva.estado === 'asistio') {
        return {
          status: 409,
          error: `El PIN ya fue utilizado previamente para el check-in de ${reserva.socio_nombre}`,
        };
      }

      // a. Cambiar el estado de la reserva a 'asistio'
      const updateRes = await client.query(
        `UPDATE reservas
         SET estado = 'asistio'
         WHERE id = $1
         RETURNING id, clase_id, socio_id, estado, codigo_pin;`,
        [reserva.id]
      );
      const reservaActualizada = updateRes.rows[0];

      // b. REGISTRA UNA ASISTENCIA en la tabla asistencias del tenant
      const asistenciaRes = await client.query(
        `INSERT INTO asistencias (socio_id, tipo_acceso, observaciones)
         VALUES ($1, 'entrada', $2)
         RETURNING id, socio_id, fecha_hora, tipo_acceso, observaciones;`,
        [
          reserva.socio_id,
          `Check-in de clase: ${reserva.clase_nombre} con instructor ${reserva.clase_instructor} (PIN: ${pin})`,
        ]
      );
      const nuevaAsistencia = asistenciaRes.rows[0];

      // c. Retornar datos consolidados
      return {
        status: 200,
        data: {
          success: true,
          message: `Check-in exitoso para ${reserva.socio_nombre} en la clase ${reserva.clase_nombre}`,
          reserva: reservaActualizada,
          socio: {
            id: reserva.socio_id,
            nombre: reserva.socio_nombre,
            documento: reserva.socio_documento,
          },
          clase: {
            id: reserva.clase_id,
            nombre: reserva.clase_nombre,
            instructor: reserva.clase_instructor,
            horario: reserva.clase_horario,
          },
          asistencia: nuevaAsistencia,
        },
      };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, { status: 200 });
  } catch (error: any) {
    console.error('[/api/reservas/checkin POST]', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Ha ocurrido un error interno al procesar el check-in' },
      { status: 500 }
    );
  }
}
