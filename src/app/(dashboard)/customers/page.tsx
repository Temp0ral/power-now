'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, Plus, X, ChevronDown, ChevronUp, Calendar, ArrowUpDown } from 'lucide-react'
import { useRouter } from 'next/navigation'


type Customer = {
  id: string
  name: string
  phone: string
  address: string
  email: string | null
  service_interval_months: number
  created_at: string
}

type Generator = {
  id: string
  customer_id: string
  system_model: string
  serial_number: string | null
  last_pm_date: string | null
}

function getServiceStatus(lastPmDate: string | null, intervalMonths: number): 'green' | 'yellow' | 'red' {
  if (!lastPmDate) return 'red'
  const last = new Date(lastPmDate)
  const now = new Date()
  const monthsAgo = (now.getFullYear() - last.getFullYear()) * 12 + (now.getMonth() - last.getMonth())
  const yellowThreshold = intervalMonths === 12 ? 9 : 4
  if (monthsAgo < yellowThreshold) return 'green'
  if (monthsAgo < intervalMonths) return 'yellow'
  return 'red'
}

function StatusDot({ status }: { status: 'green' | 'yellow' | 'red' }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        flexShrink: 0,
        backgroundColor: status === 'green' ? '#22c55e' : status === 'yellow' ? '#facc15' : '#ef4444',
      }}
    />
  )
}

export default function CustomersPage() {
  const supabase = createClient()
  const router = useRouter()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [generators, setGenerators] = useState<Generator[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set())
  const [selectedGenerators, setSelectedGenerators] = useState<Set<string>>(new Set())
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null)
  const [form, setForm] = useState({
  name: '',
  phone: '',
  address: '',
  email: '',
  service_interval_months: 6,
})

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)

    const { data: custData } = await supabase
      .from('customers')
      .select('*')
      .order('name')
    if (custData) setCustomers(custData)

    const { data: genData } = await supabase
      .from('generators')
      .select('*')

    if (genData) {
      const generatorsWithPm: Generator[] = await Promise.all(
        genData.map(async (g) => {
          const { data: lastPm } = await supabase
            .from('services')
            .select('date')
            .eq('generator_id', g.id)
            .eq('is_pm', true)
            .order('date', { ascending: false })
            .limit(1)
            .single()
          return {
            ...g,
            last_pm_date: lastPm?.date ?? null,
          }
        })
      )
      setGenerators(generatorsWithPm)
    }

    setLoading(false)
  }

  async function handleAddCustomer() {
    if (!form.name || !form.phone || !form.address) return
    setSaving(true)
    const { error } = await supabase.from('customers').insert({
      name: form.name,
      phone: form.phone,
      address: form.address,
      email: form.email || null,
      service_interval_months: form.service_interval_months,
    })
    if (!error) {
      setForm({ name: '', phone: '', address: '', email: '', service_interval_months: 12 })
      setModalOpen(false)
      fetchData()
    }
    setSaving(false)
  }

  async function handleScheduleMaintenance() {
    if (selectedGenerators.size === 0) return
    setScheduling(true)

    for (const generatorId of selectedGenerators) {
      const { data: existing } = await supabase
        .from('services')
        .select('id')
        .eq('generator_id', generatorId)
        .eq('is_pm', true)
        .is('scheduled_date', null)
        .is('customer_signature', null)
        .limit(1)

      if (!existing || existing.length === 0) {
        await supabase.from('services').insert({
          generator_id: generatorId,
          date: new Date().toISOString().split('T')[0],
          is_pm: true,
          is_repair: false,
          is_emergency: false,
          is_scheduled: false,
        })
      }
    }

    setSelectedGenerators(new Set())
    setScheduling(false)
    alert(`Maintenance services added to the schedule queue.`)
  }

  function toggleCustomerExpanded(customerId: string) {
    setExpandedCustomers((prev) => {
      const next = new Set(prev)
      if (next.has(customerId)) next.delete(customerId)
      else next.add(customerId)
      return next
    })
  }

  function toggleGeneratorSelected(generatorId: string) {
    setSelectedGenerators((prev) => {
      const next = new Set(prev)
      if (next.has(generatorId)) next.delete(generatorId)
      else next.add(generatorId)
      return next
    })
  }

  function isGeneratorsVisible(customer: Customer): boolean {
    const count = generators.filter((g) => g.customer_id === customer.id).length
    // Auto-show if 1 or 2 generators, collapse if 3+
    if (count <= 2) return true
    return expandedCustomers.has(customer.id)
  }

  const filtered = customers
  .filter((c) => {
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q)
    )
  })
  .sort((a, b) => {
    if (!sortOrder) return 0
    const aGens = generators.filter((g) => g.customer_id === a.id)
    const bGens = generators.filter((g) => g.customer_id === b.id)
    const aLastPm = aGens.reduce((latest, g) => {
      if (!g.last_pm_date) return latest
      return !latest || g.last_pm_date > latest ? g.last_pm_date : latest
    }, null as string | null)
    const bLastPm = bGens.reduce((latest, g) => {
      if (!g.last_pm_date) return latest
      return !latest || g.last_pm_date > latest ? g.last_pm_date : latest
    }, null as string | null)
    // Customers with no PM date go to the end
    if (!aLastPm && !bLastPm) return 0
    if (!aLastPm) return sortOrder === 'asc' ? 1 : -1
    if (!bLastPm) return sortOrder === 'asc' ? -1 : 1
    return sortOrder === 'asc'
      ? aLastPm.localeCompare(bLastPm)
      : bLastPm.localeCompare(aLastPm)
  })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
        <div className="flex items-center gap-3">
          {selectedGenerators.size > 0 && (
            <button
              onClick={handleScheduleMaintenance}
              disabled={scheduling}
             className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow"
            >
              <Calendar size={16} />
              {scheduling ? 'Scheduling...' : `Schedule Maintenance (${selectedGenerators.size})`}
            </button>
          )}
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            Add Customer
          </button>
        </div>
      </div>

     {/* Search and Sort */}
