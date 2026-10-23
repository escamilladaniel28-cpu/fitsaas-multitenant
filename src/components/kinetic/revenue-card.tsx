'use client'

import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { BentoCard, CardEyebrow } from '@/components/kinetic/bento-card'
import { revenueByMonth } from '@/lib/gym-data'
import { cn } from '@/lib/utils'

const RANGES = [
  { key: '6M', months: 6 },
  { key: '12M', months: 12 },
] as const

const W = 100
const H = 100

export function RevenueCard({
  totalRevenue,
  className,
}: {
  totalRevenue?: number
  className?: string
}) {
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('12M')
  const [hovered, setHovered] = useState<number | null>(null)

  const months = RANGES.find((r) => r.key === range)!.months
  const data = revenueByMonth.slice(-months)
  const values = data.map((d) => d.value)
  const min = Math.min(...values) * 0.92
  const max = Math.max(...values) * 1.04
  const coords = data.map((d, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((d.value - min) / (max - min)) * H,
  }))

  const line = coords.reduce((path, p, i) => {
    if (i === 0) return `M${p.x},${p.y}`
    const prev = coords[i - 1]
    const cx = (prev.x + p.x) / 2
    return `${path} C${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`
  }, '')
  const area = `${line} L${W},${H} L0,${H} Z`

  const active = hovered ?? data.length - 1
  const activePoint = coords[active]
  const first = data[0].value
  const last = data[data.length - 1].value
  const growth = ((last - first) / first) * 100

  function handleMove(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    setHovered(Math.max(0, Math.min(data.length - 1, Math.round(ratio * (data.length - 1)))))
  }

  const displayValue = totalRevenue !== undefined && hovered === null 
    ? (totalRevenue / 1000).toFixed(1)
    : data[active].value.toFixed(1)

  return (
    <BentoCard labelledBy="revenue" delay={160} className={cn('flex flex-col', className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <CardEyebrow id="revenue">Ingresos por Membresías</CardEyebrow>
          <div className="flex items-baseline gap-3">
            <p className="font-display text-5xl font-semibold tracking-[-0.05em] text-white tabular-nums">
              ${displayValue}k
            </p>
            <span className="inline-flex items-center gap-0.5 text-sm font-medium text-volt">
              <ArrowUpRight className="size-4" aria-hidden="true" />
              +{growth.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-white/40">
            {hovered === null ? 'Mes en curso (estimado)' : `Total de ${data[active].month}`} · Crecimiento a {months} meses
          </p>
        </div>

        <div role="radiogroup" aria-label="Rango de tiempo" className="flex rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              role="radio"
              aria-checked={range === r.key}
              onClick={() => {
                setRange(r.key)
                setHovered(null)
              }}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/60 cursor-pointer',
                range === r.key ? 'bg-volt text-obsidian font-bold shadow-[0_0_12px_rgba(212,255,0,0.3)]' : 'text-white/50 hover:text-white',
              )}
            >
              {r.key}
            </button>
          ))}
        </div>
      </div>

      <div
        className="relative mt-8 h-56 flex-1 cursor-crosshair touch-none lg:min-h-56"
        onPointerMove={handleMove}
        onPointerLeave={() => setHovered(null)}
        role="img"
        aria-label={`Los ingresos crecieron de $${first}k a $${last}k`}
      >
        {[0.25, 0.5, 0.75].map((t) => (
          <div
            key={t}
            className="absolute inset-x-0 border-t border-dashed border-white/[0.05]"
            style={{ top: `${t * 100}%` }}
            aria-hidden="true"
          />
        ))}

        <svg key={range} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full animate-draw overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--volt)" stopOpacity="0.22" />
              <stop offset="70%" stopColor="var(--volt)" stopOpacity="0.02" />
              <stop offset="100%" stopColor="var(--volt)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#revenue-fill)" className="animate-rise" />
          <path
            d={line}
            fill="none"
            stroke="var(--volt)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            className="[filter:drop-shadow(0_0_8px_rgba(212,255,0,0.5))]"
          />
        </svg>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-px bg-gradient-to-b from-transparent via-white/25 to-transparent transition-[left] duration-200 ease-out"
          style={{ left: `${activePoint.x}%` }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-obsidian bg-volt shadow-[0_0_0_6px_rgba(212,255,0,0.15),0_0_18px_var(--volt)] transition-[left,top] duration-200 ease-out"
          style={{ left: `${activePoint.x}%`, top: `${activePoint.y}%` }}
        />
      </div>

      <div className="mt-3 flex justify-between font-mono text-[10px] text-white/35" aria-hidden="true">
        {data.map((d, i) => (
          <span key={d.month} className={cn('transition-colors', i === active && 'text-volt font-bold')}>
            {d.month}
          </span>
        ))}
      </div>
    </BentoCard>
  )
}
