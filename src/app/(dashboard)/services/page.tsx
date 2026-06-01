'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useRole } from '@/lib/role'
import { Search } from 'lucide-react'

type Service = {
  id: string
  date: string
  is_pm: boolean
  is_repair: boolean
  is_emergency: boolean
  additional_maintenance: boolean
  customer_signature: string | null
  customer_not_home: boolean
  scheduled_date: string | null
  customer?: { name: string }
  generator?: { system_model: string }
}

export default function ServicesPage() {
  const supabase = createClient()
  const router = useRouter()
  const { role } = useRole()

  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'pm' | 'repair' | 'emergency'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'unscheduled' | 'scheduled' | 'completed'>('all')
  const [filterExtra, setFilterExtra] = useState(false)

  useEffect(() => {
    fetchServices()
  }, [])

  async function fetchServices() {
    setLoading(true)
    const { data } = await supabase
      .from('services')
      .select(`
        *,
        generators!inner(
          system_model,
          customers!inner(name)
        )
      `)
      .order('date', { ascending: false })

    if (data) {
      setServices(data.map((s: any) => ({
        ...s,
        customer: s.generators?.customers,
        generator: { system_model: s.generators?.system_model },
      })))
    }
    setLoading(false)
  }

  const filtered = services
    .filter((s) => {
      if (filterType === 'pm') return s.is_pm
      if (filterType === 'repair') return s.is_repair
      if (filterType === 'emergency') return s.is_emergency
      return true
    })
    .filter((s) => {
      if (filterStatus === 'unscheduled') return !s.scheduled_date && !s.customer_signature && !s.customer_not_home
      if (filterStatus === 'scheduled') return !!s.scheduled_date && !s.customer_signature && !s.customer_not_home
      if (filterStatus === 'completed') return !!s.customer_signature || !!s.customer_not_home
      return true
    })
    .filter((s) => !filterExtra || s.additional_maintenance)
    .filter((s) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        s.customer?.name.toLowerCase().includes(q) ||
        s.generator?.system_model.toLowerCase().includes(q)
      )
    })

  function getServiceLabels(service: Service) {
    const labels = []
    if (service.is_pm) labels.push({ label: 'PM', color: 'bg-green-100 text-green-700' })
    if (service.is_repair) labels.push({ label: 'Repair', color: 'bg-yellow-100 text-yellow-700' })
    if (service.is_emergency) labels.push({ label: 'Emergency', color: 'bg-red-100 text-red-700' })
    return labels
  }

  if (role === 'emile') {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Services</h2>
        <p className="text-gray-500 text-sm">Use the Schedule page to view your assigned services.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Services</h2>
        <p className="text-sm text-gray-500">{filtered.length} services</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by customer or generator..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Filters */}
<div className="flex flex-wrap gap-2 mb-6">
  {(['all', 'pm', 'repair', 'emergency'] as const).map((type) => (
    <button
      key={type}
      onClick={() => setFilterType(type)}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        filterType === type
          ? 'bg-orange-500 text-white'
          : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
      }`}
    >
      {type === 'all' ? 'All' : type === 'pm' ? 'PM' : type === 'repair' ? 'Repair' : 'Emergency'}
    </button>
  ))}
</div>
      {/* Services list */}
      {loading ? (
        <p className="text-gray-500">Loading services...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">No services found.</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-black text-white">
              <tr>
                <th className="text-left px-6 py-3">Date</th>
                <th className="text-left px-6 py-3">Customer</th>
                <th className="text-left px-6 py-3">Generator</th>
                <th className="text-left px-6 py-3">Type</th>
                <th className="text-left px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((service, i) => {
                const isCompleted = !!(service.customer_signature || service.customer_not_home)
                return (
                  <tr
                    key={service.id}
                    onClick={() => router.push(`/services/${service.id}`)}
                    className={`cursor-pointer hover:bg-orange-50 transition-colors ${
                      isCompleted
                        ? 'bg-gray-100'
                        : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className={`px-6 py-4 whitespace-nowrap ${isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                      {service.date}
                    </td>
                    <td className={`px-6 py-4 font-medium ${isCompleted ? 'text-gray-400' : 'text-gray-900'}`}>
                      {service.customer?.name}
                    </td>
                    <td className={`px-6 py-4 ${isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                      {service.generator?.system_model}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {getServiceLabels(service).map(({ label, color }) => (
                          <span key={label} className={`text-xs px-2 py-0.5 rounded-full font-medium ${isCompleted ? 'opacity-50' : ''} ${color}`}>
                            {label}
                          </span>
                        ))}
                        {service.additional_maintenance && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-600 ${isCompleted ? 'opacity-50' : ''}`}>
                            ⚠ Extra
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {service.customer_not_home ? (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                          Not home
                        </span>
                      ) : service.customer_signature ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          ✓ Signed
                        </span>
                      ) : service.scheduled_date ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          Scheduled
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                          Unscheduled
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}