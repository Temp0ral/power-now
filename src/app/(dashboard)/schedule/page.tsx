'use client'

import { useRole } from '@/lib/role'
import EllenScheduleView from '@/components/schedule/EllenScheduleView'
import EmileScheduleView from '@/components/schedule/EmileScheduleView'
import JasonScheduleView from '@/components/schedule/JasonScheduleView'

export default function SchedulePage() {
  const { role } = useRole()

  if (role === 'emile') return <EmileScheduleView />
  if (role === 'jason') return <JasonScheduleView />
  return <EllenScheduleView />
}