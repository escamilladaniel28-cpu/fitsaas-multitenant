'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface PlanOption {
  id: string
  nombre: string
  precio: number | string
  duracion_dias?: number
}

export function NewMemberDialog({
  open,
  onOpenChange,
  planes,
  onCreate,
  saving,
  feedback,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  planes: PlanOption[]
  onCreate: (data: {
    nombre: string
    documento: string
    email: string
    telefono: string
    planId: string
    estado: string
  }) => Promise<void>
  saving?: boolean
  feedback?: string | null
}) {
  const [formData, setFormData] = useState({
    nombre: '',
    documento: '',
    email: '',
    telefono: '',
    planId: '',
    estado: 'activo',
  })

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!formData.nombre.trim() || !formData.documento.trim()) return
    await onCreate(formData)
    setFormData({
      nombre: '',
      documento: '',
      email: '',
      telefono: '',
      planId: '',
      estado: 'activo',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-6 rounded-[28px] border border-white/10 bg-zinc-950/95 p-6 backdrop-blur-2xl sm:max-w-md text-foreground">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold tracking-tight text-white">
            Registrar Socio
          </DialogTitle>
          <DialogDescription className="text-white/50 text-xs">
            Ingresa los datos del nuevo miembro y asigna su membresía en el schema de PostgreSQL.
          </DialogDescription>
        </DialogHeader>

        {feedback && (
          <div className="p-3 rounded-xl bg-plasma/10 border border-plasma/30 text-plasma text-xs">
            {feedback}
          </div>
        )}

        <form id="new-member" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nombre" className="text-xs text-white/80">Nombre completo *</Label>
            <Input
              id="nombre"
              name="nombre"
              placeholder="Ej: Laura Gómez"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              autoComplete="off"
              className="h-11 rounded-full px-4 border-white/10 bg-white/[0.03] text-white focus-visible:border-volt/50"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="documento" className="text-xs text-white/80">Documento / Cédula *</Label>
            <Input
              id="documento"
              name="documento"
              placeholder="Ej: 1020304050"
              required
              value={formData.documento}
              onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
              autoComplete="off"
              className="h-11 rounded-full px-4 border-white/10 bg-white/[0.03] text-white focus-visible:border-volt/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-xs text-white/80">Correo electrónico</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="laura@mail.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                autoComplete="off"
                className="h-11 rounded-full px-4 border-white/10 bg-white/[0.03] text-white focus-visible:border-volt/50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="telefono" className="text-xs text-white/80">Teléfono</Label>
              <Input
                id="telefono"
                name="telefono"
                type="tel"
                placeholder="+57 300 123 4567"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                autoComplete="off"
                className="h-11 rounded-full px-4 border-white/10 bg-white/[0.03] text-white focus-visible:border-volt/50"
              />
            </div>
          </div>

          <fieldset className="flex flex-col">
            <legend className="mb-2 text-xs font-medium text-white/80">Plan de Membresía</legend>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {planes.length === 0 ? (
                <div className="col-span-2 text-xs text-white/40 p-3 rounded-2xl border border-white/10 text-center">
                  Sin planes registrados en el schema
                </div>
              ) : (
                planes.map((p) => (
                  <label
                    key={p.id}
                    className={cn(
                      'flex cursor-pointer flex-col gap-0.5 rounded-2xl border px-3.5 py-2.5 text-xs transition-all duration-300',
                      formData.planId === p.id
                        ? 'border-volt/50 bg-volt/[0.08] shadow-[inset_0_0_16px_rgba(212,255,0,0.08)]'
                        : 'border-white/[0.08] hover:border-white/20 bg-white/[0.02]',
                    )}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={p.id}
                      checked={formData.planId === p.id}
                      onChange={() => setFormData({ ...formData, planId: p.id })}
                      className="sr-only"
                    />
                    <span className={cn('font-medium text-white', formData.planId === p.id && 'text-volt')}>{p.nombre}</span>
                    <span className="font-mono text-[11px] text-white/45">
                      ${Number(p.precio).toLocaleString()} {p.duracion_dias ? `· ${p.duracion_dias}d` : ''}
                    </span>
                  </label>
                ))
              )}
            </div>
          </fieldset>
        </form>

        <DialogFooter className="gap-2">
          <DialogClose render={<Button variant="ghost" className="h-11 rounded-full px-5 text-white/60 hover:text-white" />}>
            Cancelar
          </DialogClose>
          <Button
            type="submit"
            form="new-member"
            disabled={saving}
            className="h-11 rounded-full border border-volt/40 bg-volt text-obsidian font-semibold px-6 hover:bg-volt/90 hover:shadow-[0_0_28px_-6px_var(--volt)] cursor-pointer"
          >
            {saving ? 'Registrando...' : 'Guardar Socio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
