import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { generateGymInsights } from '@/lib/gemini';
import { checkRateLimit, buildRateLimitResponse } from '@/lib/rate-limit';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Rate Limiting on AI endpoint: max 5 requests per 2 minutes per tenant
  const rateLimit = checkRateLimit(`ai:${session.tenantId}`, {
    limit: 5,
    windowMs: 120000,
  });
  if (!rateLimit.isAllowed) {
    return buildRateLimitResponse(rateLimit.limit, rateLimit.remaining, rateLimit.resetInSeconds);
  }

  try {
    const result = await generateGymInsights(session.tenantSchema, session.tenantName);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error en AI analytics route:', error);
    return NextResponse.json(
      { error: 'Error al generar análisis con IA', details: error.message },
      { status: 500 }
    );
  }
}
