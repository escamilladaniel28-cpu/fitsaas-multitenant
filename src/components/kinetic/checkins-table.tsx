'use client'

import { ArrowRight, RefreshCw } from 'lucide-react'
import { BentoCard, CardEyebrow } from '@/components/kinetic/bento-card'
import { initials } from '@/lib/gym-data'
import { cn } from '@/lib/utils'

export interface CheckInItem {
  id: string
  name: string
  documento?: string
  plan: string
  zone?: string
  time: string
  status: 'in' | 'out'
  tone?: 'volt' | 'plasma' | 'neutral'
}

const toneStyles: Record<'volt' | 'plasma' | 'neutral', string> = {
  volt: 'bg-volt/15 text-volt ring-volt/25',
  plasma: 'bg-plasma/15 text-plasma ring-plasma/25',
  neutral: 'bg-white/[0.07] text-white/80 ring-white/10',
}

export function CheckInsTable({
  checkIns,
  onRefresh,
  onViewAll,
  className,
}: {
  checkIns: CheckInItem[]
  onRefresh?: () => void
  onViewAll?: () => void
  className?: string
}) {
  return (
    <BentoCard labelledBy="checkins" delay={240} className={cn('p-0', className)}>
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <CardEyebrow id="checkins">Últimos Accesos Registrados</CardEyebrow>
          <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 font-mono text-[10px] text-volt">
            {checkIns.length} hoy
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/[0.05] transition cursor-pointer"
              title="Actualizar accesos"
            >
              <RefreshCw className="size-3.5" />
            </button>
          )}
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/60 cursor-pointer"
            >
              Gestionar asistencias
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-[11px] tracking-[0.14em] text-white/35 uppercase border-b border-white/[0.05]">
              <th scope="col" className="px-6 pb-3 font-medium">Socio</th>
              <th scope="col" className="px-3 pb-3 font-medium">Documento</th>
              <th scope="col" className="px-3 pb-3 font-medium">Hora</th>
              <th scope="col" className="px-6 pb-3 text-right font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {checkIns.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-xs text-white/40">
                  No hay accesos registrados hoy. Valida un socio desde Asistencias.
                </td>
              </tr>
            ) : (
              checkIns.map((c) => {
                const tone = c.tone || 'volt'
                return (
                  <tr
                    key={c.id}
                    className="group/row animate-rise border-t border-white/[0.05] transition-colors duration-300 hover:bg-volt/[0.035]"
                  >
                    <td className="relative px-6 py-3.5">
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-volt opacity-0 shadow-[0_0_12px_var(--volt)] transition-opacity duration-300 group-hover/row:opacity-100"
                      />
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-full font-display text-xs font-semibold ring-1',
                            toneStyles[tone],
                          )}
                          aria-hidden="true"
                        >
                          {initials(c.name)}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-medium text-white">{c.name}</span>
                          <span className="text-xs text-white/40">{c.plan || 'General'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 font-mono text-xs text-white/60">{c.documento || '—'}</td>
                    <td className="px-3 py-3.5 font-mono text-xs text-white/60 tabular-nums">{c.time}</td>
                    <td className="px-6 py-3.5 text-right">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                          c.status === 'in' ? 'bg-volt/10 text-volt border border-volt/20' : 'bg-white/[0.05] text-white/45 border border-white/10',
                        )}
                      >
                        <span
                          className={cn('size-1.5 rounded-full', c.status === 'in' ? 'bg-volt shadow-[0_0_6px_var(--volt)]' : 'bg-white/30')}
                          aria-hidden="true"
                        />
                        {c.status === 'in' ? 'En Gimnasio' : 'Salida'}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </BentoCard>
  )
}
