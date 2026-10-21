import { NextRequest, NextResponse } from 'next/server';
import { initGlobalSchema, createTenantSchema } from '@/lib/tenants';
import { query } from '@/lib/db';
import { hashPassword, signToken, setSessionCookie } from '@/lib/auth';
import { withIdempotency } from '@/lib/idempotency';
import { checkRateLimit, buildRateLimitResponse } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // Rate limiting for tenant registration (max 10 requests per minute per IP)
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = checkRateLimit(`register-tenant:${ip}`, { limit: 10, windowMs: 60000 });
  if (!rateLimit.isAllowed) {
    return buildRateLimitResponse(rateLimit.limit, rateLimit.remaining, rateLimit.resetInSeconds);
  }

  const idempotencyKey = req.headers.get('idempotency-key');

  return withIdempotency(idempotencyKey, '/api/auth/register-tenant', undefined, async () => {
    try {
      const body = await req.json();
      const { tenantName, slug, adminName, email, password } = body;

      // Validation
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

      // Ensure global tables exist
      await initGlobalSchema();

      // Check if tenant slug already exists
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

      // Check if user email already exists
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

      // 1. Create dedicated tenant PostgreSQL schema and tables
      const schemaName = await createTenantSchema(cleanSlug, tenantName);

      // 2. Insert tenant record into public.tenants
      const tenantRows = await query<{ id: string; slug: string; name: string; schema_name: string }>(
        `INSERT INTO public.tenants (name, slug, schema_name)
         VALUES ($1, $2, $3)
         RETURNING id, slug, name, schema_name;`,
        [tenantName.trim(), cleanSlug, schemaName]
      );
      const tenant = tenantRows[0];

      // 3. Create admin user in public.users
      const passwordHash = await hashPassword(password);
      const userRows = await query<{ id: string; email: string; name: string; role: string }>(
        `INSERT INTO public.users (tenant_id, email, password_hash, name, role)
         VALUES ($1, $2, $3, $4, 'admin')
         RETURNING id, email, name, role;`,
        [tenant.id, email.toLowerCase().trim(), passwordHash, adminName.trim()]
      );
      const user = userRows[0];

      // 4. Generate JWT & Set httpOnly cookie
      const token = signToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
        tenantSchema: tenant.schema_name,
      });

      await setSessionCookie(token);

      // Trigger optional n8n webhook asynchronously
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
          tenant: {
            id: tenant.id,
            slug: tenant.slug,
            name: tenant.name,
            schemaName: tenant.schema_name,
          },
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        },
        { status: 201 }
      );
    } catch (error: any) {
      console.error('Error al registrar tenant:', error);
      return NextResponse.json(
        { error: 'Error interno al aprovisionar el tenant', details: error.message },
        { status: 500 }
      );
    }
  });
}
