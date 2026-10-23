'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Plus,
  RefreshCw,
  Loader2,
  KeyRound,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { BentoCard, CardEyebrow } from '@/components/kinetic/bento-card';
import { cn } from '@/lib/utils';

interface ClaseItem {
  id: string;
  nombre: string;
  instructor: string;
  horario: string;
  cupos_totales: number;
  reservas_count: number;
  cupos_disponibles: number;
  created_at?: string;
}

interface ClassesViewProps {
  tenantSchema?: string;
  onCheckinSuccess?: () => void;
}

const newClassFormSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  instructor: z.string().trim().min(2, 'El instructor debe tener al menos 2 caracteres').max(100),
  horario: z.string().min(1, 'El horario de la clase es obligatorio'),
  cuposTotales: z.coerce.number().int().positive('Los cupos deben ser un número positivo'),
});

export function ClassesView({ tenantSchema, onCheckinSuccess }: ClassesViewProps) {
  // Check-in State
  const [pin, setPin] = useState('');
  const [validatingPin, setValidatingPin] = useState(false);
  const [checkinFeedback, setCheckinFeedback] = useState<{
    success: boolean;
    message: string;
    socio?: { id: string; nombre: string; documento: string };
    clase?: { id: string; nombre: string; instructor: string; horario: string };
  } | null>(null);

  // Clases State
  const [clases, setClases] = useState<ClaseItem[]>([]);
  const [loadingClases, setLoadingClases] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingClase, setCreatingClase] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal Form State
  const [formData, setFormData] = useState({
    nombre: '',
    instructor: '',
    horario: '',
    cuposTotales: '15',
  });

  const fetchClases = async () => {
    setLoadingClases(true);
    try {
      const res = await fetch('/api/clases');
      const data = await res.json();
      if (res.ok && data.clases) {
        setClases(data.clases);
      }
    } catch (err) {
      console.error('Error al cargar clases:', err);
    } finally {
      setLoadingClases(false);
    }
  };

  useEffect(() => {
    fetchClases();
  }, []);

  // Check-in Handler
  const handleValidateCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim();

    if (cleanPin.length !== 6) {
      setCheckinFeedback({
        success: false,
        message: 'El código PIN debe ser exactamente de 6 dígitos numéricos.',
      });
      return;
    }

    setValidatingPin(true);
    setCheckinFeedback(null);

    try {
      const res = await fetch('/api/reservas/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: cleanPin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCheckinFeedback({
          success: false,
          message: data.error || 'Código PIN no válido o reserva no encontrada.',
        });
        return;
      }

      // Éxito
      setCheckinFeedback({
        success: true,
        message: `¡Acceso Concedido! ${data.socio?.nombre || 'Socio'} a la clase ${data.clase?.nombre || 'deportiva'}.`,
        socio: data.socio,
        clase: data.clase,
      });
      setPin('');

      // Notificar al dashboard y refrescar lista de clases
      if (onCheckinSuccess) onCheckinSuccess();
      fetchClases();
    } catch (err: any) {
      setCheckinFeedback({
        success: false,
        message: err.message || 'Error de conexión al validar el PIN.',
      });
    } finally {
      setValidatingPin(false);
    }
  };

  // Crear Clase Handler (con Idempotencia y Zod)
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const validation = newClassFormSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Datos del formulario inválidos';
      setModalError(firstError);
      return;
    }

    setCreatingClase(true);
    try {
      const idempotencyKey = uuidv4();
      const res = await fetch('/api/clases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          nombre: validation.data.nombre,
          instructor: validation.data.instructor,
          horario: new Date(validation.data.horario).toISOString(),
          cuposTotales: validation.data.cuposTotales,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al programar la clase');
      }

      setShowCreateModal(false);
      setFormData({
        nombre: '',
        instructor: '',
        horario: '',
        cuposTotales: '15',
      });
      fetchClases();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setCreatingClase(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* SECCIÓN 1: PANEL DE CHECK-IN POR PIN (Destacada) */}
      <BentoCard className="relative overflow-hidden border-volt/20 bg-gradient-to-br from-zinc-950/90 via-obsidian to-zinc-900/60 p-6 sm:p-8 shadow-[0_0_50px_-15px_rgba(212,255,0,0.12)]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-xl">
            <CardEyebrow>Control de Acceso en Vivo</CardEyebrow>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white mt-1">
              Validar Ingreso a Clase con PIN
            </h2>
            <p className="text-sm text-white/50 mt-1">
              Ingresa el código PIN de 6 dígitos que el socio recibió al realizar su reserva. La validación es atómica y registra automáticamente la asistencia en el schema.
            </p>
          </div>

          {/* Formulario de PIN Gigante */}
          <form
            onSubmit={handleValidateCheckin}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0"
          >
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-volt/70 pointer-events-none" />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full sm:w-56 h-14 bg-black/60 border-2 border-volt/30 rounded-full pl-12 pr-4 text-2xl sm:text-3xl font-mono font-bold tracking-[0.35em] text-volt placeholder:text-white/15 focus:outline-none focus:border-volt focus:ring-4 focus:ring-volt/20 transition-all text-center"
              />
            </div>

            <button
              type="submit"
              disabled={validatingPin || pin.length < 6}
              className="h-14 px-8 rounded-full bg-volt text-obsidian font-display font-semibold text-sm hover:bg-volt/90 transition shadow-[0_0_28px_rgba(212,255,0,0.35)] hover:shadow-[0_0_36px_rgba(212,255,0,0.5)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              {validatingPin ? (
                <>
                  <Loader2 className="size-5 animate-spin" /> Verificando...
                </>
              ) : (
                <>
                  <ShieldCheck className="size-5" /> Validar Ingreso
                </>
              )}
            </button>
          </form>
        </div>

        {/* FEEDBACK BANNER (Verde Neón en éxito, Rojo Plasma en error) */}
        {checkinFeedback && (
          <div
            className={cn(
              'mt-6 p-4 sm:p-5 rounded-2xl border transition-all animate-rise flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4',
              checkinFeedback.success
                ? 'bg-volt/10 border-volt/40 text-volt shadow-[0_0_30px_rgba(212,255,0,0.15)]'
                : 'bg-plasma/10 border-plasma/40 text-plasma shadow-[0_0_30px_rgba(255,90,54,0.15)]'
            )}
          >
            <div className="flex items-start sm:items-center gap-3">
              {checkinFeedback.success ? (
                <div className="size-10 rounded-full bg-volt text-obsidian flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(212,255,0,0.4)]">
                  <CheckCircle2 className="size-6 stroke-[2.5]" />
                </div>
              ) : (
                <div className="size-10 rounded-full bg-plasma text-white flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(255,90,54,0.4)]">
                  <AlertCircle className="size-6 stroke-[2.5]" />
                </div>
              )}
              <div>
                <h4 className="font-display text-base font-semibold">
                  {checkinFeedback.message}
                </h4>
                {checkinFeedback.socio && checkinFeedback.clase && (
                  <p className="text-xs opacity-80 mt-0.5">
                    Documento: <span className="font-mono">{checkinFeedback.socio.documento}</span> · Instructor: {checkinFeedback.clase.instructor}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => setCheckinFeedback(null)}
              className="text-xs opacity-70 hover:opacity-100 uppercase tracking-wider px-3 py-1 rounded-full border border-current hover:bg-white/5 transition self-end sm:self-auto cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}
      </BentoCard>

      {/* SECCIÓN 2: LISTA DE CLASES PROGRAMADAS */}
      <BentoCard className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <CardEyebrow>Programación Deportiva</CardEyebrow>
            <h3 className="font-display text-2xl font-semibold tracking-tight text-white mt-1">
              Clases Disponibles
            </h3>
            <p className="text-xs text-white/50 mt-0.5">
              Gestiona los cupos, instructores y reservas de tu gimnasio.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchClases}
              disabled={loadingClases}
              title="Refrescar lista"
              className="size-10 rounded-full border border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.08] flex items-center justify-center transition cursor-pointer"
            >
              <RefreshCw className={cn('size-4', loadingClases && 'animate-spin')} />
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="h-10 px-5 rounded-full bg-volt text-obsidian font-semibold text-xs hover:bg-volt/90 transition shadow-[0_0_20px_rgba(212,255,0,0.25)] flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="size-4" /> Programar Nueva Clase
            </button>
          </div>
        </div>

        {/* Tabla / Grid de Clases */}
        {loadingClases ? (
          <div className="py-16 text-center text-white/40 flex flex-col items-center justify-center gap-3">
            <Loader2 className="size-6 animate-spin text-volt" />
            <p className="text-xs">Cargando clases desde el schema...</p>
          </div>
        ) : clases.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-8">
            <Calendar className="size-10 mx-auto text-white/20 mb-3" />
            <h4 className="font-display text-base font-semibold text-white">No hay clases programadas</h4>
            <p className="text-xs text-white/40 mt-1 max-w-sm mx-auto">
              Aún no has creado ninguna clase en tu gimnasio. Programa la primera para que tus socios comiencen a reservar.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 rounded-full bg-white/10 text-white text-xs hover:bg-white/20 transition cursor-pointer"
            >
              Programar Clase Ahora
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-white/40 uppercase tracking-wider font-mono text-[10px]">
                  <th className="pb-3 font-medium">Clase / Actividad</th>
                  <th className="pb-3 font-medium">Instructor</th>
                  <th className="pb-3 font-medium">Horario</th>
                  <th className="pb-3 font-medium text-center">Cupos Reservados</th>
                  <th className="pb-3 font-medium text-right">Disponibilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {clases.map((clase) => {
                  const fechaObj = new Date(clase.horario);
                  const fechaFormat = fechaObj.toLocaleDateString('es-CO', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  });
                  const horaFormat = fechaObj.toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  const pctOcupacion =
                    clase.cupos_totales > 0
                      ? Math.min(100, Math.round((clase.reservas_count / clase.cupos_totales) * 100))
                      : 0;

                  return (
                    <tr key={clase.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl bg-volt/10 text-volt border border-volt/20 flex items-center justify-center font-display font-bold text-sm">
                            {clase.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-white text-sm block">
                              {clase.nombre}
                            </span>
                            <span className="text-[10px] text-white/40 font-mono">
                              ID: {clase.id.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 text-white/70">
                        <div className="flex items-center gap-1.5">
                          <User className="size-3.5 text-white/40" />
                          <span>{clase.instructor}</span>
                        </div>
                      </td>

                      <td className="py-4 text-white/80">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3.5 text-volt/70" />
                          <span className="capitalize">{fechaFormat}</span>
                          <span className="text-white/40">·</span>
                          <span className="font-mono text-volt">{horaFormat}</span>
                        </div>
                      </td>

                      <td className="py-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <span className="font-mono font-semibold text-white">
                            {clase.reservas_count} / {clase.cupos_totales}
                          </span>
                          <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                pctOcupacion >= 100 ? 'bg-plasma' : 'bg-volt'
                              )}
                              style={{ width: `${pctOcupacion}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-4 text-right">
                        {clase.cupos_disponibles <= 0 ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-plasma/10 text-plasma border border-plasma/20">
                            Agotado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-volt/10 text-volt border border-volt/20">
                            {clase.cupos_disponibles} libres
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </BentoCard>

      {/* MODAL: PROGRAMAR NUEVA CLASE */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-rise">
          <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-zinc-950 p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-6 right-6 text-white/40 hover:text-white transition cursor-pointer"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="size-10 rounded-2xl bg-volt/15 text-volt border border-volt/25 flex items-center justify-center">
                <Calendar className="size-5" />
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold text-white">
                  Programar Clase
                </h3>
                <p className="text-xs text-white/50">
                  Añade una nueva sesión deportiva en el schema del tenant.
                </p>
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-2xl bg-plasma/10 border border-plasma/30 text-plasma text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/80 mb-1.5">
                  Nombre de la Clase *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Funcional HIIT, Yoga Restaurativo"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full h-11 bg-white/[0.04] border border-white/10 rounded-full px-4 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-volt/50 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/80 mb-1.5">
                  Instructor Responsable *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos Méndez"
                  value={formData.instructor}
                  onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                  className="w-full h-11 bg-white/[0.04] border border-white/10 rounded-full px-4 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-volt/50 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-1.5">
                    Horario de Inicio *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.horario}
                    onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                    className="w-full h-11 bg-white/[0.04] border border-white/10 rounded-full px-4 text-xs text-white focus:outline-none focus:border-volt/50 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/80 mb-1.5">
                    Cupos Totales *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={formData.cuposTotales}
                    onChange={(e) => setFormData({ ...formData, cuposTotales: e.target.value })}
                    className="w-full h-11 bg-white/[0.04] border border-white/10 rounded-full px-4 text-xs text-white focus:outline-none focus:border-volt/50 transition"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-[11px] text-white/50 flex items-center gap-2 mt-2">
                <Sparkles className="size-4 text-volt shrink-0" />
                <span>Petición atómica protegida con clave de idempotencia única.</span>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="h-11 px-5 rounded-full text-xs text-white/60 hover:text-white transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingClase}
                  className="h-11 px-6 rounded-full bg-volt text-obsidian font-semibold text-xs hover:bg-volt/90 transition shadow-[0_0_20px_rgba(212,255,0,0.3)] disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {creatingClase ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Guardando...
                    </>
                  ) : (
                    'Guardar Clase'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
