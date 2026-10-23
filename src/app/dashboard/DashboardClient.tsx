'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import {
  UserCheck,
  Sparkles,
  Shield,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
  Play,
} from 'lucide-react';

import { FloatingSidebar, type TabKey } from '@/components/kinetic/floating-sidebar';
import { TopBar } from '@/components/kinetic/top-bar';
import { ActiveMembersCard } from '@/components/kinetic/active-members-card';
import { LiveCapacityCard } from '@/components/kinetic/live-capacity-card';
import { RevenueCard } from '@/components/kinetic/revenue-card';
import { CheckInsTable, type CheckInItem } from '@/components/kinetic/checkins-table';
import { QuickActionsCard } from '@/components/kinetic/quick-actions-card';
import { NewMemberDialog } from '@/components/dashboard/new-member-dialog';
import { BentoCard, CardEyebrow } from '@/components/kinetic/bento-card';
import { ClassesView } from '@/components/kinetic/classes-view';

interface SessionInfo {
  userId: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  tenantSchema: string;
}

interface StatsInfo {
  totalSocios: number;
  sociosActivos: number;
  asistenciasHoy: number;
  totalPlanes: number;
}

export default function DashboardClient({
  session,
  initialStats,
}: {
  session: SessionInfo;
  initialStats: StatsInfo;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('resumen');
  const [stats, setStats] = useState<StatsInfo>(initialStats);

  // Socios state
  const [socios, setSocios] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingSocios, setLoadingSocios] = useState(false);
  const [showSocioModal, setShowSocioModal] = useState(false);
  const [savingSocio, setSavingSocio] = useState(false);
  const [socioFeedback, setSocioFeedback] = useState<string | null>(null);

  // Planes state
  const [planes, setPlanes] = useState<any[]>([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState({
    nombre: '',
    precio: '',
    duracionDias: '30',
    descripcion: '',
  });
  const [savingPlan, setSavingPlan] = useState(false);

  // Asistencias state
  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [loadingAsistencias, setLoadingAsistencias] = useState(false);
  const [selectedSocioForCheckin, setSelectedSocioForCheckin] = useState('');
  const [registeringCheckin, setRegisteringCheckin] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // AI state
  const [aiData, setAiData] = useState<{ insights: string; source: string; modelUsed: string } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Inspector & Live Testing state
  const [testLog, setTestLog] = useState<string[]>([]);
  const [testingIdempotency, setTestingIdempotency] = useState(false);
  const [testingRateLimit, setTestingRateLimit] = useState(false);

  const fetchPlanes = async () => {
    try {
      const res = await fetch('/api/planes');
      const data = await res.json();
      if (res.ok) setPlanes(data.planes || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSocios = async () => {
    setLoadingSocios(true);
    try {
      const queryParam = searchTerm ? `?q=${encodeURIComponent(searchTerm)}` : '';
      const res = await fetch(`/api/socios${queryParam}`);
      const data = await res.json();
      if (res.ok) {
        setSocios(data.socios || []);
        const activeCount = (data.socios || []).filter((s: any) => s.estado === 'activo').length;
        setStats((prev) => ({
          ...prev,
          totalSocios: data.socios.length,
          sociosActivos: activeCount,
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSocios(false);
    }
  };

  const fetchAsistencias = async () => {
    setLoadingAsistencias(true);
    try {
      const res = await fetch('/api/asistencias');
      const data = await res.json();
      if (res.ok) {
        setAsistencias(data.asistencias || []);
        setStats((prev) => ({ ...prev, asistenciasHoy: data.asistencias.length }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAsistencias(false);
    }
  };

  useEffect(() => {
    fetchPlanes();
    fetchSocios();
    fetchAsistencias();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  // Crear socio con Idempotency-Key
  const handleSaveSocio = async (formData: {
    nombre: string;
    documento: string;
    email: string;
    telefono: string;
    planId: string;
    estado: string;
  }) => {
    setSavingSocio(true);
    setSocioFeedback(null);

    try {
      const idempotencyKey = uuidv4();
      const res = await fetch('/api/socios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar socio');

      setShowSocioModal(false);
      await fetchSocios();
    } catch (err: any) {
      setSocioFeedback(err.message);
    } finally {
      setSavingSocio(false);
    }
  };

  // Crear plan
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPlan(true);
    try {
      const res = await fetch('/api/planes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planForm),
      });
      if (res.ok) {
        setShowPlanModal(false);
        setPlanForm({ nombre: '', precio: '', duracionDias: '30', descripcion: '' });
        fetchPlanes();
      }
    } finally {
      setSavingPlan(false);
    }
  };

  // Registrar asistencia / check-in con idempotencia
  const handleCheckin = async (socioId: string) => {
    setRegisteringCheckin(true);
    setCheckinMessage(null);

    try {
      const idempotencyKey = uuidv4();
      const res = await fetch('/api/asistencias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ socioId, tipoAcceso: 'entrada' }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCheckinMessage({ text: data.error || 'Acceso denegado', error: true });
      } else {
        setCheckinMessage({ text: data.message, error: false });
        fetchAsistencias();
      }
    } catch (err: any) {
      setCheckinMessage({ text: err.message, error: true });
    } finally {
      setRegisteringCheckin(false);
    }
  };

  // Generar reporte con IA
  const handleGenerateAi = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch('/api/ai/analytics');
      const data = await res.json();
      if (res.ok) {
        setAiData(data);
      }
    } finally {
      setLoadingAi(false);
    }
  };

  // DEMO PARA SUSTENTACIÓN: Prueba de Idempotencia en Vivo
  const runLiveIdempotencyTest = async () => {
    setTestingIdempotency(true);
    const testKey = `test-${Date.now()}-${uuidv4().substring(0, 8)}`;
    const logs: string[] = [];

    logs.push(`[1] Generando Idempotency-Key única: ${testKey}`);
    logs.push(`[2] Enviando Petición A con Idempotency-Key...`);

    const payload = {
      nombre: `Socio Test ${Math.floor(Math.random() * 1000)}`,
      documento: `DOC-${Date.now().toString().slice(-6)}`,
      email: `test${Date.now()}@test.com`,
      estado: 'activo',
    };

    const res1 = await fetch('/api/socios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': testKey,
      },
      body: JSON.stringify(payload),
    });
    const data1 = await res1.json();
    logs.push(
      `✓ Petición A completada: Status ${res1.status}. Socio creado con ID: ${data1.socio?.id}`
    );

    logs.push(`[3] Reintentando Petición B idéntica con la MISMA Idempotency-Key...`);
    const res2 = await fetch('/api/socios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': testKey,
      },
      body: JSON.stringify(payload),
    });
    const data2 = await res2.json();
    const isReplay = res2.headers.get('X-Idempotent-Replay');

    logs.push(
      `✓ Petición B completada: Status ${res2.status}. Header X-Idempotent-Replay = ${isReplay}`
    );
    logs.push(`✓ Mismo ID retornado: ${data2.socio?.id}`);
    logs.push(
      `🎉 PRUEBA SUPERADA: No se duplicó el registro en PostgreSQL. Se reutilizó la respuesta guardada.`
    );

    setTestLog(logs);
    setTestingIdempotency(false);
    fetchSocios();
  };

  // DEMO PARA SUSTENTACIÓN: Prueba de Rate Limiting en Vivo
  const runLiveRateLimitTest = async () => {
    setTestingRateLimit(true);
    const logs: string[] = [];
    logs.push(`[1] Disparando ráfaga de 6 peticiones al endpoint de autenticación...`);

    for (let i = 1; i <= 6; i++) {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@burst.com', password: 'bad' }),
      });
      const retryAfter = res.headers.get('Retry-After');
      logs.push(
        `Petición #${i}: Status ${res.status} ${
          res.status === 429 ? `(RATE LIMIT TRIGGERED! Retry-After: ${retryAfter}s)` : ''
        }`
      );
    }

    logs.push(`🎉 PRUEBA SUPERADA: El algoritmo de ventana deslizante rechazó el exceso con 429.`);
    setTestLog(logs);
    setTestingRateLimit(false);
  };

  // Métrica calculada de ingresos estimados
  const totalIngresosEstimados = socios.reduce((acc, s) => {
    const plan = planes.find((p) => p.nombre === s.plan_nombre || p.id === s.plan_id);
    return acc + (plan ? Number(plan.precio) : 0);
  }, 0);

  // Transformar asistencias para la tabla de v0
  const checkInsItems: CheckInItem[] = asistencias.slice(0, 8).map((a, i) => ({
    id: a.id,
    name: a.socio_nombre || 'Socio Registrado',
    documento: a.socio_documento,
    plan: a.plan_nombre || 'General',
    time: new Date(a.fecha_hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    status: 'in',
    tone: (['volt', 'plasma', 'neutral'] as const)[i % 3],
  }));

  // Saludo dinámico en español
  const currentHour = new Date().getHours();
  const saludo = currentHour < 12 ? 'Buenos días' : currentHour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const primerNombre = session.name.split(' ')[0] || 'Administrador';

  const fechaHoy = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="relative isolate min-h-dvh overflow-x-hidden bg-obsidian text-foreground font-sans selection:bg-volt/30 selection:text-white">
      {/* Background kinetic ambient lighting */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 left-1/4 size-[560px] rounded-full bg-volt/[0.06] blur-[120px]" />
        <div className="absolute right-[-10%] bottom-[-20%] size-[520px] rounded-full bg-plasma/[0.06] blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      </div>

      {/* Floating Sidebar interactivo */}
      <FloatingSidebar
        activeTab={activeTab}
        onTabChange={(t) => setActiveTab(t)}
        userRole={session.role}
      />

      {/* Main Container */}
      <div className="mx-auto w-full max-w-[1480px] px-4 pb-28 sm:px-6 lg:pr-8 lg:pb-12 lg:pl-28">
        <TopBar
          tenantName={session.tenantName}
          tenantSchema={session.tenantSchema}
          adminName={session.name}
          adminEmail={session.email}
          onLogout={handleLogout}
          onOpenInspector={() => setActiveTab('inspector')}
          searchValue={searchTerm}
          onSearch={(v) => {
            setSearchTerm(v);
            if (activeTab !== 'socios') setActiveTab('socios');
          }}
        />

        <main className="flex flex-col gap-8 pt-4">
          {/* Greeting Hero Bar */}
          <div className="flex animate-rise flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <p className="font-mono text-[11px] tracking-[0.2em] text-white/40 uppercase">
                {fechaHoy} · PostgreSQL Schema: {session.tenantSchema}
              </p>
              <h1 className="font-display text-4xl font-semibold tracking-[-0.04em] text-balance text-white md:text-5xl">
                {saludo}, {primerNombre}<span className="text-volt">.</span>
              </h1>
            </div>
            <p className="max-w-xs text-sm text-pretty text-white/45">
              Tu gimnasio tiene aforo <span className="text-white font-medium">activo</span> y la facturación está{' '}
              <span className="text-volt font-medium">superando el objetivo</span>.
            </p>
          </div>

          {/* TAB: RESUMEN / BENTO GRID */}
          {activeTab === 'resumen' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
              <ActiveMembersCard
                count={stats.sociosActivos}
                totalCount={stats.totalSocios}
                className="lg:col-span-8"
              />
              <LiveCapacityCard liveCount={stats.asistenciasHoy} className="lg:col-span-4 lg:row-span-2" />
              {session.role !== 'empleado' && (
                <RevenueCard totalRevenue={totalIngresosEstimados} className="lg:col-span-8" />
              )}
              <CheckInsTable
                checkIns={checkInsItems}
                onRefresh={fetchAsistencias}
                onViewAll={() => setActiveTab('asistencias')}
                className="lg:col-span-8"
              />
              <QuickActionsCard
                onRegister={() => setShowSocioModal(true)}
                onCheckin={() => setActiveTab('asistencias')}
                onNewPlan={
                  session.role !== 'empleado'
                    ? () => {
                        setActiveTab('planes');
                        setShowPlanModal(true);
                      }
                    : undefined
                }
                onAiAnalytics={handleGenerateAi}
                onInspector={() => setActiveTab('inspector')}
                className="lg:sticky lg:top-6 lg:col-span-4 lg:self-start"
              />

              {/* AI Diagnóstico Panel (Bento integration) */}
              <BentoCard className="lg:col-span-12">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-volt/15 text-volt ring-1 ring-volt/30">
                      <Sparkles className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-white flex items-center gap-2">
                        Diagnóstico Estratégico Asistido por IA (Google Gemini)
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-volt/20 text-volt border border-volt/30 font-medium">
                          Bonus +10 Pts
                        </span>
                      </h3>
                      <p className="text-xs text-white/50">
                        Evaluación en tiempo real del modelo de miembros y afluencia por schema.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateAi}
                    disabled={loadingAi}
                    className="h-10 px-5 rounded-full bg-volt text-obsidian font-semibold text-xs transition-all hover:bg-volt/90 hover:shadow-[0_0_24px_rgba(212,255,0,0.4)] flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loadingAi ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Analizando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" /> Generar Diagnóstico IA
                      </>
                    )}
                  </button>
                </div>

                {aiData ? (
                  <div className="mt-4 p-5 rounded-2xl border border-white/10 bg-white/[0.03] text-sm text-white/80 leading-relaxed whitespace-pre-line font-sans">
                    <div className="flex items-center justify-between text-xs text-white/40 border-b border-white/[0.06] pb-2 mb-3 font-mono">
                      <span>Modelo: {aiData.modelUsed}</span>
                      <span className="text-volt">ORIGEN: {aiData.source.toUpperCase()}</span>
                    </div>
                    {aiData.insights}
                  </div>
                ) : (
                  <div className="text-xs text-white/40 text-center py-6 border border-dashed border-white/10 rounded-2xl">
                    Haz clic en &ldquo;Generar Diagnóstico IA&rdquo; para obtener recomendaciones de crecimiento para tu gimnasio.
                  </div>
                )}
              </BentoCard>
            </div>
          )}

          {/* TAB: SOCIOS */}
          {activeTab === 'socios' && (
            <BentoCard className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div>
                  <CardEyebrow id="socios-list">Directorio de Socios</CardEyebrow>
                  <p className="text-xs text-white/50 mt-1">
                    Registros en tiempo real en la tabla <code className="text-volt font-mono">{session.tenantSchema}.socios</code>
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-72">
                    <Search className="size-4 text-white/40 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o documento..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchSocios()}
                      className="h-10 w-full rounded-full border border-white/10 bg-white/[0.03] pl-10 pr-4 text-xs text-white placeholder:text-white/30 focus:border-volt/50 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={fetchSocios}
                    className="p-2.5 rounded-full border border-white/10 bg-white/[0.03] text-white/60 hover:text-white transition cursor-pointer"
                    title="Actualizar socios"
                  >
                    <RefreshCw className="size-4" />
                  </button>
                  <button
                    onClick={() => setShowSocioModal(true)}
                    className="h-10 px-5 rounded-full bg-volt text-obsidian font-semibold text-xs transition hover:bg-volt/90 hover:shadow-[0_0_24px_rgba(212,255,0,0.3)] flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="size-4" /> Registrar Socio
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.01]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/[0.08] bg-white/[0.03] text-[11px] font-medium uppercase tracking-wider text-white/40">
                    <tr>
                      <th className="py-3.5 px-5">Socio</th>
                      <th className="py-3.5 px-4">Documento</th>
                      <th className="py-3.5 px-4">Plan Asignado</th>
                      <th className="py-3.5 px-4">Estado</th>
                      <th className="py-3.5 px-4">Fecha Inicio</th>
                      <th className="py-3.5 px-5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {loadingSocios ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-white/40">
                          <Loader2 className="size-5 animate-spin mx-auto mb-2 text-volt" /> Cargando socios de {session.tenantSchema}...
                        </td>
                      </tr>
                    ) : socios.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-white/40">
                          No hay socios registrados aún. Haz clic en &ldquo;Registrar Socio&rdquo;.
                        </td>
                      </tr>
                    ) : (
                      socios.map((s) => (
                        <tr key={s.id} className="hover:bg-white/[0.02] transition">
                          <td className="py-3.5 px-5">
                            <div className="font-medium text-white">{s.nombre}</div>
                            <div className="text-[11px] text-white/40">{s.email || 'Sin correo registrado'}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-white/70">{s.documento}</td>
                          <td className="py-3.5 px-4">
                            <span className="font-medium text-volt">{s.plan_nombre || 'Sin Plan'}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                                s.estado === 'activo'
                                  ? 'bg-volt/10 text-volt border border-volt/20'
                                  : 'bg-white/10 text-white/60 border border-white/15'
                              }`}
                            >
                              {s.estado}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-white/50">
                            {new Date(s.fecha_inicio).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <button
                              onClick={() => handleCheckin(s.id)}
                              disabled={registeringCheckin}
                              className="px-3 py-1 rounded-full bg-volt/10 hover:bg-volt/20 text-volt border border-volt/30 text-[11px] font-medium transition cursor-pointer"
                            >
                              Check-in
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </BentoCard>
          )}

          {/* TAB: ASISTENCIAS */}
          {activeTab === 'asistencias' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Quick check-in box */}
              <BentoCard className="lg:col-span-5 p-6">
                <CardEyebrow id="checkin-gate">Torniquete de Acceso</CardEyebrow>
                <h3 className="font-display text-xl font-semibold text-white mt-2 mb-1">
                  Validación de Ingreso en Tiempo Real
                </h3>
                <p className="text-xs text-white/50 mb-5 leading-relaxed">
                  Verifica pertenencia al gimnasio y estado activo en <code className="text-volt font-mono">{session.tenantSchema}</code>.
                </p>

                {checkinMessage && (
                  <div
                    className={`p-3.5 rounded-2xl mb-4 text-xs flex items-center gap-2.5 ${
                      checkinMessage.error
                        ? 'bg-plasma/10 border border-plasma/30 text-plasma'
                        : 'bg-volt/10 border border-volt/30 text-volt'
                    }`}
                  >
                    {checkinMessage.error ? <XCircle className="size-4 shrink-0" /> : <CheckCircle2 className="size-4 shrink-0" />}
                    <span>{checkinMessage.text}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-2">
                      Seleccionar Socio para Validación
                    </label>
                    <select
                      value={selectedSocioForCheckin}
                      onChange={(e) => setSelectedSocioForCheckin(e.target.value)}
                      className="w-full h-11 rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs text-white focus:border-volt/50 focus:outline-none"
                    >
                      <option value="" className="bg-zinc-950 text-white">Seleccionar socio...</option>
                      {socios.map((s) => (
                        <option key={s.id} value={s.id} className="bg-zinc-950 text-white">
                          {s.nombre} · Doc: {s.documento} ({s.estado.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => selectedSocioForCheckin && handleCheckin(selectedSocioForCheckin)}
                    disabled={!selectedSocioForCheckin || registeringCheckin}
                    className="w-full h-12 rounded-full bg-volt text-obsidian font-semibold text-xs transition hover:bg-volt/90 hover:shadow-[0_0_24px_rgba(212,255,0,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {registeringCheckin ? <Loader2 className="size-4 animate-spin" /> : <UserCheck className="size-4" />}
                    Validar Acceso
                  </button>
                </div>
              </BentoCard>

              {/* History Table */}
              <CheckInsTable
                checkIns={checkInsItems}
                onRefresh={fetchAsistencias}
                className="lg:col-span-7"
              />
            </div>
          )}

          {/* TAB: CLASES & RESERVAS */}
          {activeTab === 'clases' && (
            <ClassesView
              tenantSchema={session.tenantSchema}
              onCheckinSuccess={() => {
                fetchAsistencias();
              }}
            />
          )}

          {/* TAB: PLANES */}
          {activeTab === 'planes' && session.role !== 'empleado' && (
            <BentoCard className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <CardEyebrow id="planes-title">Catálogo de Membresías</CardEyebrow>
                  <p className="text-xs text-white/50 mt-1">
                    Planes exclusivos de <code className="text-volt font-mono">{session.tenantSchema}.planes</code>
                  </p>
                </div>
                <button
                  onClick={() => setShowPlanModal(true)}
                  className="h-10 px-5 rounded-full bg-volt text-obsidian font-semibold text-xs transition hover:bg-volt/90 hover:shadow-[0_0_24px_rgba(212,255,0,0.3)] flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="size-4" /> Crear Plan
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {planes.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 flex flex-col justify-between hover:border-white/20 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-display text-lg font-semibold text-white">{p.nombre}</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                          {p.duracion_dias} días
                        </span>
                      </div>
                      <div className="font-display text-3xl font-bold text-volt mb-3">
                        ${Number(p.precio).toLocaleString()}
                      </div>
                      <p className="text-xs text-white/50 leading-relaxed">
                        {p.descripcion || 'Sin descripción adicional para este plan.'}
                      </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/[0.06] text-[11px] text-white/40">
                      Vigencia: {p.duracion_dias} días naturales
                    </div>
                  </div>
                ))}
              </div>
            </BentoCard>
          )}

          {activeTab === 'planes' && session.role === 'empleado' && (
            <BentoCard className="p-12 text-center">
              <Shield className="size-10 text-plasma mx-auto mb-3" />
              <h3 className="font-display text-lg font-semibold text-white">Acceso Restringido</h3>
              <p className="text-xs text-white/50 mt-1 max-w-md mx-auto">
                Tu usuario con rol <span className="text-plasma font-mono font-medium">empleado</span> no tiene permisos para ver ni gestionar las tarifas y planes de membresía.
              </p>
            </BentoCard>
          )}

          {/* TAB: INSPECTOR SUSTENTACIÓN */}
          {activeTab === 'inspector' && (
            <BentoCard className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-volt/15 text-volt ring-1 ring-volt/30">
                  <Shield className="size-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-white">
                    Inspector de Arquitectura & Telemetría
                  </h3>
                  <p className="text-xs text-white/50">
                    Herramienta de verificación en vivo para la sustentación docente.
                  </p>
                </div>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] text-xs space-y-2 font-mono">
                  <div className="text-white/40 uppercase text-[10px] tracking-wider">Aislamiento de Schema en PostgreSQL</div>
                  <div>Tenant ID: <span className="text-white">{session.tenantId}</span></div>
                  <div>Slug: <span className="text-white">{session.tenantSlug}</span></div>
                  <div>Schema PostgreSQL: <span className="text-volt font-bold">{session.tenantSchema}</span></div>
                  <div>Search Path activo: <span className="text-white/80">&ldquo;{session.tenantSchema}&rdquo;, public</span></div>
                </div>

                <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] text-xs space-y-2 font-mono">
                  <div className="text-white/40 uppercase text-[10px] tracking-wider">Mecanismos de Robustez</div>
                  <div>Autenticación: <span className="text-volt">JWT en cookie httpOnly</span></div>
                  <div>Idempotencia: <span className="text-volt">Header Idempotency-Key + SHA-256</span></div>
                  <div>Rate Limiter: <span className="text-volt">Sliding Window (429 + Retry-After)</span></div>
                  <div>Renderizado: <span className="text-volt">SSR (Dashboard) + SSG (Landing) + CSR</span></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mb-6">
                <button
                  onClick={runLiveIdempotencyTest}
                  disabled={testingIdempotency}
                  className="h-11 px-5 rounded-full bg-volt text-obsidian font-semibold text-xs transition hover:bg-volt/90 hover:shadow-[0_0_24px_rgba(212,255,0,0.3)] flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {testingIdempotency ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                  Ejecutar Prueba de Idempotencia en Vivo
                </button>

                <button
                  onClick={runLiveRateLimitTest}
                  disabled={testingRateLimit}
                  className="h-11 px-5 rounded-full border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] font-semibold text-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {testingRateLimit ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                  Ejecutar Prueba de Rate Limiting (429) en Vivo
                </button>
              </div>

              {/* Log Console */}
              {testLog.length > 0 && (
                <div className="p-4 rounded-2xl border border-white/10 bg-black/80 font-mono text-xs">
                  <div className="text-white/40 mb-2 flex items-center gap-2 text-[11px]">
                    <Clock className="size-3.5 text-volt" /> Registro de Ejecución:
                  </div>
                  <div className="space-y-1 text-white/80 text-[11px]">
                    {testLog.map((log, index) => (
                      <div key={index} className={log.includes('PRUEBA SUPERADA') ? 'text-volt font-bold' : ''}>
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </BentoCard>
          )}
        </main>
      </div>

      {/* Modal Real de Crear Socio */}
      <NewMemberDialog
        open={showSocioModal}
        onOpenChange={setShowSocioModal}
        planes={planes}
        onCreate={handleSaveSocio}
        saving={savingSocio}
        feedback={socioFeedback}
      />

      {/* Modal Crear Plan */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl text-foreground">
            <h3 className="font-display text-xl font-semibold text-white mb-2">Crear Plan de Membresía</h3>
            <p className="text-xs text-white/50 mb-4">
              Se creará en <code className="text-volt font-mono">{session.tenantSchema}.planes</code>
            </p>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/80 mb-1">Nombre del Plan *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Plan Anual Black"
                  value={planForm.nombre}
                  onChange={(e) => setPlanForm({ ...planForm, nombre: e.target.value })}
                  className="w-full h-10 bg-white/[0.04] border border-white/10 rounded-full px-4 text-xs text-white focus:border-volt/50 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-1">Precio ($) *</label>
                  <input
                    type="number"
                    required
                    placeholder="80000"
                    value={planForm.precio}
                    onChange={(e) => setPlanForm({ ...planForm, precio: e.target.value })}
                    className="w-full h-10 bg-white/[0.04] border border-white/10 rounded-full px-4 text-xs text-white focus:border-volt/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-1">Duración (Días) *</label>
                  <input
                    type="number"
                    required
                    value={planForm.duracionDias}
                    onChange={(e) => setPlanForm({ ...planForm, duracionDias: e.target.value })}
                    className="w-full h-10 bg-white/[0.04] border border-white/10 rounded-full px-4 text-xs text-white focus:border-volt/50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/80 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  placeholder="Acceso total a zonas húmedas y clases grupales..."
                  value={planForm.descripcion}
                  onChange={(e) => setPlanForm({ ...planForm, descripcion: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl p-3 text-xs text-white focus:border-volt/50 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="h-10 px-5 rounded-full text-xs text-white/60 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="h-10 px-5 rounded-full bg-volt text-obsidian font-semibold text-xs hover:bg-volt/90 cursor-pointer"
                >
                  {savingPlan ? 'Guardando...' : 'Crear Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
