export type MemberStatus = 'activo' | 'pendiente' | 'vencido'
export type MemberPlan = 'Básico' | 'Premium' | 'Anual' | 'Estudiante'

export type Member = {
  id: string
  name: string
  email: string
  plan: MemberPlan
  status: MemberStatus
  joinedAt: string
  lastVisit: string
  visits: number
}

export const PLANS: MemberPlan[] = ['Básico', 'Premium', 'Anual', 'Estudiante']

export const PLAN_PRICES: Record<MemberPlan, number> = {
  Básico: 29,
  Premium: 49,
  Anual: 420,
  Estudiante: 19,
}

export const initialMembers: Member[] = [
  { id: 'GYM-1042', name: 'Lucía Fernández', email: 'lucia.fernandez@mail.com', plan: 'Premium', status: 'activo', joinedAt: '2025-03-12', lastVisit: 'Hoy, 07:42', visits: 18 },
  { id: 'GYM-1041', name: 'Marcos Ruiz', email: 'marcos.ruiz@mail.com', plan: 'Anual', status: 'activo', joinedAt: '2024-11-02', lastVisit: 'Hoy, 06:15', visits: 22 },
  { id: 'GYM-1040', name: 'Ana Belén Torres', email: 'anabelen.t@mail.com', plan: 'Básico', status: 'pendiente', joinedAt: '2026-10-01', lastVisit: 'Ayer, 19:30', visits: 6 },
  { id: 'GYM-1039', name: 'Diego Martín', email: 'diego.martin@mail.com', plan: 'Estudiante', status: 'activo', joinedAt: '2026-02-18', lastVisit: 'Hoy, 12:05', visits: 14 },
  { id: 'GYM-1038', name: 'Carla Jiménez', email: 'carla.jimenez@mail.com', plan: 'Premium', status: 'vencido', joinedAt: '2025-06-25', lastVisit: 'Hace 23 días', visits: 0 },
  { id: 'GYM-1037', name: 'Javier Morales', email: 'j.morales@mail.com', plan: 'Anual', status: 'activo', joinedAt: '2024-09-14', lastVisit: 'Ayer, 20:48', visits: 19 },
  { id: 'GYM-1036', name: 'Sofía Navarro', email: 'sofia.navarro@mail.com', plan: 'Básico', status: 'activo', joinedAt: '2026-05-09', lastVisit: 'Hace 2 días', visits: 9 },
  { id: 'GYM-1035', name: 'Pablo Ortega', email: 'pablo.ortega@mail.com', plan: 'Premium', status: 'pendiente', joinedAt: '2026-09-27', lastVisit: 'Hace 4 días', visits: 4 },
  { id: 'GYM-1034', name: 'Elena Castro', email: 'elena.castro@mail.com', plan: 'Estudiante', status: 'activo', joinedAt: '2026-01-30', lastVisit: 'Hoy, 09:20', visits: 16 },
  { id: 'GYM-1033', name: 'Raúl Domínguez', email: 'raul.dominguez@mail.com', plan: 'Básico', status: 'vencido', joinedAt: '2025-08-03', lastVisit: 'Hace 41 días', visits: 0 },
]
