'use client'

import { CreditCard, Plus, Shield, Sparkles, UserCheck } from 'lucide-react'
import { CardEyebrow } from '@/components/kinetic/bento-card'
import { cn } from '@/lib/utils'

export function QuickActionsCard({
  onRegister,
  onCheckin,
  onNewPlan,
  onAiAnalytics,
  onInspector,
  nextClassText,
  className,
}: {
  onRegister: () => void
  onCheckin?: () => void
  onNewPlan?: () => void
  onAiAnalytics?: () => void
  onInspector?: () => void
  nextClassText?: string
  className?: string
}) {
  const secondary = [
    { label: 'Check-in Acceso', icon: UserCheck, hint: 'C', action: onCheckin },
    { label: 'Crear Plan', icon: CreditCard, hint: 'P', action: onNewPlan },
    { label: 'Diagnóstico IA', icon: Sparkles, hint: 'IA', action: onAiAnalytics },
    { label: 'Inspector', icon: Shield, hint: 'INS', action: onInspector },
  ]

  return (
    <div
      style={{ animationDelay: '320ms' }}
      className={cn(
        'animate-rise rounded-[30px] bg-gradient-to-b from-volt/40 via-white/10 to-white/[0.04] p-px shadow-[0_30px_60px_-30px_rgba(212,255,0,0.35)]',
        className,
      )}
    >
      <section
        aria-labelledby="quick-actions"
        className="relative overflow-hidden rounded-[29px] bg-zinc-950/90 p-6 backdrop-blur-2xl"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 left-1/2 size-48 -translate-x-1/2 rounded-full bg-volt/15 blur-3xl"
        />
        <CardEyebrow id="quick-actions">Acciones Rápidas</CardEyebrow>

        <button
          type="button"
          onClick={onRegister}
          className="group relative mt-5 flex h-14 w-full items-center justify-between rounded-full border border-volt/30 bg-black pr-2 pl-6 font-medium text-volt transition-all duration-300 hover:border-volt/60 hover:shadow-[0_0_32px_-6px_var(--volt),inset_0_0_18px_rgba(212,255,0,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt active:scale-[0.98] cursor-pointer"
        >
          <span className="font-semibold text-white">Registrar Socio</span>
          <span className="flex size-10 items-center justify-center rounded-full bg-volt text-obsidian transition-transform duration-300 group-hover:rotate-90">
            <Plus className="size-5" aria-hidden="true" />
          </span>
        </button>

        <ul className="mt-3 grid grid-cols-2 gap-2">
          {secondary.map(({ label, icon: Icon, hint, action }) => (
            <li key={label}>
              <button
                type="button"
                onClick={action}
                className="group flex w-full flex-col items-start gap-6 rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/60 active:scale-[0.98] cursor-pointer"
              >
                <span className="flex w-full items-center justify-between">
                  <Icon className="size-[18px] text-white/60 transition-colors group-hover:text-volt" aria-hidden="true" />
                  <kbd className="font-mono text-[10px] text-white/30">{hint}</kbd>
                </span>
                <span className="text-xs font-medium text-white">{label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex items-center gap-3 rounded-[20px] border border-plasma/20 bg-plasma/[0.06] p-4">
          <span className="font-display text-2xl font-semibold tracking-tight text-plasma tabular-nums">18:00</span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-white">
              {nextClassText || 'Entrenamiento Funcional · Sala A'}
            </span>
            <span className="text-xs text-white/45">22 de 24 cupos reservados</span>
          </div>
        </div>
      </section>
    </div>
  )
}
