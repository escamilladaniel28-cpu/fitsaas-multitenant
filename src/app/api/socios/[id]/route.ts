import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;

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
    return NextResponse.json({ error: 'Error al buscar socio' }, { status: 500 });
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

  try {
    const body = await req.json();
    const { planId, nombre, documento, email, telefono, estado } = body;

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
      [planId || null, nombre, documento, email, telefono, estado, id],
      session.tenantSchema
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Socio no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, socio: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al actualizar socio' }, { status: 500 });
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
    return NextResponse.json({ error: 'Error al eliminar socio' }, { status: 500 });
  }
}
