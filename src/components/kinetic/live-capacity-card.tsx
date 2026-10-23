'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { BentoCard, CardEyebrow } from '@/components/kinetic/bento-card'
import { cn } from '@/lib/utils'

const MAX_CAPACITY = 120
const RADIUS = 92
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const initialZones = [
  { name: 'Zona de pesas', current: 34, max: 45 },
  { name: 'Área cardio', current: 18, max: 35 },
  { name: 'Salón de clases', current: 15, max: 20 },
  { name: 'Recuperación / Funcional', current: 8, max: 20 },
]

export function LiveCapacityCard({ liveCount, className }: { liveCount?: number; className?: string }) {
  const [zones, setZones] = useState(initialZones)

  useEffect(() => {
    const interval = setInterval(() => {
      setZones((prev) =>
        prev.map((zone) => {
          const delta = Math.round((Math.random() - 0.5) * 3)
          return { ...zone, current: Math.min(zone.max, Math.max(3, zone.current + delta)) }
        }),
      )
    }, 3200)
    return () => clearInterval(interval)
  }, [])

  const current = liveCount !== undefined ? liveCount : zones.reduce((sum, z) => sum + z.current, 0)
  const ratio = Math.min(1, current / MAX_CAPACITY)
  const offset = CIRCUMFERENCE * (1 - ratio)
  const level = ratio > 0.85 ? 'Casi lleno' : ratio > 0.5 ? 'Afluencia media' : 'Espacio óptimo'

  return (
    <BentoCard labelledBy="live-capacity" delay={80} className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between">
        <CardEyebrow id="live-capacity">Aforo en Tiempo Real</CardEyebrow>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-volt/20 bg-volt/10 px-2.5 py-1 text-[11px] text-volt">
          <span className="size-1.5 animate-pulse-dot rounded-full bg-volt" aria-hidden="true" />
          En Vivo
        </span>
      </div>

      <div className="relative mx-auto my-8 aspect-square w-full max-w-[280px] lg:my-auto lg:py-6">
        <svg viewBox="0 0 220 220" className="size-full -rotate-90" aria-hidden="true">
          <defs>
            <linearGradient id="ring-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--volt)" />
              <stop offset="100%" stopColor="#9fe600" />
            </linearGradient>
          </defs>
          <circle cx="110" cy="110" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
          <circle
            cx="110"
            cy="110"
            r={RADIUS - 18}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
            strokeDasharray="2 6"
          />
          <circle
            cx="110"
            cy="110"
            r={RADIUS}
            fill="none"
            stroke="url(#ring-gradient)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ '--circumference': CIRCUMFERENCE } as React.CSSProperties}
            className="animate-ring-fill transition-[stroke-dashoffset] duration-1000 ease-out [filter:drop-shadow(0_0_10px_rgba(212,255,0,0.55))]"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-display text-7xl font-semibold tracking-[-0.06em] text-white tabular-nums" aria-live="polite">
            {current}
          </p>
          <p className="mt-1 text-xs text-white/45">
            de {MAX_CAPACITY} · <span className="text-volt">{level}</span>
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-3.5">
        {zones.map((zone) => {
          const pct = zone.current / zone.max
          const hot = pct >= 0.75
          return (
            <li key={zone.name} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-white/70">{zone.name}</span>
                <span className="font-mono text-white/45 tabular-nums">
                  <span className={hot ? 'text-plasma' : 'text-white'}>{zone.current}</span>/{zone.max}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={cn(
                    'h-full rounded-full transition-[width] duration-1000 ease-out',
                    hot ? 'bg-plasma shadow-[0_0_10px_var(--plasma)]' : 'bg-volt/80',
                  )}
                  style={{ width: `${pct * 100}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>

      <p className="mt-6 flex items-center gap-2 border-t border-white/[0.06] pt-5 text-xs text-white/40">
        <Clock className="size-3.5" aria-hidden="true" />
        Hora pico estimada: <span className="text-white/80 font-mono">18:30 hrs</span>
      </p>
    </BentoCard>
  )
}
