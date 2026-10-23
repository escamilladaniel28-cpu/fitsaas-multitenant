'use client'

import { Search, LogOut, Shield } from 'lucide-react'

export function TopBar({
  tenantName,
  tenantSchema,
  adminName,
  adminEmail,
  onLogout,
  onOpenInspector,
  onSearch,
  searchValue,
}: {
  tenantName: string
  tenantSchema: string
  adminName: string
  adminEmail: string
  onLogout?: () => void
  onOpenInspector?: () => void
  onSearch?: (term: string) => void
  searchValue?: string
}) {
  const initials = adminName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'AD'

  return (
    <header className="flex flex-wrap items-center gap-3 py-5">
      <div className="flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.03] py-1.5 pr-4 pl-1.5 text-left backdrop-blur-xl">
        <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-volt to-volt/50 font-display text-xs font-bold text-obsidian shadow-[0_0_12px_rgba(212,255,0,0.3)]">
          {tenantName.slice(0, 2).toUpperCase()}
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-white">{tenantName}</span>
          <span className="text-[11px] font-mono text-volt/80">schema: {tenantSchema}</span>
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <label className="group relative hidden items-center sm:flex">
          <span className="sr-only">Buscar socios, asistencias o planes</span>
          <Search
            className="pointer-events-none absolute left-4 size-4 text-white/40 transition-colors group-focus-within:text-volt"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Buscar socios o documentos…"
            value={searchValue ?? ''}
            onChange={(e) => onSearch?.(e.target.value)}
            className="h-11 w-64 rounded-full border border-white/[0.08] bg-white/[0.03] pr-12 pl-11 text-sm text-white backdrop-blur-xl transition-all duration-300 outline-none placeholder:text-white/35 focus:w-80 focus:border-volt/40 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgba(212,255,0,0.08)] lg:w-72"
          />
        </label>

        {onOpenInspector && (
          <button
            type="button"
            onClick={onOpenInspector}
            className="relative flex items-center gap-1.5 h-11 px-4 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs font-medium text-white/80 backdrop-blur-xl transition-all hover:border-volt/40 hover:text-white cursor-pointer"
          >
            <Shield className="size-4 text-volt" />
            <span className="hidden md:inline">Inspector</span>
          </button>
        )}

        <div className="flex items-center gap-2 pl-1 border-l border-white/10">
          <div
            title={`${adminName} (${adminEmail})`}
            className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-zinc-800 to-zinc-950 font-display text-sm font-semibold text-white ring-1 ring-volt/40 ring-offset-2 ring-offset-obsidian"
          >
            {initials}
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="Cerrar sesión"
              className="flex size-11 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-plasma hover:border-plasma/40 backdrop-blur-xl transition cursor-pointer"
            >
              <LogOut className="size-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
