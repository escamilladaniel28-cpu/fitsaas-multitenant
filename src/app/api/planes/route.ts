import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const planes = await query(
      `SELECT id, nombre, precio, duracion_dias, descripcion, created_at 
       FROM planes 
       ORDER BY precio ASC;`,
      [],
      session.tenantSchema
    );

    return NextResponse.json({ planes });
  } catch (error: any) {
    console.error('Error al obtener planes:', error);
    return NextResponse.json({ error: 'Error al consultar planes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { nombre, precio, duracionDias, descripcion } = body;

    if (!nombre || precio === undefined || !duracionDias) {
      return NextResponse.json(
        { error: 'Nombre, precio y duración en días son requeridos' },
        { status: 400 }
      );
    }

    const rows = await query(
      `INSERT INTO planes (nombre, precio, duracion_dias, descripcion)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, precio, duracion_dias, descripcion, created_at;`,
      [nombre.trim(), parseFloat(precio), parseInt(duracionDias, 10), descripcion || ''],
      session.tenantSchema
    );

    return NextResponse.json({ success: true, plan: rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear plan:', error);
    return NextResponse.json({ error: 'Error al registrar el plan' }, { status: 500 });
  }
}
