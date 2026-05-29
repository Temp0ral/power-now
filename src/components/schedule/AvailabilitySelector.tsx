'use client'

import { DAYS, Availability, formatDisplay, addDays } from '@/lib/scheduleUtils'

type Props = {
  weekDates: Date[]
  availability: Availability[]
  onToggle: (dayIndex: number, type: 'half_day' | 'full_day') => void
  compact?: boolean
}

export default function AvailabilitySelector({ weekDates, availability, onToggle, compact }: Props) {
  return (
    <div className={`grid gap-2 ${compact ? 'grid-cols-5' : 'grid-cols-5'}`}>
      {DAYS.map((day, i) => {
        const avail = availability.find((a) => a.day_of_week === i)
        const type = avail?.availability_type ?? 'unavailable'
        return (
          <div key={day} className="text-center">
            <p className="text-xs text-gray-500 mb-1">{day.slice(0, 3)}</p>
            <p className="text-xs text-gray-400 mb-2">{formatDisplay(weekDates[i])}</p>
            <div className="space-y-1">
              <button
                onClick={() => onToggle(i, 'half_day')}
                className={`w-full text-xs py-1 rounded transition-colors ${
                  type === 'half_day'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                Half
              </button>
              <button
                onClick={() => onToggle(i, 'full_day')}
                className={`w-full text-xs py-1 rounded transition-colors ${
                  type === 'full_day'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                Full
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}