'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckSquare, Camera, FileText, PenLine, Send } from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'
import { useRole } from '@/lib/role'

const CHECKLIST = [
  { section: '1. Electrical System', item: 'A. Control & power connections' },
  { section: '1. Electrical System', item: 'B. Wire insulation condition' },
  { section: '1. Electrical System', item: 'C. Safeties and alarms' },
  { section: '1. Electrical System', item: 'E. Cabinet, panels, & platform' },
  { section: '2. Generator', item: 'A. Voltage' },
  { section: '2. Generator', item: 'B. Frequency' },
  { section: '2. Generator', item: 'C. Instrumentation' },
  { section: '2. Generator', item: 'D. Wire conditions' },
  { section: '2. Generator', item: 'E. General condition' },
  { section: '3. Battery System', item: 'A. Battery charger' },
  { section: '3. Battery System', item: 'B. Terminals tight & clean' },
  { section: '3. Battery System', item: 'C. Battery position tight' },
  { section: '4. Engine', item: 'A. Mounting bolts' },
  { section: '4. Engine', item: 'B. Air cleaner' },
  { section: '4. Engine', item: 'C. Alternator bolts to engine tight' },
  { section: '4. Engine', item: 'D. Governor & linkage correct' },
  { section: '4. Engine', item: 'E. Inspect for oil leaks' },
  { section: '4. Engine', item: 'F. Spark plugs' },
  { section: '5. Lubrication System', item: 'A. Oil level' },
  { section: '5. Lubrication System', item: 'B. Crankcase breather' },
  { section: '6. Cooling System', item: 'A. Engine cooling air obstruction' },
  { section: '6. Cooling System', item: 'B. Outside cooling air obstruction' },
  { section: '7. Fuel System', item: 'A. Piping' },
  { section: '7. Fuel System', item: 'B. Flexible lines' },
  { section: '8. Exhaust System', item: 'A. Muffler & support system' },
  { section: '8. Exhaust System', item: 'B. Exhaust obstruction' },
  { section: '9. Transfer Switch', item: 'A. Connections tight' },
  { section: '9. Transfer Switch', item: 'B. Relay tight' },
  { section: '9. Transfer Switch', item: 'C. Main contacts' },
  { section: '10. Entire System', item: 'A. Inside compartment' },
  { section: '10. Entire System', item: 'B. Exercise unit' },
]

type ChecklistStatus = 'ok' | 'not_ok' | 'other' | null

type Service = {
  id: string
  generator_id: string
  date: string
  is_pm: boolean
  is_repair: boolean
  is_emergency: boolean
  notes: string | null
  meter_reading: string | null
  customer_signature: string | null
  additional_maintenance: boolean
  additional_maintenance_note: string | null
  customer_not_home: boolean
}

type Generator = {
  id: string
  system_model: string
  serial_number: string | null
  customer_id: string
}

type Customer = {
  id: string
  name: string
  email: string | null
  address: string
  phone: string
}

type Photo = {
  id: string
  storage_url: string
}

type Step = 'checklist' | 'photos' | 'notes' | 'summary' | 'signature'

