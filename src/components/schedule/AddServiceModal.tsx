'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

type Props = {
  customers: { id: string; name: string }[]
  generators: { id: string; system_model: string; customer_id: string }[]
  onClose: () => void
  onSave: (data: {
    customer_id: string
    generator_id: string
    is_pm: boolean
    is_repair: boolean
    is_emergency: boolean
  }) => Promise<void>
}

export default function AddServiceModal({ customers, generators, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    customer_id: '',
    generator_id: '',
    is_pm: false,
    is_repair: false,
    is_emergency: false,
  })
  const [saving, setSaving] = useState(false)

  const filteredGenerators = generators.filter((g) => g.customer_id === form.customer_id)
  const isValid = form.customer_id && form.generator_id && (form.is_pm || form.is_repair || form.is_emergency)

  async function handleSave() {
    if (!isValid) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">Schedule New Service</h3>
          <button onClick={onClose}>
            <X size={20} className="text-gray-500 hover:text-gray-700" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer <span className="text-orange-500">*</span>
            </label>
            <select
              value={form.customer_id}
              onChange={(e) => setForm({ ...form, customer_id: e.target.value, generator_id: '' })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select a customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Generator <span className="text-orange-500">*</span>
            </label>
            <select
              value={form.generator_id}
              onChange={(e) => setForm({ ...form, generator_id: e.target.value })}
              disabled={!form.customer_id}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-50"
            >
              <option value="">Select a generator...</option>
              {filteredGenerators.map((g) => (
                <option key={g.id} value={g.id}>{g.system_model}</option>
              ))}
            </select>
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
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isValid}
            className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Add to Queue'}
          </button>
        </div>
      </div>
    </div>
  )
}