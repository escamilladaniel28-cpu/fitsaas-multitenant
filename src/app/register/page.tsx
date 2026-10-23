'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, ShieldCheck, Check, AlertCircle, Zap } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function RegisterTenantPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    tenantName: '',
    slug: '',
    adminName: '',
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<any>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const generatedSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_');

    setFormData((prev) => ({
      ...prev,
      tenantName: name,
      slug: prev.slug === '' || prev.slug === generatedSlug.slice(0, -1) ? generatedSlug : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Send Idempotency-Key header to guarantee safe retries (Section 4.4)
      const idempotencyKey = uuidv4();

      const res = await fetch('/api/auth/register-tenant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(data.message || 'Límite de peticiones excedido (Rate Limit 429).');
        }
        throw new Error(data.error || 'Error al aprovisionar el gimnasio');
      }

      setSuccessInfo(data);
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative isolate min-h-dvh overflow-x-hidden bg-obsidian text-foreground font-sans selection:bg-volt/30 selection:text-white flex flex-col justify-center py-12 px-6 lg:px-8">
      {/* Background ambient lighting */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 left-1/3 size-[560px] rounded-full bg-volt/[0.05] blur-[140px]" />
        <div className="absolute right-[-10%] bottom-[-20%] size-[500px] rounded-full bg-plasma/[0.05] blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md animate-rise">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-white/60 hover:text-white px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] transition mb-6"
        >
          <ArrowLeft className="size-3.5" /> Volver a la portada
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-volt text-obsidian shadow-[0_0_24px_-4px_var(--volt)]">
            <Zap className="size-5 fill-current" />
          </div>
          <div>
            <span className="text-[11px] font-mono tracking-widest text-volt uppercase block">
              // APROVISIONAMIENTO
            </span>
            <span className="font-display text-xs text-white/60">FitSaaS Platform</span>
          </div>
        </div>

        <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white">
          Aprovisionar Gimnasio
        </h2>
        <p className="mt-2 text-sm text-white/50">
          Crea el schema dedicado en PostgreSQL y la cuenta del administrador en una transacción atómica.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-[32px] border border-white/[0.08] bg-zinc-950/80 p-8 sm:p-10 backdrop-blur-2xl shadow-[0_24px_50px_-20px_rgba(0,0,0,0.8)]">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-plasma/10 border border-plasma/30 text-plasma text-xs flex items-start gap-3">
              <AlertCircle className="size-5 shrink-0 mt-0.5" />
              <div className="font-medium">{error}</div>
            </div>
          )}

          {successInfo ? (
            <div className="p-6 text-center animate-rise">
              <div className="size-14 rounded-full bg-volt text-obsidian flex items-center justify-center mx-auto mb-4 shadow-[0_0_28px_rgba(212,255,0,0.4)]">
                <Check className="size-7 stroke-[2.5]" />
              </div>
              <h3 className="font-display text-2xl font-semibold text-white mb-2">
                ¡Gimnasio Aprovisionado!
              </h3>
              <p className="text-xs font-mono rounded-full bg-white/[0.05] border border-white/10 px-3 py-1.5 text-volt mb-4 inline-block">
                SCHEMA ASIGNADO: {successInfo.tenant?.schemaName}
              </p>
              <p className="text-xs text-white/40">
                Redirigiendo a tu panel de control...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  Nombre del Gimnasio
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: PowerFit Gym"
                  value={formData.tenantName}
                  onChange={handleNameChange}
                  className="w-full h-11 bg-white/[0.03] border border-white/10 rounded-full px-4 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-volt/50 focus:bg-white/[0.05] transition"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-white/70">
                    Slug / Identificador
                  </label>
                  <span className="text-[10px] font-mono text-volt/80">
                    tenant_{formData.slug || 'slug'}
                  </span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="ej: powerfit"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                    })
                  }
                  className="w-full h-11 bg-white/[0.03] border border-white/10 rounded-full px-4 text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-volt/50 focus:bg-white/[0.05] transition"
                />
              </div>

              <div className="pt-2 border-t border-white/[0.06]">
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  Nombre del Administrador
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Laura Ramírez"
                  value={formData.adminName}
                  onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                  className="w-full h-11 bg-white/[0.03] border border-white/10 rounded-full px-4 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-volt/50 focus:bg-white/[0.05] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@gimnasio.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-11 bg-white/[0.03] border border-white/10 rounded-full px-4 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-volt/50 focus:bg-white/[0.05] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full h-11 bg-white/[0.03] border border-white/10 rounded-full px-4 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-volt/50 focus:bg-white/[0.05] transition"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-[11px] text-white/60 flex items-center gap-2.5">
                <ShieldCheck className="size-4 text-volt shrink-0" />
                <span>Transacción atómica protegida con Idempotency-Key y Rate Limiting.</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-full font-semibold text-xs tracking-wide bg-volt text-obsidian hover:bg-volt/90 transition shadow-[0_0_24px_rgba(212,255,0,0.3)] hover:shadow-[0_0_32px_rgba(212,255,0,0.45)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Aprovisionando Schema...
                  </>
                ) : (
                  'Registrar y Crear Schema'
                )}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-white/[0.06] text-center text-xs text-white/50">
            ¿Ya tienes un gimnasio registrado?{' '}
            <Link href="/login" className="text-volt hover:underline underline-offset-4 font-medium transition">
              Inicia sesión aquí
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
