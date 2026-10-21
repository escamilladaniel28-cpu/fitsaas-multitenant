import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import DashboardClient from './DashboardClient';


export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Pre-fetch metrics on the server directly from the tenant's isolated schema
  let stats = {
    totalSocios: 0,
    sociosActivos: 0,
    asistenciasHoy: 0,
    totalPlanes: 0,
  };

  try {
    const sociosData = await query<{ total: string; activos: string }>(
      `SELECT COUNT(*) as total, 
              COUNT(*) FILTER (WHERE estado = 'activo') as activos 
       FROM socios;`,
      [],
      session.tenantSchema
    );

    const asistenciasData = await query<{ total_hoy: string }>(
      `SELECT COUNT(*) as total_hoy 
       FROM asistencias 
       WHERE fecha_hora >= CURRENT_DATE;`,
      [],
      session.tenantSchema
    );

    const planesData = await query<{ total: string }>(
      `SELECT COUNT(*) as total FROM planes;`,
      [],
      session.tenantSchema
    );

    stats = {
      totalSocios: parseInt(sociosData[0]?.total || '0', 10),
      sociosActivos: parseInt(sociosData[0]?.activos || '0', 10),
      asistenciasHoy: parseInt(asistenciasData[0]?.total_hoy || '0', 10),
      totalPlanes: parseInt(planesData[0]?.total || '0', 10),
    };
  } catch (error) {
    console.error('Error pre-fetching stats on server:', error);
  }

  return <DashboardClient session={session} initialStats={stats} />;
}
