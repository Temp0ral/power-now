'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X, ClipboardList } from 'lucide-react'

type Generator = {
  id: string
  system_model: string
  serial_number: string | null
  customer_id: string
}

type Customer = {
  id: string
  name: string
}

type Service = {
  id: string
  date: string
  is_pm: boolean
  is_repair: boolean
  is_emergency: boolean
  notes: string | null
  created_at: string
}

export default function GeneratorDetailPage() {
  const supabase = createClient()
  const { id } = useParams()
  const router = useRouter()

  const [generator, setGenerator] = useState<Generator | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    is_pm: false,
    is_repair: false,
    is_emergency: false,
    notes: '',
    meter_reading: '',
  })

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    setLoading(true)

    const { data: genData } = await supabase
      .from('generators')
      .select('*')
      .eq('id', id)
      .single()

    if (genData) {
      setGenerator(genData)

      const { data: custData } = await supabase
        .from('customers')
        .select('id, name')
        .eq('id', genData.customer_id)
        .single()

      if (custData) setCustomer(custData)
    }

    const { data: serviceData } = await supabase
      .from('services')
      .select('*')
      .eq('generator_id', id)
      .order('date', { ascending: false })

    if (serviceData) setServices(serviceData)
    setLoading(false)
  }

  async function handleAddService() {
    if (!form.date || (!form.is_pm && !form.is_repair && !form.is_emergency)) return
    setSaving(true)
    const { error } = await supabase.from('services').insert({
      generator_id: id,
      date: form.date,
      is_pm: form.is_pm,
      is_repair: form.is_repair,
      is_emergency: form.is_emergency,
      notes: form.notes || null,
      meter_reading: form.meter_reading || null,
    })
    if (!error) {
      setForm({
        date: new Date().toISOString().split('T')[0],
        is_pm: false,
        is_repair: false,
        is_emergency: false,
        notes: '',
        meter_reading: '',
      })
      setModalOpen(false)
      fetchData()
    }
    setSaving(false)
  }

  function getServiceLabels(service: Service) {
    const labels = []
    if (service.is_pm) labels.push('PM')
    if (service.is_repair) labels.push('Repair')
    if (service.is_emergency) labels.push('Emergency')
    return labels
  }

  if (loading) return <p className="text-gray-500">Loading...</p>
  if (!generator) return <p className="text-gray-500">Generator not found.</p>

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        {customer ? `Back to ${customer.name}` : 'Back'}
      </button>

      {/* Generator info */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{generator.system_model}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400 font-medium uppercase tracking-wide text-xs mb-1">Serial Number</p>
            <p className="text-gray-900">{generator.serial_number ?? '—'}</p>
          </div>
          <div>
            <p className="text-gray-400 font-medium uppercase tracking-wide text-xs mb-1">Customer</p>
            {customer && (
              <button
                onClick={() => router.push(`/customers/${customer.id}`)}
                className="text-orange-500 hover:text-orange-600 font-medium transition-colors"
              >
                {customer.name}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Service History</h3>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
        >
          <Plus size={16} />
          New Service
        </button>
      </div>

      {services.length === 0 ? (
        <p className="text-gray-500 text-sm">No services on record for this generator.</p>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-xl shadow p-5 flex items-start gap-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/services/${service.id}`)}
            >
              <div className="bg-orange-100 p-3 rounded-lg mt-1">
                <ClipboardList size={20} className="text-orange-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {getServiceLabels(service).map((label) => (
                    <span
                      key={label}
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        label === 'Emergency'
                          ? 'bg-red-100 text-red-600'
                          : label === 'Repair'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {label}
                    </span>
                  ))}
                  <span className="text-sm text-gray-500 ml-auto">{service.date}</span>
                </div>
                {service.notes && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{service.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Service Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">New Service</h3>
              <button onClick={() => setModalOpen(false)}>
                <X size={20} className="text-gray-500 hover:text-gray-700" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-orange-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Type <span className="text-orange-500">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    { key: 'is_pm', label: 'Preventative Maintenance' },
                    { key: 'is_repair', label: 'Repair' },
                    { key: 'is_emergency', label: 'Emergency Call' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form[key as keyof typeof form] as boolean}
                        onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                        className="w-4 h-4 accent-orange-500"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meter Reading <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.meter_reading}
                  onChange={(e) => setForm({ ...form, meter_reading: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
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
                onClick={handleAddService}
                disabled={saving || !form.date || (!form.is_pm && !form.is_repair && !form.is_emergency)}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {saving ? 'Saving...' : 'Start Service'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}