'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRole } from '@/lib/role'
import { DollarSign, Save } from 'lucide-react'

type PricingSettings = {
  id: string
  pm_service_price: number
  repair_service_price: number
  emergency_service_price: number
  spark_plug_1_price: number
  spark_plugs_2_price: number
  air_filter_price: number
  battery_price: number
}

export default function PricingPage() {
  const supabase = createClient()
  const { role } = useRole()

  const [pricing, setPricing] = useState<PricingSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchPricing()
  }, [])

  async function fetchPricing() {
    setLoading(true)
    const { data } = await supabase
      .from('pricing_settings')
      .select('*')
      .limit(1)
      .single()
    if (data) setPricing(data)
    setLoading(false)
  }

  async function handleSave() {
    if (!pricing) return
    setSaving(true)
    await supabase
      .from('pricing_settings')
      .update({
        pm_service_price: pricing.pm_service_price,
        repair_service_price: pricing.repair_service_price,
        emergency_service_price: pricing.emergency_service_price,
        spark_plug_1_price: pricing.spark_plug_1_price,
        spark_plugs_2_price: pricing.spark_plugs_2_price,
        air_filter_price: pricing.air_filter_price,
        battery_price: pricing.battery_price,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pricing.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function updateField(field: keyof PricingSettings, value: string) {
    if (!pricing) return
    setPricing({ ...pricing, [field]: parseFloat(value) || 0 })
  }

  if (role !== 'ellen') {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pricing</h2>
        <p className="text-gray-500 text-sm">You don't have access to this page.</p>
      </div>
    )
  }

  if (loading) return <p className="text-gray-500">Loading...</p>
  if (!pricing) return <p className="text-gray-500">No pricing settings found.</p>

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Pricing Settings</h2>
      <p className="text-gray-500 text-sm mb-6">
        These prices are used to auto-calculate invoice amounts. You can always override the final invoice total.
      </p>

      {/* Service Prices */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">Service Prices</h3>
        <div className="space-y-4">
          {[
            { key: 'pm_service_price', label: 'Preventative Maintenance' },
            { key: 'repair_service_price', label: 'Repair' },
            { key: 'emergency_service_price', label: 'Emergency Call' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <label className="text-sm text-gray-700">{label}</label>
              <div className="relative w-32">
                <DollarSign size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  value={pricing[key as keyof PricingSettings]}
                  onChange={(e) => updateField(key as keyof PricingSettings, e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Part Prices */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">Part Prices</h3>
        <div className="space-y-4">
          {[
            { key: 'spark_plug_1_price', label: 'Spark Plug (1)' },
            { key: 'spark_plugs_2_price', label: 'Spark Plugs (2)' },
            { key: 'air_filter_price', label: 'Air Filter' },
            { key: 'battery_price', label: 'Battery' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <label className="text-sm text-gray-700">{label}</label>
              <div className="relative w-32">
                <DollarSign size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  value={pricing[key as keyof PricingSettings]}
                  onChange={(e) => updateField(key as keyof PricingSettings, e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
      >
        <Save size={16} />
        {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Pricing'}
      </button>
    </div>
  )
}