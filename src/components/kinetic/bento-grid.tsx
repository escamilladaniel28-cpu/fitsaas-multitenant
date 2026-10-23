'use client'

import { useState } from 'react'
import { NewMemberDialog } from '@/components/dashboard/new-member-dialog'
import { ActiveMembersCard } from '@/components/kinetic/active-members-card'
import { CheckInsTable, type CheckInItem } from '@/components/kinetic/checkins-table'
import { LiveCapacityCard } from '@/components/kinetic/live-capacity-card'
import { QuickActionsCard } from '@/components/kinetic/quick-actions-card'
import { RevenueCard } from '@/components/kinetic/revenue-card'
import { activeMembersTrend, initialCheckIns } from '@/lib/gym-data'

const tones: ('volt' | 'plasma' | 'neutral')[] = ['volt', 'plasma', 'neutral']

export function BentoGrid() {
  const [checkIns, setCheckIns] = useState<CheckInItem[]>(
    initialCheckIns.map((c) => ({
      id: c.id,
      name: c.name,
      plan: c.plan,
      time: c.time,
      status: c.status,
      tone: c.tone,
    }))
  )
  const [activeCount, setActiveCount] = useState(activeMembersTrend[activeMembersTrend.length - 1])
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <ActiveMembersCard count={activeCount} className="lg:col-span-8" />
        <LiveCapacityCard className="lg:col-span-4 lg:row-span-2" />
        <RevenueCard className="lg:col-span-8" />
        <CheckInsTable checkIns={checkIns} className="lg:col-span-8" />
        <QuickActionsCard onRegister={() => setDialogOpen(true)} className="lg:sticky lg:top-6 lg:col-span-4 lg:self-start" />
      </div>

      <NewMemberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        planes={[]}
        onCreate={async ({ nombre, planId }) => {
          const now = new Date()
          const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
          setActiveCount((n) => n + 1)
          setCheckIns((prev) => [
            {
              id: `c-${now.getTime()}`,
              name: nombre,
              plan: planId || 'General',
              time,
              status: 'in',
              tone: tones[prev.length % tones.length],
            },
            ...prev,
          ])
        }}
      />
    </>
  )
}
