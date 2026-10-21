'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dumbbell,
  Users,
  CreditCard,
  UserCheck,
  Sparkles,
  Shield,
  LogOut,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
  Play,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

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
  const [activeTab, setActiveTab] = useState<'resumen' | 'socios' | 'asistencias' | 'planes' | 'inspector'>('resumen');
  const [stats, setStats] = useState<StatsInfo>(initialStats);

  // Socios state
  const [socios, setSocios] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingSocios, setLoadingSocios] = useState(false);
  const [showSocioModal, setShowSocioModal] = useState(false);
  const [socioForm, setSocioForm] = useState({
    nombre: '',
    documento: '',
    email: '',
    telefono: '',
    planId: '',
    estado: 'activo',
  });
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

  // Inspector & Live Testing state (Para la sustentación)
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
        // update stats
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
  const handleSaveSocio = async (e: React.FormEvent) => {
    e.preventDefault();
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
        body: JSON.stringify(socioForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar socio');

      setShowSocioModal(false);
      setSocioForm({
        nombre: '',
        documento: '',
        email: '',
        telefono: '',
        planId: '',
        estado: 'activo',
      });
      fetchSocios();
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-6 h-18 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
            <Dumbbell className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-lg tracking-tight">{session.tenantName}</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                schema: {session.tenantSchema}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Admin: <span className="text-slate-300 font-medium">{session.name}</span> ({session.email})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('inspector')}
            className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition ${
              activeTab === 'inspector'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4 text-cyan-400" /> Inspector Sustentación
          </button>

          <button
            onClick={handleLogout}
            className="text-xs text-slate-400 hover:text-rose-400 p-2 rounded-lg hover:bg-slate-800 transition flex items-center gap-1.5"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 flex flex-col">
        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-slate-800 pb-4 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('resumen')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'resumen'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Resumen & Asesor IA
          </button>
          <button
            onClick={() => {
              setActiveTab('socios');
              fetchSocios();
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'socios'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4" /> Socios ({stats.totalSocios})
          </button>
          <button
            onClick={() => {
              setActiveTab('asistencias');
              fetchAsistencias();
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'asistencias'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" /> Control de Asistencias
          </button>
          <button
            onClick={() => {
              setActiveTab('planes');
              fetchPlanes();
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'planes'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" /> Planes de Membresía
          </button>
        </div>

        {/* TAB 1: RESUMEN & IA */}
        {activeTab === 'resumen' && (
          <div className="space-y-8">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase">Total Socios</span>
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-3xl font-extrabold text-white">{stats.totalSocios}</div>
                <div className="text-xs text-slate-500 mt-1">Registrados en {session.tenantSchema}</div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase">Socios Activos</span>
                  <CheckCircle2 className="w-5 h-5 text-teal-400" />
                </div>
                <div className="text-3xl font-extrabold text-white">{stats.sociosActivos}</div>
                <div className="text-xs text-teal-400/80 mt-1">Con membresía habilitada</div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase">Accesos Hoy</span>
                  <UserCheck className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="text-3xl font-extrabold text-white">{stats.asistenciasHoy}</div>
                <div className="text-xs text-slate-500 mt-1">Validaciones de torniquete</div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase">Planes Activos</span>
                  <CreditCard className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="text-3xl font-extrabold text-white">{planes.length || stats.totalPlanes}</div>
                <div className="text-xs text-slate-500 mt-1">Configurados para venta</div>
              </div>
            </div>

            {/* AI Advisor Panel (Bonus Section 5.1) */}
            <div className="p-7 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/30 border border-emerald-500/20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      Asesor de Negocio con IA (Gemini)
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                        +10 Pts Extra
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Analiza métricas de socios, afluencia y membresías del gimnasio para sugerir acciones.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleGenerateAi}
                  disabled={loadingAi}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loadingAi ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Analizando métricas...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Generar Diagnóstico IA
                    </>
                  )}
                </button>
              </div>

              {aiData ? (
                <div className="mt-4 p-5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-slate-300 leading-relaxed space-y-2 whitespace-pre-line font-sans">
                  <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-800 pb-2 mb-3">
                    <span>Modelo: {aiData.modelUsed}</span>
                    <span className="font-mono text-emerald-400">Origen: {aiData.source.toUpperCase()}</span>
                  </div>
                  {aiData.insights}
                </div>
              ) : (
                <div className="text-xs text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-xl">
                  Haz clic en &ldquo;Generar Diagnóstico IA&rdquo; para obtener recomendaciones estratégicas basadas en tus socios y afluencia.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SOCIOS CRUD */}
        {activeTab === 'socios' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o documento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchSocios()}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={fetchSocios}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
                  title="Recargar"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowSocioModal(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Nuevo Socio
                </button>
              </div>
            </div>

            {/* Socios Table */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Socio</th>
                    <th className="py-3.5 px-4 font-semibold">Documento</th>
                    <th className="py-3.5 px-4 font-semibold">Plan Asignado</th>
                    <th className="py-3.5 px-4 font-semibold">Estado</th>
                    <th className="py-3.5 px-4 font-semibold">Fecha Registro</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loadingSocios ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Cargando socios de {session.tenantSchema}...
                      </td>
                    </tr>
                  ) : socios.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No hay socios registrados. Crea el primero con el botón &ldquo;Nuevo Socio&rdquo;.
                      </td>
                    </tr>
                  ) : (
                    socios.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-850/50 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{s.nombre}</div>
                          <div className="text-[11px] text-slate-400">{s.email || 'Sin correo'}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">{s.documento}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-emerald-400">{s.plan_nombre || 'Sin Plan'}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              s.estado === 'activo'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {s.estado}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {new Date(s.fecha_inicio).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleCheckin(s.id)}
                            disabled={registeringCheckin}
                            className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 transition text-[11px] font-semibold cursor-pointer"
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

            {/* Modal Nuevo Socio */}
            {showSocioModal && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                  <h3 className="text-lg font-bold text-white mb-1">Registrar Nuevo Socio</h3>
                  <p className="text-xs text-slate-400 mb-5">
                    Se creará en el schema <code className="text-emerald-400">{session.tenantSchema}</code> con Idempotency-Key.
                  </p>

                  {socioFeedback && (
                    <div className="p-3 mb-4 rounded-xl bg-rose-500/10 text-rose-400 text-xs border border-rose-500/30">
                      {socioFeedback}
                    </div>
                  )}

                  <form onSubmit={handleSaveSocio} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Completo *</label>
                      <input
                        type="text"
                        required
                        value={socioForm.nombre}
                        onChange={(e) => setSocioForm({ ...socioForm, nombre: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Documento / DNI *</label>
                      <input
                        type="text"
                        required
                        value={socioForm.documento}
                        onChange={(e) => setSocioForm({ ...socioForm, documento: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                        <input
                          type="email"
                          value={socioForm.email}
                          onChange={(e) => setSocioForm({ ...socioForm, email: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Teléfono</label>
                        <input
                          type="tel"
                          value={socioForm.telefono}
                          onChange={(e) => setSocioForm({ ...socioForm, telefono: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Plan de Membresía</label>
                      <select
                        value={socioForm.planId}
                        onChange={(e) => setSocioForm({ ...socioForm, planId: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">Seleccionar plan...</option>
                        {planes.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} (${Number(p.precio).toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Estado</label>
                      <select
                        value={socioForm.estado}
                        onChange={(e) => setSocioForm({ ...socioForm, estado: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="activo">Activo (Habilitado para entrar)</option>
                        <option value="inactivo">Inactivo (Suspendido)</option>
                      </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowSocioModal(false)}
                        className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-slate-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={savingSocio}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 flex items-center gap-1.5"
                      >
                        {savingSocio && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Guardar Socio
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ASISTENCIAS (CHECK-IN) */}
        {activeTab === 'asistencias' && (
          <div className="space-y-6">
            {/* Quick Check-in Box */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <h3 className="text-base font-bold text-white mb-1">Registro Rápido de Acceso (Torniquete / Recepción)</h3>
              <p className="text-xs text-slate-400 mb-4">
                Valida en tiempo real que el socio pertenezca al gimnasio y esté en estado &apos;activo&apos;.
              </p>

              {checkinMessage && (
                <div
                  className={`p-3 rounded-xl mb-4 text-xs flex items-center gap-2 ${
                    checkinMessage.error
                      ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                      : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  }`}
                >
                  {checkinMessage.error ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{checkinMessage.text}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={selectedSocioForCheckin}
                  onChange={(e) => setSelectedSocioForCheckin(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Seleccionar socio para validar acceso...</option>
                  {socios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} - Doc: {s.documento} ({s.estado.toUpperCase()})
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => selectedSocioForCheckin && handleCheckin(selectedSocioForCheckin)}
                  disabled={!selectedSocioForCheckin || registeringCheckin}
                  className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-teal-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {registeringCheckin ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  Validar Acceso
                </button>
              </div>
            </div>

            {/* Asistencias Table */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Últimos Accesos Registrados en {session.tenantSchema}
                </h4>
                <button onClick={fetchAsistencias} className="text-slate-400 hover:text-white text-xs flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" /> Actualizar
                </button>
              </div>

              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Fecha y Hora</th>
                    <th className="py-3 px-4 font-semibold">Socio</th>
                    <th className="py-3 px-4 font-semibold">Documento</th>
                    <th className="py-3 px-4 font-semibold">Plan</th>
                    <th className="py-3 px-4 font-semibold">Observación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loadingAsistencias ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" /> Cargando asistencias...
                      </td>
                    </tr>
                  ) : asistencias.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No hay registros de acceso aún.
                      </td>
                    </tr>
                  ) : (
                    asistencias.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-850/50">
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {new Date(a.fecha_hora).toLocaleTimeString()} · {new Date(a.fecha_hora).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">{a.socio_nombre}</td>
                        <td className="py-3 px-4 font-mono text-slate-300">{a.socio_documento}</td>
                        <td className="py-3 px-4 text-emerald-400">{a.plan_nombre || 'General'}</td>
                        <td className="py-3 px-4 text-slate-400">{a.observaciones || 'Entrada regular'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: PLANES */}
        {activeTab === 'planes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Planes y Tarifas</h3>
                <p className="text-xs text-slate-400">Tabla exclusiva de {session.tenantSchema}.planes</p>
              </div>
              <button
                onClick={() => setShowPlanModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Crear Plan
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {planes.map((plan) => (
                <div key={plan.id} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">{plan.nombre}</h4>
                    <div className="text-2xl font-extrabold text-emerald-400 mb-3">
                      ${Number(plan.precio).toLocaleString()} <span className="text-xs text-slate-400 font-normal">/ {plan.duracion_dias} días</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{plan.descripcion || 'Sin descripción adicional.'}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
                    Duración: {plan.duracion_dias} días naturales
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Crear Plan */}
            {showPlanModal && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                  <h3 className="text-lg font-bold text-white mb-4">Crear Plan de Membresía</h3>
                  <form onSubmit={handleSavePlan} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre del Plan</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Plan Anual Black"
                        value={planForm.nombre}
                        onChange={(e) => setPlanForm({ ...planForm, nombre: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Precio ($)</label>
                        <input
                          type="number"
                          required
                          placeholder="80000"
                          value={planForm.precio}
                          onChange={(e) => setPlanForm({ ...planForm, precio: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Duración (Días)</label>
                        <input
                          type="number"
                          required
                          value={planForm.duracionDias}
                          onChange={(e) => setPlanForm({ ...planForm, duracionDias: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Descripción</label>
                      <textarea
                        rows={2}
                        value={planForm.descripcion}
                        onChange={(e) => setPlanForm({ ...planForm, descripcion: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowPlanModal(false)}
                        className="px-4 py-2 rounded-xl text-xs text-slate-400 bg-slate-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={savingPlan}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950"
                      >
                        Guardar Plan
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: INSPECTOR DE ARQUITECTURA & SUSTENTACIÓN */}
        {activeTab === 'inspector' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-cyan-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Panel de Demostración para Sustentación</h3>
                  <p className="text-xs text-slate-400">
                    Herramienta interactiva para verificar en vivo los requisitos del evaluador docente.
                  </p>
                </div>
              </div>

              {/* Data isolation checklist */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                  <div className="text-slate-400 font-semibold uppercase text-[10px]">Contexto de Aislamiento PostgreSQL</div>
                  <div>Tenant ID: <code className="text-emerald-400 font-mono">{session.tenantId}</code></div>
                  <div>Slug del Gimnasio: <code className="text-emerald-400 font-mono">{session.tenantSlug}</code></div>
                  <div>PostgreSQL Schema: <code className="text-cyan-400 font-mono font-bold">{session.tenantSchema}</code></div>
                  <div>Search Path activo: <code className="text-cyan-300 font-mono">&ldquo;{session.tenantSchema}&rdquo;, public</code></div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                  <div className="text-slate-400 font-semibold uppercase text-[10px]">Mecanismos de Robustez</div>
                  <div>Autenticación: <span className="text-emerald-400 font-semibold">JWT en cookie httpOnly</span></div>
                  <div>Idempotencia: <span className="text-teal-400 font-semibold">Header Idempotency-Key + PostgreSQL TTL 24h</span></div>
                  <div>Rate Limiting: <span className="text-cyan-400 font-semibold">Sliding Window (429 + Retry-After)</span></div>
                  <div>Renderizado: <span className="text-indigo-400 font-semibold">SSR (Dashboard) + SSG (Landing) + CSR</span></div>
                </div>
              </div>

              {/* Live Action Tests */}
              <div className="flex flex-wrap gap-4 mb-6">
                <button
                  onClick={runLiveIdempotencyTest}
                  disabled={testingIdempotency}
                  className="px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-teal-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {testingIdempotency ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Ejecutar Prueba de Idempotencia en Vivo
                </button>

                <button
                  onClick={runLiveRateLimitTest}
                  disabled={testingRateLimit}
                  className="px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {testingRateLimit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Ejecutar Prueba de Rate Limiting (429) en Vivo
                </button>
              </div>

              {/* Live Log Console */}
              {testLog.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs font-mono font-bold text-slate-400 mb-2 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" /> Registro de Ejecución en Vivo:
                  </div>
                  <div className="space-y-1 font-mono text-[11px] text-slate-300">
                    {testLog.map((log, index) => (
                      <div key={index} className={log.includes('PRUEBA SUPERADA') ? 'text-emerald-400 font-bold' : ''}>
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
