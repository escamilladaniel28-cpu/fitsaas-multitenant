import { NextResponse } from 'next/server';
import { getSession, clearSessionCookie } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
    },
    tenant: {
      id: session.tenantId,
      slug: session.tenantSlug,
      name: session.tenantName,
      schemaName: session.tenantSchema,
    },
  });
}

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true, message: 'Sesión cerrada correctamente' });
}
