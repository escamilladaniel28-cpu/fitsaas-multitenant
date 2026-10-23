import Link from 'next/link';
import { ArrowRight, Database, Zap, Sparkles, Shield, Users, CreditCard, UserCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="relative isolate min-h-dvh overflow-x-hidden bg-obsidian text-foreground font-sans selection:bg-volt/30 selection:text-white">
      {/* Background ambient lighting */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 left-1/4 size-[560px] rounded-full bg-volt/[0.06] blur-[120px]" />
        <div className="absolute right-[-10%] bottom-[-20%] size-[520px] rounded-full bg-plasma/[0.06] blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      </div>

      {/* Navigation Header */}
      <header className="border-b border-white/[0.06] bg-obsidian/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-volt text-obsidian shadow-[0_0_24px_-4px_var(--volt)]">
              <Zap className="size-5 fill-current" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-xl font-bold tracking-tight text-white">
                FitSaaS<span className="text-volt">.</span>
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-volt/10 text-volt border border-volt/20">
                multitenant
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-medium text-white/70 hover:text-white px-4 py-2 rounded-full border border-white/10 hover:border-white/20 hover:bg-white/[0.03] transition"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/register"
              className="text-xs font-semibold text-obsidian bg-volt hover:bg-volt/90 transition px-5 py-2.5 rounded-full shadow-[0_0_20px_rgba(212,255,0,0.3)] hover:shadow-[0_0_28px_rgba(212,255,0,0.5)] flex items-center gap-1.5"
            >
              Registrar Gimnasio <ArrowRight className="size-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 pt-16 pb-24">
        <section className="text-center max-w-4xl mx-auto mb-20 animate-rise">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-volt/20 bg-volt/10 text-xs font-medium text-volt mb-8 shadow-[0_0_16px_rgba(212,255,0,0.1)]">
            <Shield className="size-3.5" />
            Aislamiento Estricto por Schema en PostgreSQL
          </div>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-[-0.04em] text-white leading-[1.08] mb-6 text-balance">
            Gestión inteligente para <br />
            <span className="text-volt">gimnasios de alto rendimiento</span>
          </h1>

          <p className="text-base sm:text-lg text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed text-pretty">
            Arquitectura multitenant de nivel empresarial: esquemas dedicados por cada gimnasio,
            transacciones atómicas protegidas con idempotencia RFC, limitador de tasa 429 y análisis con IA.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full font-semibold text-sm bg-volt text-obsidian hover:bg-volt/90 transition shadow-[0_0_28px_rgba(212,255,0,0.35)] flex items-center justify-center gap-2 cursor-pointer"
            >
              Aprovisionar Nuevo Gimnasio <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full font-medium text-sm border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-white transition flex items-center justify-center gap-2 cursor-pointer"
            >
              Ingresar al Panel de Control
            </Link>
          </div>
        </section>

        {/* Bento Grid Architecture Features */}
        <section className="mb-24">
          <div className="text-center mb-10">
            <span className="text-[11px] font-mono tracking-[0.2em] text-volt uppercase">
              // ARQUITECTURA EVALUADA
            </span>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white mt-1">
              Pilares de Seguridad y Escalabilidad
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Feature 1 */}
            <div className="group rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-7 backdrop-blur-xl hover:border-white/[0.15] transition-all duration-300">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-volt/10 text-volt border border-volt/20 mb-5 group-hover:shadow-[0_0_20px_rgba(212,255,0,0.25)] transition">
                <Database className="size-5" />
              </div>
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block mb-1">Pilar 01</span>
              <h3 className="font-display text-lg font-semibold text-white mb-2">Schema por Tenant</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Cada gimnasio reside en su propio namespace (<code className="text-volt font-mono">tenant_slug</code>). 
                La resolución dinámica con <code className="text-volt font-mono">SET LOCAL search_path</code> garantiza cero fuga de información.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-7 backdrop-blur-xl hover:border-white/[0.15] transition-all duration-300">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-plasma/10 text-plasma border border-plasma/20 mb-5 group-hover:shadow-[0_0_20px_rgba(255,90,54,0.25)] transition">
                <Zap className="size-5" />
              </div>
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block mb-1">Pilar 02</span>
              <h3 className="font-display text-lg font-semibold text-white mb-2">Idempotencia Atómica</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Prevención determinista de cobros y registros duplicados mediante el header <code className="text-plasma font-mono">Idempotency-Key</code> (UUIDv4) y caché canónico en base de datos.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-7 backdrop-blur-xl hover:border-white/[0.15] transition-all duration-300">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-volt/10 text-volt border border-volt/20 mb-5 group-hover:shadow-[0_0_20px_rgba(212,255,0,0.25)] transition">
                <Sparkles className="size-5" />
              </div>
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block mb-1">Pilar 03</span>
              <h3 className="font-display text-lg font-semibold text-white mb-2">Rate Limit & IA Gemini</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Protección contra abuso con respuesta <code className="text-volt font-mono">HTTP 429 (Retry-After)</code> vía ventana deslizante, y diagnóstico analítico impulsado por IA.
              </p>
            </div>
          </div>
        </section>

        {/* Business Entities */}
        <section className="rounded-[32px] border border-white/[0.08] bg-white/[0.02] p-8 sm:p-12 backdrop-blur-2xl">
          <div className="max-w-2xl mb-8">
            <span className="text-[11px] font-mono tracking-[0.2em] text-white/40 uppercase">
              // MODELO DE NEGOCIO
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white mt-1">
              Entidades Completas del Schema
            </h2>
            <p className="text-xs text-white/50 mt-2">
              Las 3 entidades de negocio requeridas operan de forma aislada dentro de cada schema de Postgres.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-center gap-2 mb-2 text-volt font-medium text-sm">
                <CreditCard className="size-4" /> 1. Planes de Membresía
              </div>
              <p className="text-xs text-white/45 leading-relaxed">
                Tarifas, vigencia en días y reglas de acceso configuradas por el administrador.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-center gap-2 mb-2 text-volt font-medium text-sm">
                <Users className="size-4" /> 2. Socios (Miembros)
              </div>
              <p className="text-xs text-white/45 leading-relaxed">
                Control de miembros con validación de documento único, plan asociado y estados activo/inactivo.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-center gap-2 mb-2 text-volt font-medium text-sm">
                <UserCheck className="size-4" /> 3. Control de Asistencias
              </div>
              <p className="text-xs text-white/45 leading-relaxed">
                Registro en tiempo real con validación estricta de estado activo y trazabilidad.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 px-6 text-center text-xs text-white/40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>FitSaaS Multitenant · Proyecto Integrador</span>
          <span className="inline-flex items-center gap-2 font-mono text-[11px] text-white/50">
            <span className="size-1.5 rounded-full bg-volt shadow-[0_0_6px_var(--volt)]" />
            Render: SSG (Static Site Generation)
          </span>
        </div>
      </footer>
    </div>
  );
}
