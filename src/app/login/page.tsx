'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle, Clock, Zap } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          const retrySeconds = data.retryAfter || 60;
          setRetryCountdown(retrySeconds);
          const interval = setInterval(() => {
            setRetryCountdown((prev) => {
              if (prev === null || prev <= 1) {
                clearInterval(interval);
                return null;
              }
              return prev - 1;
            });
          }, 1000);

          throw new Error(data.message || 'Demasiados intentos. Espera antes de volver a intentar.');
        }
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      // Success -> Redirect to SSR dashboard
      router.push('/dashboard');
      router.refresh();
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
              // ACCESO AL SISTEMA
            </span>
            <span className="font-display text-xs text-white/60">FitSaaS Platform</span>
          </div>
        </div>

        <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white">
          Iniciar Sesión
        </h2>
        <p className="mt-2 text-sm text-white/50">
          Ingresa con tu cuenta de administrador para resolver tu schema de gimnasio.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-[32px] border border-white/[0.08] bg-zinc-950/80 p-8 sm:p-10 backdrop-blur-2xl shadow-[0_24px_50px_-20px_rgba(0,0,0,0.8)]">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-plasma/10 border border-plasma/30 text-plasma text-xs flex items-start gap-3">
              <AlertCircle className="size-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{error}</p>
                {retryCountdown !== null && (
                  <p className="mt-1 font-mono text-[11px] text-plasma/90 flex items-center gap-1.5">
                    <Clock className="size-3.5" /> Reintentar disponible en: {retryCountdown}s
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                placeholder="admin@gimnasio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 bg-white/[0.03] border border-white/10 rounded-full px-5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-volt/50 focus:bg-white/[0.05] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 bg-white/[0.03] border border-white/10 rounded-full px-5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-volt/50 focus:bg-white/[0.05] transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || retryCountdown !== null}
              className="w-full h-12 rounded-full font-semibold text-xs tracking-wide bg-volt text-obsidian hover:bg-volt/90 transition shadow-[0_0_24px_rgba(212,255,0,0.3)] hover:shadow-[0_0_32px_rgba(212,255,0,0.45)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Verificando credenciales...
                </>
              ) : retryCountdown !== null ? (
                `Bloqueado (${retryCountdown}s)`
              ) : (
                'Ingresar al Gimnasio'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/[0.06] text-center text-xs text-white/50">
            ¿Aún no tienes un gimnasio registrado?{' '}
            <Link href="/register" className="text-volt hover:underline underline-offset-4 font-medium transition">
              Regístralo aquí
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
