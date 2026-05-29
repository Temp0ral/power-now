export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function formatDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export type ChecklistStatus = 'ok' | 'not_ok' | 'other' | null

export type Service = {
  id: string
  generator_id: string
  date: string | null
  is_pm: boolean
  is_repair: boolean
  is_emergency: boolean
  is_scheduled: boolean
  scheduled_date: string | null
  customer_signature: string | null
  customer_not_home?: boolean
  notes: string | null
  additional_maintenance: boolean
  customer?: {
    name: string
    address: string
  }
  generator?: {
    system_model: string
  }
}

export type Availability = {
  id: string
  week_start: string
  day_of_week: number
  availability_type: 'unavailable' | 'half_day' | 'full_day'
}