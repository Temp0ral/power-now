'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X, Zap, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'

type Customer = {
  id: string
  name: string
  phone: string
  address: string
  email: string | null
  service_interval_months: number
}

type Generator = {
  id: string
  system_model: string
  serial_number: string | null
}

type Service = {
  id: string
  date: string
  is_pm: boolean
  is_repair: boolean
  is_emergency: boolean
  notes: string | null
  customer_signature: string | null
  customer_not_home: boolean
  additional_maintenance: boolean
}

export default function CustomerDetailPage() {
  const supabase = createClient()
  const { id } = useParams()
  const router = useRouter()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [generators, setGenerators] = useState<Generator[]>([])
  const [servicesByGenerator, setServicesByGenerator] = useState<Record<string, Service[]>>({})
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // Add generator modal
  const [addGenModalOpen, setAddGenModalOpen] = useState(false)
  const [addGenForm, setAddGenForm] = useState({ system_model: '', serial_number: '' })
  const [savingGen, setSavingGen] = useState(false)

  // Edit customer modal
  const [editCustomerOpen, setEditCustomerOpen] = useState(false)
  const [editCustomerForm, setEditCustomerForm] = useState({
    name: '', phone: '', address: '', email: '', service_interval_months: 6
  })
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [addressValidating, setAddressValidating] = useState(false)
  const [addressValidated, setAddressValidated] = useState(false)
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const autocompleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Edit generator modal
  const [editGenOpen, setEditGenOpen] = useState(false)
  const [editGenId, setEditGenId] = useState<string | null>(null)
  const [editGenForm, setEditGenForm] = useState({ system_model: '', serial_number: '' })
  const [savingEditGen, setSavingEditGen] = useState(false)

  // Delete confirmations
  const [deleteCustomerOpen, setDeleteCustomerOpen] = useState(false)
  const [deleteGenId, setDeleteGenId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    setLoading(true)

    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()
    if (customerData) {
      setCustomer(customerData)
      setEditCustomerForm({
        name: customerData.name,
        phone: customerData.phone,
        address: customerData.address,
        email: customerData.email ?? '',
        service_interval_months: customerData.service_interval_months,
      })
    }

    const { data: generatorData } = await supabase
      .from('generators')
      .select('*')
      .eq('customer_id', id)
      .order('created_at')

    if (generatorData) {
      setGenerators(generatorData)
      const servicesMap: Record<string, Service[]> = {}
      for (const gen of generatorData) {
        const { data: serviceData } = await supabase
          .from('services')
          .select('*')
          .eq('generator_id', gen.id)
          .order('date', { ascending: false })
        servicesMap[gen.id] = serviceData ?? []
      }
      setServicesByGenerator(servicesMap)
    }

    setLoading(false)
  }

  async function validateAddress(address: string) {
    if (!address) return
    setAddressValidating(true)
    setAddressValidated(false)
    try {
      const res = await fetch('/api/validate-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      })
      const data = await res.json()
      if (data.formatted_address) {
        setEditCustomerForm((prev) => ({ ...prev, address: data.formatted_address }))
        setAddressValidated(true)
      }
    } catch {
      // silently fail
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

  async function handleSaveCustomer() {
    if (!editCustomerForm.name || !editCustomerForm.phone || !editCustomerForm.address) return
    setSavingCustomer(true)
    await supabase.from('customers').update({
      name: editCustomerForm.name,
      phone: editCustomerForm.phone,
      address: editCustomerForm.address,
      email: editCustomerForm.email || null,
      service_interval_months: editCustomerForm.service_interval_months,
    }).eq('id', id)
    setEditCustomerOpen(false)
    setSavingCustomer(false)
    fetchData()
  }

  async function handleDeleteCustomer() {
    setDeleting(true)
    await supabase.from('customers').delete().eq('id', id)
    router.push('/customers')
  }

  async function handleAddGenerator() {
    if (!addGenForm.system_model) return
    setSavingGen(true)
    await supabase.from('generators').insert({
      customer_id: id,
      system_model: addGenForm.system_model,
      serial_number: addGenForm.serial_number || null,
    })
    setAddGenForm({ system_model: '', serial_number: '' })
    setAddGenModalOpen(false)
    setSavingGen(false)
    fetchData()
  }

  async function handleSaveGenerator() {
    if (!editGenId || !editGenForm.system_model) return
    setSavingEditGen(true)
    await supabase.from('generators').update({
      system_model: editGenForm.system_model,
      serial_number: editGenForm.serial_number || null,
    }).eq('id', editGenId)
    setEditGenOpen(false)
    setSavingEditGen(false)
    fetchData()
  }

  async function handleDeleteGenerator() {
    if (!deleteGenId) return
    setDeleting(true)
    await supabase.from('generators').delete().eq('id', deleteGenId)
    setDeleteGenId(null)
    setDeleting(false)
    fetchData()
  }

  function getServiceLabels(service: Service) {
    const labels = []
    if (service.is_pm) labels.push({ label: 'PM', color: 'bg-green-100 text-green-700' })
    if (service.is_repair) labels.push({ label: 'Repair', color: 'bg-yellow-100 text-yellow-700' })
    if (service.is_emergency) labels.push({ label: 'Emergency', color: 'bg-red-100 text-red-700' })
    return labels
  }

  function toggleExpandedServices(genId: string) {
    setExpandedServices((prev) => {
      const next = new Set(prev)
      if (next.has(genId)) next.delete(genId)
      else next.add(genId)
      return next
    })
  }

  if (loading) return <p className="text-gray-500">Loading...</p>
  if (!customer) return <p className="text-gray-500">Customer not found.</p>

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        Back to Customers
      </button>

      {/* Customer info */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{customer.name}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditCustomerOpen(true)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-orange-50"
            >
              <Pencil size={15} />
              Edit
            </button>
            <button
              onClick={() => setDeleteCustomerOpen(true)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
            >
              <Trash2 size={15} />
              Delete
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-400 font-medium uppercase tracking-wide text-xs mb-1">Phone</p>
            <p className="text-gray-900">{customer.phone}</p>
          </div>
          <div>
            <p className="text-gray-400 font-medium uppercase tracking-wide text-xs mb-1">Address</p>
            <p className="text-gray-900">{customer.address}</p>
          </div>
          <div>
            <p className="text-gray-400 font-medium uppercase tracking-wide text-xs mb-1">Email</p>
            <p className="text-gray-900">{customer.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-gray-400 font-medium uppercase tracking-wide text-xs mb-1">Service Interval</p>
            <p className="text-gray-900">Every {customer.service_interval_months} months</p>
          </div>
        </div>
      </div>

      {/* Generators */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Generators</h3>
        <button
          onClick={() => setAddGenModalOpen(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
        >
          <Plus size={16} />
          Add Generator
        </button>
      </div>

      {generators.length === 0 ? (
        <p className="text-gray-500 text-sm">No generators on file for this customer.</p>
      ) : (
        <div className="space-y-4">
          {generators.map((gen) => {
            const services = servicesByGenerator[gen.id] ?? []
            const isExpanded = expandedServices.has(gen.id)
            const visibleServices = isExpanded ? services : services.slice(0, 3)

            return (
              <div key={gen.id} className="bg-white rounded-xl shadow overflow-hidden">
                <div className="flex items-center gap-4 p-5 border-b border-gray-100">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <Zap size={20} className="text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{gen.system_model}</p>
                    <p className="text-sm text-gray-400">
                      {gen.serial_number ? `S/N: ${gen.serial_number}` : 'No serial number'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditGenId(gen.id)
                        setEditGenForm({
                          system_model: gen.system_model,
                          serial_number: gen.serial_number ?? '',
                        })
                        setEditGenOpen(true)
                      }}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-orange-50"
                    >
                      <Pencil size={15} />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteGenId(gen.id)}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>
                </div>

                <div className="p-5">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">Service History</h4>
                  {services.length === 0 ? (
                    <p className="text-sm text-gray-400">No services on record.</p>
                  ) : (
                    <div className="space-y-2">
                      {visibleServices.map((service) => (
                        <div
                          key={service.id}
                          onClick={() => router.push(`/services/${service.id}`)}
                          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-gray-100"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">{service.date}</span>
                            <div className="flex gap-1 flex-wrap">
                              {getServiceLabels(service).map(({ label, color }) => (
                                <span key={label} className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
                                  {label}
                                </span>
                              ))}
                              {service.additional_maintenance && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-600">
                                  ⚠ Extra
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {service.customer_not_home && (
                              <span className="text-xs text-gray-400">Not home</span>
                            )}
                            {service.customer_signature && (
                              <span className="text-xs text-green-500 font-medium">✓ Signed</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {services.length > 3 && (
                        <button
                          onClick={() => toggleExpandedServices(gen.id)}
                          className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 mt-2 transition-colors"
                        >
                          {isExpanded ? (
                            <><ChevronUp size={16} /> Show less</>
                          ) : (
                            <><ChevronDown size={16} /> Show {services.length - 3} more</>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Customer Modal */}
      {editCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Edit Customer</h3>
              <button onClick={() => setEditCustomerOpen(false)}>
                <X size={20} className="text-gray-500 hover:text-gray-700" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-orange-500">*</span></label>
                <input
                  type="text"
                  value={editCustomerForm.name}
                  onChange={(e) => setEditCustomerForm({ ...editCustomerForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-orange-500">*</span></label>
                <input
                  type="text"
                  value={editCustomerForm.phone}
                  onChange={(e) => setEditCustomerForm({ ...editCustomerForm, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="relative">
  <label className="block text-sm font-medium text-gray-700 mb-1">Address <span className="text-orange-500">*</span></label>
  <input
    type="text"
    value={editCustomerForm.address}
    onChange={(e) => {
      const value = e.target.value
      setEditCustomerForm({ ...editCustomerForm, address: value })
      setAddressValidated(false)
      if (autocompleteTimer.current) clearTimeout(autocompleteTimer.current)
      autocompleteTimer.current = setTimeout(() => {
        fetchAddressSuggestions(value)
      }, 300)
    }}
    onBlur={() => {
      setTimeout(() => {
        setShowSuggestions(false)
        if (!addressValidated && editCustomerForm.address) {
          validateAddress(editCustomerForm.address)
        }
      }, 150)
    }}
    onFocus={() => {
      if (addressSuggestions.length > 0) setShowSuggestions(true)
    }}
    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
  />
  {showSuggestions && addressSuggestions.length > 0 && (
    <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 overflow-hidden">
      {addressSuggestions.map((suggestion, i) => (
        <button
          key={i}
          type="button"
          onClick={() => {
            setEditCustomerForm((prev) => ({ ...prev, address: suggestion }))
            setShowSuggestions(false)
            setAddressSuggestions([])
            setAddressValidated(false)
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
                  setEditCustomerForm((prev) => ({ ...prev, address: data.formatted_address }))
                  setAddressValidated(true)
                }
              } catch {
                // silently fail
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
  {addressValidating && <p className="text-xs text-gray-400 mt-1">Validating...</p>}
  {addressValidated && <p className="text-xs text-green-600 mt-1">✓ Address verified</p>}
</div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editCustomerForm.email}
                  onChange={(e) => setEditCustomerForm({ ...editCustomerForm, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Interval</label>
                <select
                  value={editCustomerForm.service_interval_months}
                  onChange={(e) => setEditCustomerForm({ ...editCustomerForm, service_interval_months: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value={6}>Every 6 months</option>
                  <option value={12}>Every 12 months</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditCustomerOpen(false)} className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSaveCustomer}
                disabled={savingCustomer || !editCustomerForm.name || !editCustomerForm.phone || !editCustomerForm.address}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {savingCustomer ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation */}
      {deleteCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Customer</h3>
            <p className="text-gray-600 text-sm mb-6">
              Are you sure you want to delete <span className="font-semibold">{customer.name}</span>? This will permanently remove all their generators, services, and photos. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteCustomerOpen(false)} className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleDeleteCustomer}
                disabled={deleting}
                            className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Generator Modal */}
      {addGenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Add Generator</h3>
              <button onClick={() => setAddGenModalOpen(false)}>
                <X size={20} className="text-gray-500 hover:text-gray-700" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Model <span className="text-orange-500">*</span></label>
                <input
                  type="text"
                  value={addGenForm.system_model}
                  onChange={(e) => setAddGenForm({ ...addGenForm, system_model: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number <span className="text-gray-400 text-xs">(optional)</span></label>
                <input
                  type="text"
                  value={addGenForm.serial_number}
                  onChange={(e) => setAddGenForm({ ...addGenForm, serial_number: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setAddGenModalOpen(false)} className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleAddGenerator}
                disabled={savingGen || !addGenForm.system_model}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {savingGen ? 'Saving...' : 'Save Generator'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Generator Modal */}
      {editGenOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Edit Generator</h3>
              <button onClick={() => setEditGenOpen(false)}>
                <X size={20} className="text-gray-500 hover:text-gray-700" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Model <span className="text-orange-500">*</span></label>
                <input
                  type="text"
                  value={editGenForm.system_model}
                  onChange={(e) => setEditGenForm({ ...editGenForm, system_model: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number <span className="text-gray-400 text-xs">(optional)</span></label>
                <input
                  type="text"
                  value={editGenForm.serial_number}
                  onChange={(e) => setEditGenForm({ ...editGenForm, serial_number: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditGenOpen(false)} className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSaveGenerator}
                disabled={savingEditGen || !editGenForm.system_model}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {savingEditGen ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Generator Confirmation */}
      {deleteGenId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Generator</h3>
            <p className="text-gray-600 text-sm mb-6">
              Are you sure you want to delete this generator? All services and photos associated with it will also be permanently removed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteGenId(null)} className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleDeleteGenerator}
                disabled={deleting}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}