<div className="flex gap-3 mb-6">
  <div className="relative flex-1">
    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
    <input
      type="text"
      placeholder="Search by name, phone, or address..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
    />
  </div>
  <button
    onClick={() => setSortOrder((prev) => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc')}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
      sortOrder ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
    }`}
  >
    <ArrowUpDown size={16} />
    {sortOrder === 'asc' ? 'Last PM ↑' : sortOrder === 'desc' ? 'Last PM ↓' : 'Sort'}
  </button>
</div>

      {/* Customer list */}
      {loading ? (
        <p className="text-gray-500">Loading customers...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">No customers found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((customer) => {
            const customerGenerators = generators.filter((g) => g.customer_id === customer.id)
            const generatorsVisible = isGeneratorsVisible(customer)
            const hasMany = customerGenerators.length > 2

            return (
              <div key={customer.id} className="bg-white rounded-xl shadow overflow-hidden">
                {/* Customer row */}
                <div className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => router.push(`/customers/${customer.id}`)}
                        className="font-semibold text-gray-900 hover:text-orange-500 transition-colors text-left text-base"
                      >
                        {customer.name}
                      </button>
                      <div className="flex flex-wrap items-center gap-y-1 mt-2">
  <span className="text-sm text-gray-700 font-medium">{customer.address}</span>
  <span className="text-gray-300 px-2">|</span>
  <span className="text-sm text-gray-700 font-medium">{customer.phone}</span>
  {customer.email && (
    <>
      <span className="text-gray-300 px-2">|</span>
      <span className="text-sm text-gray-700 font-medium">{customer.email}</span>
    </>
  )}
  <span className="text-gray-300 px-2">|</span>
  <span className="text-sm text-gray-700 font-medium">Every {customer.service_interval_months} months</span>
</div>
                    </div>
                    {hasMany && (
                      <button
                        onClick={() => toggleCustomerExpanded(customer.id)}
                        className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-1"
                      >
                        {generatorsVisible ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Generators */}
                {generatorsVisible && customerGenerators.length > 0 && (
                  <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
                    <div className="space-y-2">
                      {customerGenerators.map((gen) => {
                        const status = getServiceStatus(gen.last_pm_date, customer.service_interval_months)
                        return (
                          <div
                            key={gen.id}
                            className="flex items-center gap-4 bg-white rounded-lg px-4 py-3 shadow-sm"
                          >
                            <input
                              type="checkbox"
                              checked={selectedGenerators.has(gen.id)}
                              onChange={() => toggleGeneratorSelected(gen.id)}
                              className="w-4 h-4 accent-orange-500 flex-shrink-0"
                            />
                            <StatusDot status={status} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm">{gen.system_model}</p>
                              <p className="text-xs text-gray-400">
                                {gen.serial_number ? `S/N: ${gen.serial_number}` : 'No serial number'}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-gray-400">Last PM</p>
                              <p className={`text-xs font-medium ${
                                status === 'red' ? 'text-red-500' :
                                status === 'yellow' ? 'text-yellow-500' :
                                'text-green-500'
                              }`}>
                                {gen.last_pm_date ?? 'Never'}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {hasMany && (
                      <p className="text-xs text-gray-400 mt-2">
                        {customerGenerators.length} generators total
                      </p>
                    )}
                  </div>
                )}

                {/* Show expand button for customers with no generators visible yet */}
                {!generatorsVisible && customerGenerators.length > 0 && (
                  <div className="border-t border-gray-100 px-6 py-2 bg-gray-50">
                    <button
                      onClick={() => toggleCustomerExpanded(customer.id)}
                      className="text-sm text-orange-500 hover:text-orange-600 transition-colors"
                    >
                      Show {customerGenerators.length} generators
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Add Customer</h3>
              <button onClick={() => setModalOpen(false)}>
                <X size={20} className="text-gray-500 hover:text-gray-700" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Interval
                </label>
                <select
                  value={form.service_interval_months}
                  onChange={(e) => setForm({ ...form, service_interval_months: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value={6} selected>Every 6 months</option>
                  <option value={12}>Every 12 months</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomer}
                disabled={saving || !form.name || !form.phone || !form.address}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {saving ? 'Saving...' : 'Save Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}