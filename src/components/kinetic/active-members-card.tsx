import { ArrowUpRight } from 'lucide-react'
import { BentoCard, CardEyebrow } from '@/components/kinetic/bento-card'
import { Sparkline } from '@/components/kinetic/sparkline'
import { activeMembersTrend } from '@/lib/gym-data'

export function ActiveMembersCard({
  count,
  totalCount,
  className,
}: {
  count: number
  totalCount?: number
  className?: string
}) {
  const miniStats = [
    { label: 'Total Registrados', value: String(totalCount ?? count), tone: 'text-white' },
    { label: 'Tasa Retención', value: '98.4%', tone: 'text-volt' },
    { label: 'Membresía Activa', value: count > 0 ? `${Math.round((count / (totalCount || count)) * 100)}%` : '100%', tone: 'text-white' },
  ]

  return (
    <BentoCard labelledBy="active-members" className={className}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-24 -z-10 size-80 rounded-full bg-volt/10 blur-3xl transition-opacity duration-700 group-hover/card:opacity-150"
      />
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="size-1.5 animate-pulse-dot rounded-full bg-volt" aria-hidden="true" />
          <CardEyebrow id="active-members">Socios Activos</CardEyebrow>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-volt/10 px-2.5 py-1 text-xs font-medium text-volt border border-volt/20">
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
          +12.4% vs mes anterior
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <p className="font-display text-[clamp(4.5rem,10vw,8.5rem)] leading-[0.82] font-semibold tracking-[-0.065em] text-white tabular-nums">
          {count.toLocaleString('es-CO')}
        </p>
        <dl className="grid grid-cols-3 gap-6 md:pb-2">
          {miniStats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1">
              <dt className="text-[11px] text-white/40">{stat.label}</dt>
              <dd className={`font-display text-xl font-semibold tracking-tight tabular-nums ${stat.tone}`}>
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <Sparkline data={[...activeMembersTrend.slice(0, -1), count]} id="members" className="mt-6 h-16 w-full" />
      <div className="mt-2 flex justify-between font-mono text-[10px] text-white/30">
        <span>Histórico de afluencia</span>
        <span>Tiempo real</span>
      </div>
    </BentoCard>
  )
}
