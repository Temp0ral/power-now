import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { availability, fromWeek } = await req.json()
  const supabase = createClient()

  // Generate the next 52 weeks from fromWeek
  const weeks: string[] = []
  const start = new Date(fromWeek)
  for (let i = 1; i <= 52; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i * 7)
    weeks.push(d.toISOString().split('T')[0])
  }

  // For each future week, delete existing availability and insert new
  for (const week of weeks) {
    await supabase.from('availability').delete().eq('week_start', week)
    const rows = availability.map((a: { day_of_week: number; availability_type: string }) => ({
      week_start: week,
      day_of_week: a.day_of_week,
      availability_type: a.availability_type,
    }))
    if (rows.length > 0) {
      await supabase.from('availability').insert(rows)
    }
  }

  return NextResponse.json({ success: true })
}