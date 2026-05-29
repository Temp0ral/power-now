'use client'

import { useRole } from '@/lib/role'
import EllenScheduleView from '@/components/schedule/EllenScheduleView'
import EmileScheduleView from '@/components/schedule/EmileScheduleView'

export default function SchedulePage() {
  const { role } = useRole()

  if (role === 'emile') return <EmileScheduleView />
  return <EllenScheduleView />
}