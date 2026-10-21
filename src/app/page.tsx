import Link from 'next/link';
import { Dumbbell, ShieldCheck, Zap, Database, ArrowRight, Cpu } from 'lucide-react';


export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
              <Dumbbell className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                FitSaaS
              </span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Multitenant
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-300 hover:text-white transition px-4 py-2 rounded-lg hover:bg-slate-800/60"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition px-5 py-2.5 rounded-lg shadow-lg shadow-emerald-500/25 flex items-center gap-1.5"
            >
              Registrar Gimnasio <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-20 pb-24 px-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))]" />
          
          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700/60 text-xs font-medium text-emerald-400 mb-8">
              <ShieldCheck className="w-4 h-4" /> Arquitectura PostgreSQL Schema-per-Tenant Aislada
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
              Plataforma SaaS para <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Gimnasios y Centros Fitness
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Gestión multitenant de alto rendimiento: aislamiento completo de datos por schema,
              control de acceso con idempotencia garantizada, rate limiting y asistencia con IA.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2"
              >
                Aprovisionar Nuevo Gimnasio <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white transition flex items-center justify-center gap-2"
              >
                Ingresar al Panel
              </Link>
            </div>
          </div>
        </section>

        {/* Technical Highlights (Para la sustentación) */}
        <section className="py-16 border-y border-slate-900 bg-slate-900/40 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400 text-center mb-10">
              Arquitectura del Sistema Evaluado
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5">
                  <Database className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Schema por Tenant en PostgreSQL</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Cada gimnasio cuenta con su propio schema (<code className="text-emerald-400">tenant_slug</code>). Cero filtración de datos entre gimnasios con <code className="text-emerald-400">search_path</code> resuelto por JWT.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-5">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Idempotencia con Header</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Evita registros y cobros duplicados en caso de reintentos de red o doble clic mediante el header <code className="text-teal-400">Idempotency-Key</code> y caché en base de datos.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-5">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Rate Limiting & IA Gemini</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Protección contra abuso con respuestas <code className="text-cyan-400">429 (Retry-After)</code> mediante ventana deslizante, y análisis de negocio asistido por IA.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Entidades del Gimnasio */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-extrabold text-white mb-4">
              Entidades de Negocio del Tenant
            </h2>
            <p className="text-slate-400 mb-12">
              El esquema de cada gimnasio implementa las 3 entidades requeridas con operaciones completas:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
              <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60">
                <div className="text-emerald-400 font-bold mb-1">1. Planes de Membresía</div>
                <div className="text-xs text-slate-400">Tarifas, vigencia en días, tipo de acceso (Pase Diario, Mensual, VIP).</div>
              </div>
              <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60">
                <div className="text-emerald-400 font-bold mb-1">2. Socios (Miembros)</div>
                <div className="text-xs text-slate-400">Datos personales, documento, plan asignado y estado (activo, suspendido).</div>
              </div>
              <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60">
                <div className="text-emerald-400 font-bold mb-1">3. Control de Asistencias</div>
                <div className="text-xs text-slate-400">Registro en tiempo real con validación de estado activo e idempotencia.</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 px-6 text-center text-xs text-slate-500">
        <p>FitSaaS Multitenant · Proyecto Integrador · Estrategia de Renderizado: SSG en Landing Page</p>
      </footer>
    </div>
  );
}
