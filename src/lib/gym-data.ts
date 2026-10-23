import type { MemberPlan } from '@/lib/members'

export type CheckIn = {
  id: string
  name: string
  plan: MemberPlan
  zone: string
  time: string
  status: 'in' | 'out'
  tone: 'volt' | 'plasma' | 'neutral'
}

export const activeMembersTrend = [
  2180, 2196, 2191, 2214, 2230, 2226, 2251, 2268, 2262, 2289, 2305, 2298, 2324, 2341, 2337, 2362, 2380,
  2374, 2401, 2420, 2436, 2451, 2470, 2486,
]

export const revenueByMonth = [
  { month: 'Nov', value: 118.4 },
  { month: 'Dec', value: 124.1 },
  { month: 'Jan', value: 131.6 },
  { month: 'Feb', value: 129.2 },
  { month: 'Mar', value: 138.7 },
  { month: 'Apr', value: 146.3 },
  { month: 'May', value: 152.0 },
  { month: 'Jun', value: 149.4 },
  { month: 'Jul', value: 161.8 },
  { month: 'Aug', value: 168.5 },
  { month: 'Sep', value: 176.9 },
  { month: 'Oct', value: 184.2 },
]

export const capacityZones = [
  { name: 'Strength floor', current: 34, max: 50 },
  { name: 'Cardio deck', current: 22, max: 40 },
  { name: 'Studio A', current: 19, max: 24 },
  { name: 'Recovery', current: 12, max: 26 },
]

export const initialCheckIns: CheckIn[] = [
  { id: 'c1', name: 'Lucía Fernández', plan: 'Premium', zone: 'Strength floor', time: '12:41', status: 'in', tone: 'volt' },
  { id: 'c2', name: 'Marcus Reid', plan: 'Anual', zone: 'Studio A', time: '12:38', status: 'in', tone: 'neutral' },
  { id: 'c3', name: 'Aiko Tanaka', plan: 'Premium', zone: 'Cardio deck', time: '12:30', status: 'in', tone: 'plasma' },
  { id: 'c4', name: 'Diego Martín', plan: 'Estudiante', zone: 'Recovery', time: '12:22', status: 'out', tone: 'neutral' },
  { id: 'c5', name: 'Nadia Okafor', plan: 'Anual', zone: 'Strength floor', time: '12:14', status: 'in', tone: 'volt' },
  { id: 'c6', name: 'Elena Castro', plan: 'Básico', zone: 'Cardio deck', time: '12:05', status: 'out', tone: 'plasma' },
]

export const PLAN_LABELS: Record<MemberPlan, string> = {
  Básico: 'Basic',
  Premium: 'Premium',
  Anual: 'Annual',
  Estudiante: 'Student',
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}
