'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Service } from '@/lib/scheduleUtils'

export default function SortableServiceCard({ service }: { service: Service }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: service.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const isCompleted = !!service.customer_signature || !!service.customer_not_home

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`rounded-lg shadow-sm p-3 cursor-grab active:cursor-grabbing border-l-4 ${
        isCompleted
          ? 'bg-gray-100 border-gray-400'
          : service.is_emergency
          ? 'bg-white border-red-500'
          : service.is_repair
          ? 'bg-white border-yellow-500'
          : 'bg-white border-orange-500'
      }`}
    >
      <p className={`font-semibold text-sm ${isCompleted ? 'text-gray-400' : 'text-gray-900'}`}>
        {service.customer?.name}
      </p>
      <p className={`text-xs ${isCompleted ? 'text-gray-400' : 'text-gray-500'}`}>
        {service.generator?.system_model}
      </p>
      <div className="flex items-center gap-1 mt-1 flex-wrap">
        {!isCompleted && (
          <>
            {service.is_pm && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">PM</span>}
            {service.is_repair && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Repair</span>}
            {service.is_emergency && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Emergency</span>}
            {service.additional_maintenance && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">⚠ Extra</span>}
          </>
        )}
        {isCompleted && (
          <span className="text-xs text-gray-400">
            {service.customer_not_home ? 'Not home' : 'Completed'}
          </span>
        )}
      </div>
    </div>
  )
}