export default function ServiceDetailPage() {
  const supabase = createClient()
  const { id } = useParams()
  const router = useRouter()
  const { role } = useRole()

  const [service, setService] = useState<Service | null>(null)
  const [generator, setGenerator] = useState<Generator | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [checklistItems, setChecklistItems] = useState<Record<string, ChecklistStatus>>({})
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)

  // Emile editable state
  const [step, setStep] = useState<Step>('checklist')
  const [saving, setSaving] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [additionalMaintenance, setAdditionalMaintenance] = useState(false)
  const [additionalMaintenanceNote, setAdditionalMaintenanceNote] = useState('')
  const [notes, setNotes] = useState('')
  const [newPhotos, setNewPhotos] = useState<File[]>([])
  const [photosPreviews, setPhotosPreviews] = useState<string[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [customerNotHome, setCustomerNotHome] = useState(false)
  const sigCanvas = useRef<SignatureCanvas>(null)
  const [signed, setSigned] = useState(false)

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    setLoading(true)
    const { data: serviceData } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single()

    if (serviceData) {
      setService(serviceData)
      setNotes(serviceData.notes ?? '')
      setAdditionalMaintenance(serviceData.additional_maintenance ?? false)
      setAdditionalMaintenanceNote(serviceData.additional_maintenance_note ?? '')
      setCustomerNotHome(serviceData.customer_not_home ?? false)

      const { data: genData } = await supabase
        .from('generators')
        .select('*')
        .eq('id', serviceData.generator_id)
        .single()

      if (genData) {
        setGenerator(genData)
        const { data: custData } = await supabase
          .from('customers')
          .select('*')
          .eq('id', genData.customer_id)
          .single()
        if (custData) setCustomer(custData)
      }

      const { data: checklistData } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('service_id', id)

      if (checklistData && checklistData.length > 0) {
        const map: Record<string, ChecklistStatus> = {}
        checklistData.forEach((c) => {
          map[`${c.section}||${c.item_label}`] = c.status
        })
        setChecklistItems(map)
      }

      const { data: photoData } = await supabase
        .from('photos')
        .select('*')
        .eq('service_id', id)
      if (photoData) setPhotos(photoData)
    }
    setLoading(false)
  }

  // --- Read-only view for Ellen/Jason ---
  function ReadOnlyView() {
    if (!service) return null

    const serviceTypes = [
      service.is_pm && 'Preventative Maintenance',
      service.is_repair && 'Repair',
      service.is_emergency && 'Emergency Call',
    ].filter(Boolean).join(', ')

    const sections = CHECKLIST.reduce((acc, { section, item }) => {
      if (!acc[section]) acc[section] = []
      acc[section].push(item)
      return acc
    }, {} as Record<string, string[]>)

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        {/* Header */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{customer?.name}</h2>
              <p className="text-gray-500 text-sm">{generator?.system_model} • {service.date}</p>
              <p className="text-orange-500 text-sm font-medium mt-1">{serviceTypes}</p>
            </div>
            {service.customer_not_home && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                Customer not home
              </span>
            )}
            {service.customer_signature && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                ✓ Signed
              </span>
            )}
          </div>
        </div>

        {/* Checklist */}
        {service.is_pm && Object.keys(checklistItems).length > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
              <CheckSquare size={18} className="text-orange-500" />
              Checklist
            </h3>
            <div className="space-y-4">
              {Object.entries(sections).map(([section, items]) => (
                <div key={section}>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{section}</p>
                  <div className="space-y-1">
                    {items.map((item) => {
                      const status = checklistItems[`${section}||${item}`] ?? null
                      return (
                        <div key={item} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                          <span className="text-sm text-gray-700">{item}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            status === 'ok'
                              ? 'bg-green-100 text-green-700'
                              : status === 'not_ok'
                              ? 'bg-red-100 text-red-600'
                              : status === 'other'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-400'
                          }`}>
                            {status === 'ok' ? 'OK' : status === 'not_ok' ? 'Not OK' : status === 'other' ? 'Other' : '—'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {service.notes && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-3">
              <FileText size={18} className="text-orange-500" />
              Notes
            </h3>
            <p className="text-gray-700 text-sm">{service.notes}</p>
          </div>
        )}

        {/* Additional Maintenance */}
        {service.additional_maintenance && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
            <h3 className="text-base font-bold text-orange-600 mb-2">⚠ Additional Maintenance</h3>
            <p className="text-gray-700 text-sm">{service.additional_maintenance_note}</p>
          </div>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Camera size={18} className="text-orange-500" />
              Photos
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <a key={photo.id} href={photo.storage_url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={photo.storage_url}
                    alt="Service photo"
                    className="w-full h-24 object-cover rounded-lg hover:opacity-90 transition-opacity"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Signature */}
        {service.customer_signature && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
              <PenLine size={18} className="text-orange-500" />
              Customer Signature
            </h3>
            <div className="border border-gray-200 rounded-lg p-2 inline-block">
              <img
                src={service.customer_signature}
                alt="Customer signature"
                className="max-w-xs h-auto"
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  const sections = CHECKLIST.reduce((acc, { section, item }) => {
    if (!acc[section]) acc[section] = []
    acc[section].push(item)
    return acc
  }, {} as Record<string, string[]>)

  if (loading) return <p className="text-gray-500">Loading...</p>
  if (!service) return <p className="text-gray-500">Service not found.</p>

  // Ellen and Jason see read-only view
  if (role === 'ellen' || role === 'jason') return <ReadOnlyView />

  const serviceTypes = [
    service.is_pm && 'Preventative Maintenance',
    service.is_repair && 'Repair',
    service.is_emergency && 'Emergency Call',
  ].filter(Boolean).join(', ')

  // Emile's editable workflow
  async function handleCheckAll() {
    const all: Record<string, ChecklistStatus> = {}
    CHECKLIST.forEach(({ section, item }) => {
      all[`${section}||${item}`] = 'ok'
    })
    setChecklistItems(all)
  }

  function handleChecklistChange(section: string, item: string, status: ChecklistStatus) {
    setChecklistItems((prev) => ({ ...prev, [`${section}||${item}`]: status }))
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    setNewPhotos((prev) => [...prev, ...files])
    const previews = files.map((f) => URL.createObjectURL(f))
    setPhotosPreviews((prev) => [...prev, ...previews])
  }

  async function saveChecklist() {
    setSaving(true)
    await supabase.from('checklist_items').delete().eq('service_id', id)
    const rows = Object.entries(checklistItems).map(([key, status]) => {
      const [section, item_label] = key.split('||')
      return { service_id: id, section, item_label, status }
    })
    if (rows.length > 0) await supabase.from('checklist_items').insert(rows)
    await supabase.from('services').update({
      additional_maintenance: additionalMaintenance,
      additional_maintenance_note: additionalMaintenanceNote || null,
    }).eq('id', id)
    setSaving(false)
    setStep('photos')
  }

  async function savePhotos() {
    if (newPhotos.length === 0) { setStep('notes'); return }
    setUploadingPhotos(true)
    for (const photo of newPhotos) {
      const filename = `${id}/${Date.now()}-${photo.name}`
      const { data: uploadData } = await supabase.storage.from('service-photos').upload(filename, photo)
      if (uploadData) {
        const { data: urlData } = supabase.storage.from('service-photos').getPublicUrl(filename)
        await supabase.from('photos').insert({ service_id: id, storage_url: urlData.publicUrl })
      }
    }
    setUploadingPhotos(false)
    setStep('notes')
  }

  async function saveNotes() {
    setSaving(true)
    await supabase.from('services').update({ notes: notes || null }).eq('id', id)
    setSaving(false)
    setStep('summary')
  }

  async function handleComplete() {
    if (!customerNotHome && (!sigCanvas.current || sigCanvas.current.isEmpty())) return
    setSaving(true)
    const signatureData = customerNotHome ? null : sigCanvas.current!.toDataURL()
    await supabase.from('services').update({
      customer_signature: signatureData,
      customer_not_home: customerNotHome,
    }).eq('id', id)

    if (customer?.email && !customerNotHome) {
      setSendingEmail(true)
      const checklistForEmail = CHECKLIST.map(({ section, item }) => ({
        section,
        item,
        status: checklistItems[`${section}||${item}`] ?? null,
      }))
      await fetch('/api/send-service-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customer.name,
          customerEmail: customer.email,
          customerAddress: customer.address,
          customerPhone: customer.phone,
          generatorModel: generator?.system_model,
          serialNumber: generator?.serial_number,
          serviceDate: service?.date,
          isPm: service?.is_pm,
          isRepair: service?.is_repair,
          isEmergency: service?.is_emergency,
          notes,
          additionalMaintenance,
          additionalMaintenanceNote,
          technicianName: 'Emile',
          checklist: checklistForEmail,
          customerSignature: signatureData,
        }),
      })
      setSendingEmail(false)
    }
    setSaving(false)
    router.push(`/generators/${generator?.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900">{customer?.name}</h2>
        <p className="text-gray-500 text-sm">{generator?.system_model} • {service.date}</p>
        <p className="text-orange-500 text-sm font-medium mt-1">{serviceTypes}</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between mb-6 px-2">
        {(service.is_pm
          ? ['checklist', 'photos', 'notes', 'summary', 'signature']
          : ['photos', 'notes', 'summary', 'signature']
        ).map((s, i, arr) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              step === s ? 'bg-orange-500 text-white'
              : arr.indexOf(step) > i ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-500'
            }`}>
              {i + 1}
            </div>
            {i < arr.length - 1 && (
              <div className={`h-1 w-8 rounded ${arr.indexOf(step) > i ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step: Checklist */}
      {step === 'checklist' && service.is_pm && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
            <CheckSquare size={20} className="text-orange-500" />
            Checklist
          </h3>
          <div className="space-y-6">
            {Object.entries(sections).map(([section, items]) => (
              <div key={section}>
                <p className="text-sm font-bold text-gray-700 mb-2">{section}</p>
                <div className="space-y-2">
                  {items.map((item) => {
                    const key = `${section}||${item}`
                    const status = checklistItems[key] ?? null
                    return (
                      <div key={item} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-700">{item}</span>
                        <div className="flex gap-2">
                          {(['ok', 'not_ok', 'other'] as ChecklistStatus[]).map((s) => (
                            <button
                              key={s}
                              onClick={() => handleChecklistChange(section, item, s)}
                              className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                                status === s
                                  ? s === 'ok' ? 'bg-orange-500 text-white'
                                  : s === 'not_ok' ? 'bg-red-500 text-white'
                                  : 'bg-yellow-500 text-white'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              {s === 'ok' ? 'OK' : s === 'not_ok' ? 'Not OK' : 'Other'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            <div className="pt-4 border-t-2 border-orange-200">
              <label className="flex items-center gap-3 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={additionalMaintenance}
                  onChange={(e) => setAdditionalMaintenance(e.target.checked)}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-sm font-bold text-gray-700">Additional Maintenance Performed</span>
              </label>
              {additionalMaintenance && (
                <textarea
                  value={additionalMaintenanceNote}
                  onChange={(e) => setAdditionalMaintenanceNote(e.target.value)}
                  placeholder="Describe the additional maintenance performed..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              )}
            </div>
          </div>
          <button onClick={handleCheckAll} className="w-full mt-6 bg-black hover:bg-gray-800 text-white py-3 rounded-lg font-medium transition-colors">
            ✓ Check All Items OK
          </button>
          <button onClick={saveChecklist} disabled={saving} className="w-full mt-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white py-3 rounded-lg font-medium transition-colors">
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      )}

      {/* Step: Photos */}
      {step === 'photos' && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
            <Camera size={20} className="text-orange-500" />
            Photos
          </h3>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-orange-400 transition-colors">
            <Camera size={32} className="text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Tap to take photos or upload from camera roll</p>
            <input type="file" accept="image/*" multiple capture="environment" onChange={handlePhotoChange} className="hidden" />
          </label>
          {photosPreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              {photosPreviews.map((src, i) => (
                <img key={i} src={src} alt={`Photo ${i + 1}`} className="w-full h-24 object-cover rounded-lg" />
              ))}
            </div>
          )}
          <button onClick={savePhotos} disabled={uploadingPhotos} className="w-full mt-6 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white py-3 rounded-lg font-medium transition-colors">
            {uploadingPhotos ? 'Uploading...' : photosPreviews.length > 0 ? 'Save Photos & Continue' : 'Skip & Continue'}
          </button>
        </div>
      )}

      {/* Step: Notes */}
      {step === 'notes' && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
            <FileText size={20} className="text-orange-500" />
            Notes
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this service..."
            rows={6}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          />
          <button onClick={saveNotes} disabled={saving} className="w-full mt-6 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white py-3 rounded-lg font-medium transition-colors">
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      )}

      {/* Step: Summary */}
      {step === 'summary' && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Service Summary</h3>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-400 uppercase tracking-wide text-xs font-medium">Date</span>
              <span className="font-medium text-gray-900">{service.date}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-400 uppercase tracking-wide text-xs font-medium">Customer</span>
              <span className="font-medium text-gray-900">{customer?.name}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-400 uppercase tracking-wide text-xs font-medium">Generator</span>
              <span className="font-medium text-gray-900">{generator?.system_model}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-400 uppercase tracking-wide text-xs font-medium">Service Type</span>
              <span className="font-medium text-gray-900">{serviceTypes}</span>
            </div>
            {notes && (
              <div className="py-3 border-b border-gray-100">
                <span className="text-gray-400 uppercase tracking-wide text-xs font-medium block mb-2">Notes</span>
                <p className="text-gray-900">{notes}</p>
              </div>
            )}
            {additionalMaintenance && (
              <div className="py-3 bg-orange-50 rounded-lg px-4">
                <span className="text-orange-600 font-bold text-xs uppercase tracking-wide block mb-1">⚠ Additional Maintenance</span>
                <p className="text-gray-900">{additionalMaintenanceNote}</p>
              </div>
            )}
          </div>
          <button onClick={() => setStep('signature')} className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium transition-colors">
            Proceed to Signature
          </button>
        </div>
      )}

      {/* Step: Signature */}
      {step === 'signature' && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            <PenLine size={20} className="text-orange-500" />
            Customer Signature
          </h3>
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={customerNotHome}
                onChange={(e) => {
                  setCustomerNotHome(e.target.checked)
                  if (e.target.checked) { sigCanvas.current?.clear(); setSigned(false) }
                }}
                className="w-4 h-4 accent-orange-500"
              />
              <span className="text-sm font-medium text-gray-700">Customer was not home</span>
            </label>
          </div>
          {!customerNotHome && (
            <>
              <p className="text-sm text-gray-500 mb-4">Please have the customer sign below to confirm the service.</p>
              <div className="border-2 border-gray-300 rounded-xl overflow-hidden">
                <SignatureCanvas
                  ref={sigCanvas}
                  onEnd={() => setSigned(true)}
                  canvasProps={{ className: 'w-full', height: 200 }}
                />
              </div>
              <button onClick={() => { sigCanvas.current?.clear(); setSigned(false) }} className="text-sm text-gray-500 hover:text-gray-700 mt-2 transition-colors">
                Clear signature
              </button>
            </>
          )}
          {customerNotHome && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              Service will be marked as complete. No signature required.
            </div>
          )}
          <button
            onClick={handleComplete}
            disabled={(!signed && !customerNotHome) || saving || sendingEmail}
            className="w-full mt-4 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Send size={18} />
            {sendingEmail ? 'Sending report...' : saving ? 'Saving...' : customerNotHome ? 'Complete Service' : 'Complete Service & Email Report'}
          </button>
        </div>
      )}
    </div>
  )
}