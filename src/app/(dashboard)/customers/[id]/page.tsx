'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X, Zap, ChevronDown, ChevronUp } from 'lucide-react'

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
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ system_model: '', serial_number: '' })

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
    if (customerData) setCustomer(customerData)

    const { data: generatorData } = await supabase
      .from('generators')
      .select('*')
      .eq('customer_id', id)
      .order('created_at')
    if (generatorData) {
      setGenerators(generatorData)

      // Fetch services for each generator
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

  async function handleAddGenerator() {
    if (!form.system_model) return
    setSaving(true)
    const { error } = await supabase.from('generators').insert({
      customer_id: id,
      system_model: form.system_model,
      serial_number: form.serial_number || null,
    })
    if (!error) {
      setForm({ system_model: '', serial_number: '' })
      setModalOpen(false)
      fetchData()
    }
    setSaving(false)
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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{customer.name}</h2>
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
          onClick={() => setModalOpen(true)}
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
                {/* Generator header */}
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
                </div>

                {/* Service history */}
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

      {/* Add Generator Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Add Generator</h3>
              <button onClick={() => setModalOpen(false)}>
                <X size={20} className="text-gray-500 hover:text-gray-700" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Model <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.system_model}
                  onChange={(e) => setForm({ ...form, system_model: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serial Number <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.serial_number}
                  onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
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
                onClick={handleAddGenerator}
                disabled={saving || !form.system_model}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {saving ? 'Saving...' : 'Save Generator'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}