'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Service,
  Availability,
  DAYS,
  getWeekStart,
  addDays,
  formatDate,
  formatDisplay,
} from '@/lib/scheduleUtils'

export default function JasonScheduleView() {
  const supabase = createClient()

  const [weekStart, setWeekStart] = useState<Date>(getWeekStart(new Date()))
  const [scheduled, setScheduled] = useState<Record<string, Service[]>>({})
  const [availability, setAvailability] = useState<Availability[]>([])
  const [loading, setLoading] = useState(true)

  const weekDates = DAYS.map((_, i) => addDays(weekStart, i))

  useEffect(() => {
    fetchData()
  }, [weekStart])

  async function fetchData() {
    setLoading(true)
    const weekStartStr = formatDate(weekStart)
    const weekEnd = formatDate(addDays(weekStart, 6))

    const { data: availData } = await supabase
      .from('availability')
      .select('*')
      .eq('week_start', weekStartStr)
    if (availData) setAvailability(availData)

    const { data: servicesData } = await supabase
      .from('services')
      .select(`
        *,
        generators!inner(
          system_model,
          customers!inner(name, address)
        )
      `)
      .gte('scheduled_date', weekStartStr)
      .lte('scheduled_date', weekEnd)
      .order('scheduled_date')

    if (servicesData) {
      const mapped: Service[] = servicesData.map((s: any) => ({
        ...s,
        customer: s.generators?.customers,
        generator: { system_model: s.generators?.system_model },
      }))

      const weekScheduled: Record<string, Service[]> = {}
      weekDates.forEach((d) => {
        const dateStr = formatDate(d)
        weekScheduled[dateStr] = mapped.filter((s) => s.scheduled_date === dateStr)
      })
      setScheduled(weekScheduled)
    }

    setLoading(false)
  }

  if (loading) return <p className="text-gray-500">Loading...</p>

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Schedule</h2>
      <p className="text-gray-500 text-sm mb-6">
        Week of {formatDisplay(weekStart)} — {formatDisplay(addDays(weekStart, 4))}
      </p>

      {/* Week navigation */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setWeekStart(getWeekStart(addDays(weekStart, -7)))}
          className="p-2 bg-white rounded-lg shadow hover:bg-gray-50"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => setWeekStart(getWeekStart(new Date()))}
          className="text-sm text-orange-500 font-medium"
        >
          This Week
        </button>
        <button
          onClick={() => setWeekStart(getWeekStart(addDays(weekStart, 7)))}
          className="p-2 bg-white rounded-lg shadow hover:bg-gray-50"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Week grid */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
        {DAYS.map((day, i) => {
          const dateStr = formatDate(weekDates[i])
          const avail = availability.find((a) => a.day_of_week === i)
          const type = avail?.availability_type ?? 'unavailable'
          const dayServices = scheduled[dateStr] ?? []

          return (
            <div key={day}>
              <div className="mb-2">
                <p className="text-sm font-bold text-gray-700">{day}</p>
                <p className="text-xs text-gray-400">{formatDisplay(weekDates[i])}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
                  type === 'full_day' ? 'bg-green-100 text-green-700' :
                  type === 'half_day' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {type === 'full_day' ? 'Full Day' : type === 'half_day' ? 'Half Day' : 'Unavailable'}
                </span>
                <p className="text-xs text-gray-400 mt-1">{dayServices.length} services</p>
              </div>

              <div className={`min-h-32 rounded-xl p-2 space-y-2 bg-gray-50 border-2 border-dashed border-gray-200`}>
                {dayServices.length === 0 && (
                  <p className="text-xs text-gray-400 text-center pt-4">No services</p>
                )}
                {dayServices.map((service) => {
                  const isCompleted = !!service.customer_signature || !!service.customer_not_home
                  return (
                    <div
                      key={service.id}
                      className={`rounded-lg p-3 border-l-4 ${
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
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {service.is_pm && !isCompleted && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">PM</span>}
                        {service.is_repair && !isCompleted && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Repair</span>}
                        {service.is_emergency && !isCompleted && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Emergency</span>}
                        {isCompleted && <span className="text-xs text-gray-400">{service.customer_not_home ? 'Not home' : '✓ Done'}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}