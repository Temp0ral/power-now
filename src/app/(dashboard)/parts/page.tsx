'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getWeekStart, addDays, formatDate, formatDisplay } from '@/lib/scheduleUtils'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

type PartUsage = {
  spark_plugs: number
  air_filters: number
  batteries: number
  oil_quarts: number
}

type WeeklyData = {
  week: string
  'Spark Plugs': number
  'Air Filters': number
  'Batteries': number
  'Oil (qt)': number
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
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)
  const [weeksToShow, setWeeksToShow] = useState(8)

  useEffect(() => {
    fetchUsage()
  }, [weekStart])

  useEffect(() => {
    fetchHistoricalData()
  }, [weeksToShow])

  async function getWeekUsage(start: Date): Promise<PartUsage> {
    const weekStartStr = formatDate(start)
    const weekEnd = formatDate(addDays(start, 6))

    const { data: servicesData } = await supabase
      .from('services')
      .select('id, is_pm')
      .gte('scheduled_date', weekStartStr)
      .lte('scheduled_date', weekEnd)
      .or('customer_signature.not.is.null,customer_not_home.eq.true')

    if (!servicesData || servicesData.length === 0) {
      return { spark_plugs: 0, air_filters: 0, batteries: 0, oil_quarts: 0 }
    }

    const serviceIds = servicesData.map((s) => s.id)
    const pmCount = servicesData.filter((s) => s.is_pm).length

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

    return {
      spark_plugs,
      air_filters,
      batteries,
      oil_quarts: pmCount * 1.5,
    }
  }

  async function fetchUsage() {
    setLoading(true)
    const data = await getWeekUsage(weekStart)
    setUsage(data)
    setLoading(false)
  }

  async function fetchHistoricalData() {
    setChartLoading(true)
    const weeks: WeeklyData[] = []

    for (let i = weeksToShow - 1; i >= 0; i--) {
      const start = getWeekStart(addDays(new Date(), -i * 7))
      const data = await getWeekUsage(start)
      weeks.push({
        week: formatDisplay(start),
        'Spark Plugs': data.spark_plugs,
        'Air Filters': data.air_filters,
        'Batteries': data.batteries,
        'Oil (qt)': data.oil_quarts,
      })
    }

    setWeeklyData(weeks)
    setChartLoading(false)
  }

  const parts = [
    { label: 'Spark Plugs', value: usage.spark_plugs, unit: 'plugs', icon: '⚡' },
    { label: 'Air Filters', value: usage.air_filters, unit: 'filters', icon: '🌬️' },
    { label: 'Batteries', value: usage.batteries, unit: 'batteries', icon: '🔋' },
    { label: 'Oil', value: usage.oil_quarts, unit: 'quarts', icon: '🛢️' },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Parts Usage</h2>
      <p className="text-gray-500 text-sm mb-6">Tracks parts used in completed services.</p>

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

      {/* Weekly usage cards */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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

      {/* Historical chart */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-bold text-gray-900">Parts History</h3>
          <select
            value={weeksToShow}
            onChange={(e) => setWeeksToShow(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value={4}>Last 4 weeks</option>
            <option value={8}>Last 8 weeks</option>
            <option value={12}>Last 12 weeks</option>
            <option value={16}>Last 16 weeks</option>
            <option value={20}>Last 20 weeks</option>
            <option value={30}>Last 30 weeks</option>
          </select>
        </div>
        {chartLoading ? (
          <p className="text-gray-500 text-sm">Loading chart...</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '12px',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
              />
              <Line type="monotone" dataKey="Spark Plugs" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Air Filters" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Batteries" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Oil (qt)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}