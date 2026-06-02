'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getWeekStart, addDays, formatDate, formatDisplay, DAYS } from '@/lib/scheduleUtils'

type PartUsage = {
  spark_plugs: number
  air_filters: number
  batteries: number
  oil_quarts: number
}

export default function PartsPage() {
  const supabase = createClient()

  const [weekStart, setWeekStart] = useState<Date>(getWeekStart(new Date()))
  const [usage, setUsage] = useState<PartUsage>({
    spark_plugs: 0,
    air_filters: 0,
    batteries: 0,
    oil_quarts: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsage()
  }, [weekStart])

  async function fetchUsage() {
    setLoading(true)
    const weekStartStr = formatDate(weekStart)
    const weekEnd = formatDate(addDays(weekStart, 6))

    // Get all completed services for this week
    const { data: servicesData } = await supabase
      .from('services')
      .select('id, is_pm')
      .gte('scheduled_date', weekStartStr)
      .lte('scheduled_date', weekEnd)
      .or('customer_signature.not.is.null,customer_not_home.eq.true')

    if (!servicesData || servicesData.length === 0) {
      setUsage({ spark_plugs: 0, air_filters: 0, batteries: 0, oil_quarts: 0 })
      setLoading(false)
      return
    }

    const serviceIds = servicesData.map((s) => s.id)
    const pmCount = servicesData.filter((s) => s.is_pm).length

    // Get parts used for these services
    const { data: partsData } = await supabase
      .from('service_parts')
      .select('*')
      .in('service_id', serviceIds)

    let spark_plugs = 0
    let air_filters = 0
    let batteries = 0

    if (partsData) {
      partsData.forEach((p) => {
        if (p.part_name === 'spark_plug_1') spark_plugs += 1
        if (p.part_name === 'spark_plugs_2') spark_plugs += 2
        if (p.part_name === 'air_filter') air_filters += p.quantity
        if (p.part_name === 'battery') batteries += p.quantity
      })
    }

    setUsage({
      spark_plugs,
      air_filters,
      batteries,
      oil_quarts: pmCount * 1.5,
    })

    setLoading(false)
  }

  const parts = [
    {
      label: 'Spark Plugs',
      value: usage.spark_plugs,
      unit: 'plugs',
      icon: '⚡',
    },
    {
      label: 'Air Filters',
      value: usage.air_filters,
      unit: 'filters',
      icon: '🌬️',
    },
    {
      label: 'Batteries',
      value: usage.batteries,
      unit: 'batteries',
      icon: '🔋',
    },
    {
      label: 'Oil',
      value: usage.oil_quarts,
      unit: 'quarts',
      icon: '🛢️',
    },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Parts Usage</h2>
      <p className="text-gray-500 text-sm mb-6">Tracks parts used in completed services for the selected week.</p>

      {/* Week navigation */}
      <div className="flex items-center gap-3 mb-8">
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
          This Week
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {parts.map((part) => (
            <div key={part.label} className="bg-white rounded-xl shadow p-6 text-center">
              <div className="text-3xl mb-3">{part.icon}</div>
              <p className="text-sm font-medium text-gray-500 mb-1">{part.label}</p>
              <p className="text-4xl font-bold text-gray-900">{part.value}</p>
              <p className="text-xs text-gray-400 mt-1">{part.unit} used</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}