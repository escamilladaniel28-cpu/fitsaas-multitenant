import { NextRequest, NextResponse } from 'next/server';
import { initGlobalSchema, provisionTenantAtomic } from '@/lib/tenants';
import { query } from '@/lib/db';
import { hashPassword, signToken, setSessionCookie } from '@/lib/auth';
import { withIdempotency } from '@/lib/idempotency';
import { checkRateLimit, buildRateLimitResponse } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // Rate limiting (10 peticiones/min por IP)
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = checkRateLimit(`register-tenant:${ip}`, { limit: 10, windowMs: 60000 });
  if (!rateLimit.isAllowed) {
    return buildRateLimitResponse(rateLimit.limit, rateLimit.remaining, rateLimit.resetInSeconds);
  }

  // Asegurar que las tablas globales existan ANTES de usar idempotencia
  await initGlobalSchema();

  const idempotencyKey = req.headers.get('idempotency-key');
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Cuerpo de solicitud requerido' }, { status: 400 });
  }

  return withIdempotency(idempotencyKey, '/api/auth/register-tenant', undefined, body, async () => {
    try {
      const { tenantName, slug, adminName, email, password } = body;

      // Validaciones básicas de entrada
      if (!tenantName || !slug || !adminName || !email || !password) {
        return NextResponse.json(
          { error: 'Todos los campos son obligatorios' },
          { status: 400 }
        );
      }

      const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
      if (cleanSlug.length < 3) {
        return NextResponse.json(
          { error: 'El identificador del gimnasio (slug) debe tener al menos 3 caracteres' },
          { status: 400 }
        );
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'El formato del correo electrónico es inválido' },
          { status: 400 }
        );
      }

      if (password.length < 6) {
        return NextResponse.json(
          { error: 'La contraseña debe tener al menos 6 caracteres' },
          { status: 400 }
        );
      }

      // Chequeo rápido previo (evita hashear contraseña si ya existe)
      const existingTenant = await query(
        `SELECT id FROM public.tenants WHERE slug = $1 LIMIT 1;`,
        [cleanSlug]
      );
      if (existingTenant.length > 0) {
        return NextResponse.json(
          { error: `El slug '${cleanSlug}' ya está en uso por otro gimnasio.` },
          { status: 409 }
        );
      }

      const existingUser = await query(
        `SELECT id FROM public.users WHERE email = $1 LIMIT 1;`,
        [email.toLowerCase().trim()]
      );
      if (existingUser.length > 0) {
        return NextResponse.json(
          { error: 'El correo electrónico ya se encuentra registrado.' },
          { status: 409 }
        );
      }

      // Hasheo de contraseña antes de la transacción SQL
      const passwordHash = await hashPassword(password);

      // Ejecución atómica en una única transacción
      const { tenant, user } = await provisionTenantAtomic({
        tenantName,
        slug: cleanSlug,
        adminName,
        email,
        passwordHash,
      });

      // Emisión de JWT y cookie de sesión
      const token = signToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
        tenantSchema: tenant.schemaName,
      });

      await setSessionCookie(token);

      // Despacho asíncrono opcional de webhook n8n
      import('@/lib/webhooks').then(({ dispatchWebhook }) => {
        dispatchWebhook('tenant.created', {
          tenantId: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          adminEmail: user.email,
        }).catch(() => {});
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Gimnasio y schema aprovisionados con éxito',
          tenant,
          user,
        },
        { status: 201 }
      );
    } catch (error: any) {
      // Regla 3: Si es 409 (violación de unicidad), responder 409 y no 500
      if (error.statusCode === 409 || error.code === '23505') {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }

      // Errores internos reales protegidos (P1.3)
      console.error('[/api/auth/register-tenant]', error);
      return NextResponse.json(
        { error: 'internal_error', message: 'Ha ocurrido un error interno' },
        { status: 500 }
      );
    }
  });
}
