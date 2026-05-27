'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X, Zap } from 'lucide-react'
import Link from 'next/link'

type Customer = {
  id: string
  name: string
  phone: string
  address: string
  email: string | null
}

type Generator = {
  id: string
  system_model: string
  serial_number: string
}

export default function CustomerDetailPage() {
  const supabase = createClient()
  const { id } = useParams()
  const router = useRouter()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [generators, setGenerators] = useState<Generator[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    system_model: '',
    serial_number: '',
  })

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

    const { data: generatorData } = await supabase
      .from('generators')
      .select('*')
      .eq('customer_id', id)
      .order('created_at')

    if (customerData) setCustomer(customerData)
    if (generatorData) setGenerators(generatorData)
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

  if (loading) return <p className="text-gray-500">Loading...</p>
  if (!customer) return <p className="text-gray-500">Customer not found.</p>

  return (
    <div>
      {/* Back button */}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {generators.map((g) => (
            <Link
              key={g.id}
              href={`/generators/${g.id}`}
              className="bg-white rounded-xl shadow p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
            >
              <div className="bg-orange-100 p-3 rounded-lg">
                <Zap size={22} className="text-orange-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{g.system_model}</p>
                <p className="text-sm text-gray-400">
                  {g.serial_number ? `S/N: ${g.serial_number}` : 'No serial number'}
                </p>
              </div>
            </Link>
          ))}
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