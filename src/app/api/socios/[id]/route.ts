import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { z } from 'zod';

const uuidSchema = z.string().uuid({ message: 'ID de socio debe ser un UUID válido' });

const updateSocioSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre no puede estar vacío').optional(),
  documento: z.string().trim().min(1, 'El documento no puede estar vacío').optional(),
  email: z.string().trim().email('Formato de correo electrónico inválido').optional().nullable(),
  telefono: z.string().trim().optional().nullable(),
  estado: z.enum(['activo', 'inactivo', 'suspendido']).optional(),
  planId: z.string().uuid('El planId debe ser un UUID válido').optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'ID de socio inválido' }, { status: 400 });
  }

  try {
    const rows = await query(
      `SELECT s.*, p.nombre as plan_nombre, p.precio as plan_precio 
       FROM socios s
       LEFT JOIN planes p ON s.plan_id = p.id
       WHERE s.id = $1 LIMIT 1;`,
      [id],
      session.tenantSchema
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Socio no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ socio: rows[0] });
  } catch (error: any) {
    console.error('[/api/socios/[id] GET]', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Ha ocurrido un error interno' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'ID de socio inválido' }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Cuerpo de solicitud requerido' }, { status: 400 });
    }

    const parsed = updateSocioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { planId, nombre, documento, email, telefono, estado } = parsed.data;

    // Si se envía planId, validar existencia en planes
    if (planId) {
      const planRows = await query(
        `SELECT id FROM planes WHERE id = $1 LIMIT 1;`,
        [planId],
        session.tenantSchema
      );
      if (planRows.length === 0) {
        return NextResponse.json({ error: 'El plan especificado no existe' }, { status: 400 });
      }
    }

    const rows = await query(
      `UPDATE socios
       SET plan_id = COALESCE($1, plan_id),
           nombre = COALESCE($2, nombre),
           documento = COALESCE($3, documento),
           email = COALESCE($4, email),
           telefono = COALESCE($5, telefono),
           estado = COALESCE($6, estado)
       WHERE id = $7
       RETURNING *;`,
      [planId !== undefined ? planId : null, nombre, documento, email, telefono, estado, id],
      session.tenantSchema
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Socio no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, socio: rows[0] });
  } catch (error: any) {
    console.error('[/api/socios/[id] PUT]', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Ha ocurrido un error interno' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'ID de socio inválido' }, { status: 400 });
  }

  try {
    const rows = await query(
      `DELETE FROM socios WHERE id = $1 RETURNING id;`,
      [id],
      session.tenantSchema
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Socio no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Socio eliminado' });
  } catch (error: any) {
    console.error('[/api/socios/[id] DELETE]', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Ha ocurrido un error interno' },
      { status: 500 }
    );
  }
}
