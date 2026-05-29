'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, CheckCircle, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import AvailabilitySelector from './AvailabilitySelector'
import {
  Service,
  Availability,
  DAYS,
  getWeekStart,
  addDays,
  formatDate,
  formatDisplay,
} from '@/lib/scheduleUtils'

export default function EmileScheduleView() {
  const supabase = createClient()

  const [weekStart, setWeekStart] = useState<Date>(getWeekStart(new Date()))
  const [scheduled, setScheduled] = useState<Service[]>([])
  const [availability, setAvailability] = useState<Availability[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'uncompleted' | 'completed'>('uncompleted')

  const weekDates = DAYS.map((_, i) => addDays(weekStart, i))

  useEffect(() => {
    fetchData()
  }, [weekStart])

  async function fetchData() {
    setLoading(true)
    const weekStartStr = formatDate(weekStart)

    const { data: availData } = await supabase
      .from('availability')
      .select('*')
      .eq('week_start', weekStartStr)
    if (availData) setAvailability(availData)

    const weekEnd = formatDate(addDays(weekStart, 6))
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
      setScheduled(servicesData.map((s: any) => ({
        ...s,
        customer: s.generators?.customers,
        generator: { system_model: s.generators?.system_model },
      })))
    }
    setLoading(false)
  }

  async function handleAvailabilityToggle(dayIndex: number, type: 'half_day' | 'full_day') {
    const weekStartStr = formatDate(weekStart)
    const existing = availability.find(
      (a) => a.week_start === weekStartStr && a.day_of_week === dayIndex
    )

    if (existing) {
      if (existing.availability_type === type) {
        await supabase.from('availability').delete().eq('id', existing.id)
        setAvailability((prev) => prev.filter((a) => a.id !== existing.id))
      } else {
        await supabase.from('availability').update({ availability_type: type }).eq('id', existing.id)
        setAvailability((prev) =>
          prev.map((a) => (a.id === existing.id ? { ...a, availability_type: type } : a))
        )
      }
    } else {
      const { data } = await supabase
        .from('availability')
        .insert({ week_start: weekStartStr, day_of_week: dayIndex, availability_type: type })
        .select()
        .single()
      if (data) setAvailability((prev) => [...prev, data])
    }
  }

  const uncompleted = scheduled.filter((s) => !s.customer_signature)
  const completed = scheduled.filter((s) => !!s.customer_signature)
  const displayed = tab === 'uncompleted' ? uncompleted : completed

  if (loading) return <p className="text-gray-500">Loading...</p>

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">My Schedule</h2>
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

      {/* Availability */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <h3 className="text-sm font-bold text-gray-700 mb-3">My Availability This Week</h3>
        <AvailabilitySelector
          weekDates={weekDates}
          availability={availability}
          onToggle={handleAvailabilityToggle}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('uncompleted')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'uncompleted' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 shadow'
          }`}
        >
          To Do ({uncompleted.length})
        </button>
        <button
          onClick={() => setTab('completed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'completed' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 shadow'
          }`}
        >
          Completed ({completed.length})
        </button>
      </div>

      {/* Services list */}
      {displayed.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No services {tab === 'uncompleted' ? 'to complete' : 'completed'} this week.
        </p>
      ) : (
        <div className="space-y-3">
          {displayed.map((service) => (
            <div
              key={service.id}
              className={`bg-white rounded-xl shadow p-4 border-l-4 ${
                service.customer_signature ? 'border-green-500' : 'border-orange-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{service.customer?.name}</p>
                  <p className="text-sm text-gray-500">{service.customer?.address}</p>
                  <p className="text-sm text-gray-500">{service.generator?.system_model}</p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {service.is_pm && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">PM</span>}
                    {service.is_repair && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Repair</span>}
                    {service.is_emergency && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Emergency</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">{service.scheduled_date}</p>
                  {service.customer_signature && (
                    <CheckCircle size={20} className="text-green-500 mt-1 ml-auto" />
                  )}
                </div>
              </div>
              {!service.customer_signature && (
                <Link
                  href={`/services/${service.id}`}
                  className="mt-3 w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <ClipboardList size={16} />
                  Start Service
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}