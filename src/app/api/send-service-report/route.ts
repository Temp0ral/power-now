import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

type ChecklistItem = {
  section: string
  item: string
  status: 'ok' | 'not_ok' | 'other' | null
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    customerName,
    customerEmail,
    customerAddress,
    customerPhone,
    generatorModel,
    serialNumber,
    serviceDate,
    isPm,
    isRepair,
    isEmergency,
    notes,
    additionalMaintenance,
    additionalMaintenanceNote,
    technicianName,
    checklist,
  } = body

  if (!customerEmail) {
    return NextResponse.json({ error: 'No customer email on file' }, { status: 400 })
  }

  const serviceTypes = []
  if (isPm) serviceTypes.push('Preventative Maintenance')
  if (isRepair) serviceTypes.push('Repair')
  if (isEmergency) serviceTypes.push('Emergency Call')

  // Group checklist by section
  const checklistBySection: Record<string, ChecklistItem[]> = {}
  if (checklist && checklist.length > 0) {
    checklist.forEach((item: ChecklistItem) => {
      if (!checklistBySection[item.section]) checklistBySection[item.section] = []
      checklistBySection[item.section].push(item)
    })
  }

  const statusLabel = (status: string | null) => {
    if (status === 'ok') return '<span style="color: #16a34a; font-weight: bold;">OK</span>'
    if (status === 'not_ok') return '<span style="color: #dc2626; font-weight: bold;">Not OK</span>'
    if (status === 'other') return '<span style="color: #d97706; font-weight: bold;">Other</span>'
    return '<span style="color: #9ca3af;">—</span>'
  }

  const checklistHtml = isPm && Object.keys(checklistBySection).length > 0 ? `
    <div style="margin: 24px 0;">
      <h3 style="color: #111; font-size: 16px; margin-bottom: 12px; border-bottom: 2px solid #f97316; padding-bottom: 8px;">
        Preventative Maintenance Checklist
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background: #000; color: #fff;">
            <th style="text-align: left; padding: 8px 12px;">Item</th>
            <th style="text-align: center; padding: 8px 12px; width: 80px;">OK</th>
            <th style="text-align: center; padding: 8px 12px; width: 80px;">Not OK</th>
            <th style="text-align: center; padding: 8px 12px; width: 80px;">Other</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(checklistBySection).map(([section, items], sectionIndex) => `
            <tr>
              <td colspan="4" style="background: #f3f4f6; padding: 8px 12px; font-weight: bold; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
                ${section}
              </td>
            </tr>
            ${items.map((item, i) => `
              <tr style="background: ${(sectionIndex + i) % 2 === 0 ? '#fff' : '#f9fafb'}; border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 8px 12px; color: #374151;">${item.item}</td>
                <td style="text-align: center; padding: 8px 12px;">${item.status === 'ok' ? '✓' : ''}</td>
                <td style="text-align: center; padding: 8px 12px;">${item.status === 'not_ok' ? '✓' : ''}</td>
                <td style="text-align: center; padding: 8px 12px;">${item.status === 'other' ? '✓' : ''}</td>
              </tr>
            `).join('')}
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : ''

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px;">
      <div style="background: #000; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">
          POWER<span style="color: #f97316;">NOW</span>
          <span style="font-size: 12px; color: #999; display: block; letter-spacing: 3px; margin-top: 4px;">GENERATORS</span>
        </h1>
      </div>
      <div style="background: #f9f9f9; padding: 24px; border: 1px solid #eee; border-radius: 0 0 8px 8px;">
        <h2 style="color: #111; margin-top: 0;">Service Report</h2>
        <p style="color: #555;">Thank you for choosing Power Now Generators. Here is a summary of the service completed on your generator.</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0; color: #888; font-size: 13px; width: 40%;">DATE</td>
            <td style="padding: 10px 0; color: #111; font-weight: bold;">${serviceDate}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0; color: #888; font-size: 13px;">CUSTOMER</td>
            <td style="padding: 10px 0; color: #111; font-weight: bold;">${customerName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0; color: #888; font-size: 13px;">ADDRESS</td>
            <td style="padding: 10px 0; color: #111; font-weight: bold;">${customerAddress}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0; color: #888; font-size: 13px;">PHONE</td>
            <td style="padding: 10px 0; color: #111; font-weight: bold;">${customerPhone ?? '—'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0; color: #888; font-size: 13px;">GENERATOR</td>
            <td style="padding: 10px 0; color: #111; font-weight: bold;">${generatorModel}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0; color: #888; font-size: 13px;">SERIAL NUMBER</td>
            <td style="padding: 10px 0; color: #111; font-weight: bold;">${serialNumber ?? '—'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0; color: #888; font-size: 13px;">SERVICE TYPE</td>
            <td style="padding: 10px 0; color: #111; font-weight: bold;">${serviceTypes.join(', ')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0; color: #888; font-size: 13px;">TECHNICIAN</td>
            <td style="padding: 10px 0; color: #111; font-weight: bold;">${technicianName}</td>
          </tr>
        </table>

        ${checklistHtml}

        ${notes ? `
        <div style="margin: 20px 0;">
          <p style="color: #888; font-size: 13px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;">Notes</p>
          <p style="color: #111; background: #fff; padding: 12px; border-radius: 6px; border: 1px solid #eee;">${notes}</p>
        </div>
        ` : ''}

        ${additionalMaintenance ? `
        <div style="margin: 20px 0; background: #fff7ed; border: 1px solid #fed7aa; padding: 16px; border-radius: 6px;">
          <p style="color: #c2410c; font-size: 13px; font-weight: bold; margin: 0 0 6px 0;">⚠ ADDITIONAL MAINTENANCE PERFORMED</p>
          <p style="color: #111; margin: 0;">${additionalMaintenanceNote}</p>
        </div>
        ` : ''}

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 12px; margin: 0;">Power Now Generators</p>
          <p style="color: #888; font-size: 12px; margin: 4px 0;">16 Andrew Avenue, Hull, MA 02045</p>
          <p style="color: #888; font-size: 12px; margin: 4px 0;">(781) 561-8550</p>
        </div>
      </div>
    </div>
  `

  const { error } = await resend.emails.send({
    from: 'Power Now Generators <onboarding@resend.dev>',
    to: customerEmail,
    subject: `Service Report — ${serviceDate}`,
    html,
  })

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}