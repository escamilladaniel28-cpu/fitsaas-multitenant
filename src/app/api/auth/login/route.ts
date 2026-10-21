import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword, signToken, setSessionCookie } from '@/lib/auth';
import { checkRateLimit, buildRateLimitResponse } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

  // Rate Limiting: max 5 login attempts per minute per IP (Strict security requirement 4.5)
  const rateLimit = checkRateLimit(`login:${ip}`, { limit: 5, windowMs: 60000 });
  if (!rateLimit.isAllowed) {
    return buildRateLimitResponse(rateLimit.limit, rateLimit.remaining, rateLimit.resetInSeconds);
  }

  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña requeridos' },
        { status: 400 }
      );
    }

    // Find user and join tenant info
    const users = await query<{
      id: string;
      email: string;
      password_hash: string;
      name: string;
      role: string;
      tenant_id: string;
      tenant_slug: string;
      tenant_name: string;
      tenant_schema: string;
    }>(
      `SELECT u.id, u.email, u.password_hash, u.name, u.role, 
              t.id as tenant_id, t.slug as tenant_slug, t.name as tenant_name, t.schema_name as tenant_schema
       FROM public.users u
       JOIN public.tenants t ON u.tenant_id = t.id
       WHERE u.email = $1
       LIMIT 1;`,
      [email.toLowerCase().trim()]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    const user = users[0];
    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Generate JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenant_id,
      tenantSlug: user.tenant_slug,
      tenantName: user.tenant_name,
      tenantSchema: user.tenant_schema,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      tenant: {
        id: user.tenant_id,
        slug: user.tenant_slug,
        name: user.tenant_name,
        schemaName: user.tenant_schema,
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Error en login:', error);
    return NextResponse.json(
      { error: 'Error interno en el servidor', details: error.message },
      { status: 500 }
    );
  }
}
