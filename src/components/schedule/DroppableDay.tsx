'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import SortableServiceCard from './SortableServiceCard'
import { Service } from '@/lib/scheduleUtils'

type Props = {
  id: string
  services: Service[]
  unavailable?: boolean
  horizontal?: boolean
}

export default function DroppableDay({ id, services, unavailable, horizontal }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl p-3 transition-colors ${
        horizontal ? 'min-h-24 flex flex-wrap gap-2' : 'min-h-32 space-y-2'
      } ${
        unavailable
          ? 'bg-gray-100 border-2 border-dashed border-gray-200'
          : isOver
          ? 'bg-orange-50 border-2 border-dashed border-orange-300'
          : 'bg-gray-50 border-2 border-dashed border-gray-200'
      }`}
    >
      {unavailable && (
        <p className="text-xs text-gray-400 text-center pt-4">Unavailable</p>
      )}
      {!unavailable && services.length === 0 && (
        <p className="text-xs text-gray-400 text-center pt-4">
          {horizontal ? 'Drag services here to unschedule' : 'Drop services here'}
        </p>
      )}
      <SortableContext
        items={services.map((s) => s.id)}
        strategy={horizontal ? horizontalListSortingStrategy : verticalListSortingStrategy}
      >
        {services.map((service) => (
          <SortableServiceCard key={service.id} service={service} />
        ))}
      </SortableContext>
    </div>
  )
}