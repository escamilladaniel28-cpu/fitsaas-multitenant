'use client'

import { Calendar, CreditCard, LayoutGrid, Shield, UserCheck, Users, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TabKey = 'resumen' | 'socios' | 'asistencias' | 'clases' | 'planes' | 'inspector'

const items: { label: string; key: TabKey; icon: any }[] = [
  { label: 'Resumen', key: 'resumen', icon: LayoutGrid },
  { label: 'Socios', key: 'socios', icon: Users },
  { label: 'Asistencias', key: 'asistencias', icon: UserCheck },
  { label: 'Clases', key: 'clases', icon: Calendar },
  { label: 'Planes', key: 'planes', icon: CreditCard },
  { label: 'Inspector', key: 'inspector', icon: Shield },
]

export function FloatingSidebar({
  activeTab,
  onTabChange,
  userRole,
}: {
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
  userRole?: string
}) {
  const visibleItems =
    userRole === 'empleado'
      ? items.filter((i) => ['resumen', 'socios', 'asistencias', 'clases'].includes(i.key))
      : items

  return (
    <nav
      aria-label="Principal"
      className={cn(
        'fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/[0.08] bg-zinc-900/70 p-1.5 backdrop-blur-2xl',
        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_20px_50px_-20px_rgba(0,0,0,0.9)]',
        'lg:top-1/2 lg:bottom-auto lg:left-5 lg:translate-x-0 lg:-translate-y-1/2 lg:flex-col lg:gap-2 lg:p-2.5',
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-volt text-obsidian shadow-[0_0_24px_-4px_var(--volt)] lg:mb-2 lg:size-11">
        <Zap className="size-5 fill-current" aria-hidden="true" />
        <span className="sr-only">FitSaaS Core</span>
      </div>

      {visibleItems.map(({ label, key, icon: Icon }) => {
        const isActive = activeTab === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => onTabChange(key)}
            className={cn(
              'group relative flex size-10 items-center justify-center rounded-full transition-all duration-300 lg:size-11 cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/60',
              isActive
                ? 'bg-volt/15 text-volt shadow-[inset_0_0_14px_rgba(212,255,0,0.22),0_0_22px_-8px_var(--volt)] ring-1 ring-volt/40'
                : 'text-white/45 hover:bg-white/[0.06] hover:text-white',
            )}
          >
            <Icon className="size-[18px]" aria-hidden="true" />
            <span className="sr-only">{label}</span>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-full ml-4 hidden -translate-x-1 rounded-full border border-white/10 bg-zinc-900/90 px-3 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 backdrop-blur-xl transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 lg:block z-50 shadow-lg"
            >
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
