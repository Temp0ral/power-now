'use client'

import { useEffect, useState, useRef } from 'react'
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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null)
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set())
  const [selectedGenerators, setSelectedGenerators] = useState<Set<string>>(new Set())
  const [addressValidating, setAddressValidating] = useState(false)
  const [addressValidated, setAddressValidated] = useState(false)
  const [addressError, setAddressError] = useState(false)
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const autocompleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
    service_interval_months: 6,
    generator_model: '',
    generator_serial: '',
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

    const { data: genData } = await supabase.from('generators').select('*')

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
          return { ...g, last_pm_date: lastPm?.date ?? null }
        })
      )
      setGenerators(generatorsWithPm)
    }

    setLoading(false)
  }

  async function validateAddress() {
    if (!form.address) return
    setAddressValidating(true)
    setAddressValidated(false)
    setAddressError(false)
    try {
      const res = await fetch('/api/validate-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: form.address }),
      })
      const data = await res.json()
     if (data.formatted_address) {
  setForm((prev) => ({ ...prev, address: data.formatted_address }))
  setAddressValidated(true)
  setAddressError(false)
} else {
  setAddressError(true)
  setAddressValidated(false)
}
    } catch {
      setAddressError(true)
    }
    setAddressValidating(false)
  }

  async function fetchAddressSuggestions(value: string) {
  if (value.length < 3) {
    setAddressSuggestions([])
    setShowSuggestions(false)
    return
  }
  try {
    const res = await fetch('/api/validate-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: value, autocomplete: true }),
    })
    const data = await res.json()
    if (data.suggestions && data.suggestions.length > 0) {
      setAddressSuggestions(data.suggestions)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  } catch {
    setShowSuggestions(false)
  }
}

  async function handleAddCustomer() {
    if (!form.name || !form.phone || !form.address || !addressValidated) return
    setSaving(true)

    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({
        name: form.name,
        phone: form.phone,
        address: form.address,
        email: form.email || null,
        service_interval_months: form.service_interval_months,
      })
      .select()
      .single()

    if (!error && newCustomer) {
      if (form.generator_model) {
        await supabase.from('generators').insert({
          customer_id: newCustomer.id,
          system_model: form.generator_model,
          serial_number: form.generator_serial || null,
        })
      }
      setForm({
        name: '',
        phone: '',
        address: '',
        email: '',
        service_interval_months: 6,
        generator_model: '',
        generator_serial: '',
      })
      setAddressValidated(false)
      setAddressError(false)
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
    alert('Maintenance services added to the schedule queue.')
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

                {generatorsVisible && customerGenerators.length > 0 && (
                  <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
                    <div className="space-y-2">
                      {customerGenerators.map((gen) => {
                        const status = getServiceStatus(gen.last_pm_date, customer.service_interval_months)
                        return (
                          <div key={gen.id} className="flex items-center gap-4 bg-white rounded-lg px-4 py-3 shadow-sm">
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
                  </div>
                )}

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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Add Customer</h3>
              <button onClick={() => {
                setModalOpen(false)
                setAddressValidated(false)
                setAddressError(false)
              }}>
                <X size={20} className="text-gray-500 hover:text-gray-700" />
              </button>
            </div>
            <div className="space-y-4">

              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Customer Info</p>
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
             <div className="relative">
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Address <span className="text-orange-500">*</span>
  </label>
  <input
    type="text"
    value={form.address}
    onChange={(e) => {
      const value = e.target.value
      setForm({ ...form, address: value })
      setAddressValidated(false)
      setAddressError(false)
      // Debounce autocomplete
      if (autocompleteTimer.current) clearTimeout(autocompleteTimer.current)
      autocompleteTimer.current = setTimeout(() => {
        fetchAddressSuggestions(value)
      }, 300)
    }}
    onBlur={() => {
      // Delay hiding so clicks on suggestions register
      setTimeout(() => {
        setShowSuggestions(false)
        if (!addressValidated && form.address) validateAddress()
      }, 150)
    }}
    onFocus={() => {
      if (addressSuggestions.length > 0) setShowSuggestions(true)
    }}
    placeholder="Start typing an address..."
    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
      addressError
        ? 'border-red-400 bg-red-50'
        : addressValidated
        ? 'border-green-400 bg-green-50'
        : 'border-gray-300'
    }`}
  />

  {/* Autocomplete dropdown */}
  {showSuggestions && addressSuggestions.length > 0 && (
    <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 overflow-hidden">
      {addressSuggestions.map((suggestion, i) => (
        <button
          key={i}
          type="button"
          onClick={() => {
            setForm((prev) => ({ ...prev, address: suggestion }))
            setShowSuggestions(false)
            setAddressSuggestions([])
            setAddressValidated(false)
            setAddressError(false)
            // Validate the selected suggestion
            setTimeout(async () => {
              setAddressValidating(true)
              try {
                const res = await fetch('/api/validate-address', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ address: suggestion }),
                })
                const data = await res.json()
                if (data.formatted_address) {
                  setForm((prev) => ({ ...prev, address: data.formatted_address }))
                  setAddressValidated(true)
                } else {
                  setAddressError(true)
                }
              } catch {
                setAddressError(true)
              }
              setAddressValidating(false)
            }, 0)
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors border-b border-gray-100 last:border-0"
        >
          {suggestion}
        </button>
      ))}
    </div>
  )}

{addressValidating && (
  <p className="text-xs text-gray-400 mt-1">Validating address...</p>
)}
{addressValidated && (
  <p className="text-xs text-green-600 mt-1">✓ Address verified</p>
)}
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
                  <option value={6}>Every 6 months</option>
                  <option value={12}>Every 12 months</option>
                </select>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                  Generator <span className="text-gray-400 font-normal normal-case">(optional)</span>
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      System Model
                    </label>
                    <input
                      type="text"
                      value={form.generator_model}
                      onChange={(e) => setForm({ ...form, generator_model: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Serial Number <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={form.generator_serial}
                      onChange={(e) => setForm({ ...form, generator_serial: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setModalOpen(false)
                  setAddressValidated(false)
                  setAddressError(false)
                }}
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