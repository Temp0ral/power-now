'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  pointerWithin,
} from '@dnd-kit/core'
import DroppableDay from './DroppableDay'
import AddServiceModal from './AddServiceModal'
import {
  Service,
  Availability,
  DAYS,
  getWeekStart,
  addDays,
  formatDate,
  formatDisplay,
} from '@/lib/scheduleUtils'

export default function EllenScheduleView() {
  const supabase = createClient()

  const [weekStart, setWeekStart] = useState<Date>(getWeekStart(new Date()))
  const [unscheduled, setUnscheduled] = useState<Service[]>([])
  const [scheduled, setScheduled] = useState<Record<string, Service[]>>({})
  const [availability, setAvailability] = useState<Availability[]>([])
  const [loading, setLoading] = useState(true)
  const [autoScheduling, setAutoScheduling] = useState(false)
  const [activeService, setActiveService] = useState<Service | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
  const [generators, setGenerators] = useState<{ id: string; system_model: string; customer_id: string }[]>([])

  const weekDates = DAYS.map((_, i) => addDays(weekStart, i))

  useEffect(() => {
    fetchData()
  }, [weekStart])

  useEffect(() => {
    fetchCustomersAndGenerators()
  }, [])

  async function fetchCustomersAndGenerators() {
    const { data: custData } = await supabase.from('customers').select('id, name').order('name')
    if (custData) setCustomers(custData)
    const { data: genData } = await supabase.from('generators').select('id, system_model, customer_id')
    if (genData) setGenerators(genData)
  }

  async function fetchData() {
    setLoading(true)
    const weekStartStr = formatDate(weekStart)

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
      .order('created_at')

    if (servicesData) {
      const mapped: Service[] = servicesData.map((s: any) => ({
        ...s,
        customer: s.generators?.customers,
        generator: { system_model: s.generators?.system_model },
      }))

      setUnscheduled(
        mapped.filter(
          (s) => !s.scheduled_date && !s.customer_signature && !s.customer_not_home
        )
      )

      const weekScheduled: Record<string, Service[]> = {}
      weekDates.forEach((d) => {
        const dateStr = formatDate(d)
        weekScheduled[dateStr] = mapped.filter((s) => s.scheduled_date === dateStr)
      })
      setScheduled(weekScheduled)
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

  async function handleAutoSchedule() {
    setAutoScheduling(true)

    const availableDays = DAYS.map((_, i) => {
      const avail = availability.find((a) => a.day_of_week === i)
      return {
        index: i,
        date: formatDate(weekDates[i]),
        type: avail?.availability_type ?? 'unavailable',
        maxServices: avail?.availability_type === 'full_day' ? 8 : avail?.availability_type === 'half_day' ? 5 : 0,
        current: scheduled[formatDate(weekDates[i])]?.length ?? 0,
      }
    }).filter((d) => d.maxServices > 0 && d.current < d.maxServices)

    if (availableDays.length === 0 || unscheduled.length === 0) {
      setAutoScheduling(false)
      return
    }

    const toSchedule = [...unscheduled]
    const updates: { id: string; scheduled_date: string }[] = []

    for (const day of availableDays) {
      const slots = day.maxServices - day.current
      if (toSchedule.length === 0 || slots <= 0) continue

      const batch = toSchedule.splice(0, slots)

      if (batch.length > 1) {
        const addresses = batch.map((s) => s.customer?.address ?? '')
        try {
          const res = await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ addresses }),
          })
          const { order } = await res.json()
          const orderedBatch = order.map((i: number) => batch[i])
          orderedBatch.forEach((s: Service) =>
            updates.push({ id: s.id, scheduled_date: day.date })
          )
        } catch {
          batch.forEach((s) => updates.push({ id: s.id, scheduled_date: day.date }))
        }
      } else {
        batch.forEach((s) => updates.push({ id: s.id, scheduled_date: day.date }))
      }
    }

    for (const update of updates) {
      await supabase
        .from('services')
        .update({ scheduled_date: update.scheduled_date, is_scheduled: true })
        .eq('id', update.id)
    }

    await fetchData()
    setAutoScheduling(false)
  }

 async function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event
  setActiveService(null)
  if (!over || active.id === over.id) return

  const serviceId = active.id as string
  let targetDate = over.id as string
  const validDates = weekDates.map(formatDate)

  // If dropped onto a service card inside unscheduled, treat as unscheduled
  if (unscheduled.some((s) => s.id === targetDate)) {
    targetDate = 'unscheduled'
  }

  // If dropped onto a service card inside a day, find which day it belongs to
  if (!validDates.includes(targetDate) && targetDate !== 'unscheduled') {
    const foundDate = validDates.find((date) =>
      scheduled[date]?.some((s) => s.id === targetDate)
    )
    if (foundDate) {
      targetDate = foundDate
    } else {
      return
    }
  }

  const targetAvail = availability.find(
    (a) => a.day_of_week === weekDates.findIndex((d) => formatDate(d) === targetDate)
  )
  const maxServices =
    targetAvail?.availability_type === 'full_day'
      ? 10
      : targetAvail?.availability_type === 'half_day'
      ? 7
      : 0

  const targetServices = scheduled[targetDate] ?? []
  if (targetDate !== 'unscheduled' && targetServices.length >= maxServices) return

  const newDate = targetDate === 'unscheduled' ? null : targetDate

  await supabase
    .from('services')
    .update({ scheduled_date: newDate, is_scheduled: newDate !== null })
    .eq('id', serviceId)

  await fetchData()
}

  function handleDragStart(event: DragStartEvent) {
    const serviceId = event.active.id as string
    const allServices = [...unscheduled, ...Object.values(scheduled).flat()]
    const service = allServices.find((s) => s.id === serviceId)
    if (service) setActiveService(service)
  }

  async function handleAddService(data: {
    customer_id: string
    generator_id: string
    is_pm: boolean
    is_repair: boolean
    is_emergency: boolean
  }) {
    await supabase.from('services').insert({
      generator_id: data.generator_id,
      date: new Date().toISOString().split('T')[0],
      is_pm: data.is_pm,
      is_repair: data.is_repair,
      is_emergency: data.is_emergency,
      is_scheduled: false,
    })
    setAddModalOpen(false)
    await fetchData()
  }

  if (loading) return <p className="text-gray-500">Loading...</p>

  return (
  <DndContext
  collisionDetection={pointerWithin}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Schedule</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAddModalOpen(true)}
              className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + Add Service
            </button>
            <button
              onClick={handleAutoSchedule}
              disabled={autoScheduling}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {autoScheduling ? 'Scheduling...' : '⚡ Auto-Schedule'}
            </button>
          </div>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setWeekStart(getWeekStart(addDays(weekStart, -7)))}
            className="p-2 bg-white rounded-lg shadow hover:bg-gray-50"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-gray-700">
            {formatDisplay(weekStart)} — {formatDisplay(addDays(weekStart, 4))}
          </span>
          <button
            onClick={() => setWeekStart(getWeekStart(addDays(weekStart, 7)))}
            className="p-2 bg-white rounded-lg shadow hover:bg-gray-50"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => setWeekStart(getWeekStart(new Date()))}
            className="text-sm text-orange-500 font-medium"
          >
            Today
          </button>
        </div>

        {/* 5 day columns */}
        <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
          {DAYS.map((day, i) => {
            const dateStr = formatDate(weekDates[i])
            const avail = availability.find((a) => a.day_of_week === i)
            const type = avail?.availability_type ?? 'unavailable'
            const dayServices = scheduled[dateStr] ?? []
            const maxServices = type === 'full_day' ? 10 : type === 'half_day' ? 7 : 0

            return (
              <div key={day}>
                <div className="mb-2">
                  <p className="text-sm font-bold text-gray-700">{day}</p>
                  <p className="text-xs text-gray-400">{formatDisplay(weekDates[i])}</p>
                  <div className="flex gap-1 mt-1">
                    {(['half_day', 'full_day'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => handleAvailabilityToggle(i, t)}
                        className={`text-xs px-2 py-0.5 rounded transition-colors ${
                          type === t
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {t === 'half_day' ? 'Half' : 'Full'}
                      </button>
                    ))}
                  </div>
                  {type !== 'unavailable' && (
                    <p className="text-xs text-gray-400 mt-1">
                      {dayServices.length}/{maxServices} services
                    </p>
                  )}
                </div>
                <DroppableDay
                  id={dateStr}
                  services={dayServices}
                  unavailable={type === 'unavailable'}
                />
              </div>
            )
          })}
        </div>

        {/* Unscheduled services — full width below */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Clock size={16} className="text-orange-500" />
            Unscheduled Services ({unscheduled.length})
          </h3>
          <DroppableDay
            id="unscheduled"
            services={unscheduled}
            horizontal
          />
        </div>
      </div>

      <DragOverlay>
        {activeService && (
          <div className="bg-white rounded-lg shadow-xl p-3 border-l-4 border-orange-500 opacity-90">
            <p className="font-semibold text-gray-900 text-sm">{activeService.customer?.name}</p>
            <p className="text-xs text-gray-500">{activeService.generator?.system_model}</p>
          </div>
        )}
      </DragOverlay>

      {addModalOpen && (
        <AddServiceModal
          customers={customers}
          generators={generators}
          onClose={() => setAddModalOpen(false)}
          onSave={handleAddService}
        />
      )}
    </DndContext>
  )
}