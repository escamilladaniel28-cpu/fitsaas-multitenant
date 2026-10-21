import { query } from './db';
import { checkRateLimit } from './rate-limit';

interface CacheItem {
  timestamp: number;
  data: string;
}

const aiCache = new Map<string, CacheItem>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache to protect quota

export async function generateGymInsights(tenantSchema: string, tenantName: string): Promise<{
  insights: string;
  source: 'ai' | 'cache' | 'fallback';
  modelUsed: string;
}> {
  // 1. Check Cache
  const cached = aiCache.get(tenantSchema);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      insights: cached.data,
      source: 'cache',
      modelUsed: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    };
  }

  // 2. Fetch tenant summary metrics
  const sociosStats = await query<{ total: string; activos: string }>(
    `SELECT COUNT(*) as total, 
            COUNT(*) FILTER (WHERE estado = 'activo') as activos 
     FROM socios;`,
    [],
    tenantSchema
  );

  const planesStats = await query<{ nombre: string; total_socios: string }>(
    `SELECT p.nombre, COUNT(s.id) as total_socios
     FROM planes p
     LEFT JOIN socios s ON s.plan_id = p.id
     GROUP BY p.id, p.nombre;`,
    [],
    tenantSchema
  );

  const asistenciasStats = await query<{ total_hoy: string }>(
    `SELECT COUNT(*) as total_hoy 
     FROM asistencias 
     WHERE fecha_hora >= CURRENT_DATE;`,
    [],
    tenantSchema
  );

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  const contextPrompt = `
Eres un consultor experto en optimización y gestión de gimnasios (SaaS FitOS).
Analiza las siguientes métricas del gimnasio "${tenantName}":
- Total de socios registrados: ${sociosStats[0]?.total || 0}
- Socios activos: ${sociosStats[0]?.activos || 0}
- Asistencias registradas hoy: ${asistenciasStats[0]?.total_hoy || 0}
- Distribución de membresías:
${planesStats.map((p) => `  * ${p.nombre}: ${p.total_socios} socios`).join('\n')}

Por favor provee un análisis conciso y profesional en español con:
1. Diagnóstico rápido del estado del gimnasio.
2. 2 Recomendaciones estratégicas para retención o aumento de ingresos.
3. Sugerencia motivacional para el equipo.
Usa viñetas limpias y sé directo.
`;

  if (!apiKey) {
    const fallbackText = `**Diagnóstico Rápido:** El gimnasio cuenta con ${sociosStats[0]?.total || 0} socios inscritos y ${asistenciasStats[0]?.total_hoy || 0} accesos registrados hoy.
**Recomendaciones:**
• Impulsar el plan más popular mediante campañas de fidelización para socios inactivos.
• Monitorear las horas pico para optimizar la disponibilidad de entrenadores en sala.
*(Nota: Configura GEMINI_API_KEY en .env para habilitar el análisis en vivo con Gemini)*`;

    return {
      insights: fallbackText,
      source: 'fallback',
      modelUsed: model,
    };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: contextPrompt }] }],
      }),
    });

    if (response.status === 429) {
      return {
        insights:
          'Se ha alcanzado la cuota de peticiones por minuto del modelo de IA en el plan gratuito. Por favor intenta de nuevo en unos minutos.',
        source: 'fallback',
        modelUsed: model,
      };
    }

    if (!response.ok) {
      throw new Error(`Gemini API respondió con status ${response.status}`);
    }

    const data = await response.json();
    const generatedText =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No se pudo generar el análisis en este momento.';

    // Save to cache
    aiCache.set(tenantSchema, {
      timestamp: Date.now(),
      data: generatedText,
    });

    return {
      insights: generatedText,
      source: 'ai',
      modelUsed: model,
    };
  } catch (err: any) {
    console.error('Error llamando a Gemini:', err.message);
    return {
      insights:
        'El servicio de análisis inteligente está temporalmente indispuesto. Intenta más tarde.',
      source: 'fallback',
      modelUsed: model,
    };
  }
}
