import { cn } from '@/lib/utils'

export function BentoCard({
  children,
  className,
  delay = 0,
  labelledBy,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  labelledBy?: string
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        'group/card relative isolate overflow-hidden rounded-[28px] border border-white/[0.07] bg-white/[0.025] p-6 backdrop-blur-xl',
        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_24px_48px_-28px_rgba(0,0,0,0.9)]',
        'animate-rise transition-[border-color,background-color] duration-500 hover:border-white/[0.13] hover:bg-white/[0.035]',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />
      {children}
    </section>
  )
}

export function CardEyebrow({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
      {children}
    </h2>
  )
}
