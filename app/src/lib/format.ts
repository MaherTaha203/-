import { getSettings } from '@/store/use-settings-store'
import type { DateFormat } from '@/lib/app-settings'

// Owner Decision: every numeric value shown to users must always render with Western digits (0-9),
// regardless of the Arabic RTL interface. Route every displayed number/date through these helpers.
const WESTERN_DIGITS_NUMBERING_SYSTEM = 'latn'

export function formatNumber(value: number | string) {
  const numericValue = Number(value)

  if (Number.isNaN(numericValue)) {
    return '—'
  }

  return new Intl.NumberFormat('ar-EG', {
    numberingSystem: WESTERN_DIGITS_NUMBERING_SYSTEM,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numericValue)
}

// Renders a YYYY-MM-DD date in the operator's chosen order. Built by hand from
// the date parts so the output is always pure Western digits with no locale RTL
// marks, and the day/month/year order is exactly as configured.
export function formatDate(value: string, format: DateFormat = getSettings().dateFormat) {
  const parsedDate = new Date(`${value}T00:00:00`)

  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  const year = String(parsedDate.getFullYear())
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
  const day = String(parsedDate.getDate()).padStart(2, '0')

  return format === 'ymd' ? `${year}/${month}/${day}` : `${day}/${month}/${year}`
}

// Formats a full ISO timestamp (e.g. an audit-log `changed_at`) into Western-digit
// date and 24-hour time parts, honoring the same Owner Decision as the helpers
// above. Date-only strings (YYYY-MM-DD) should use formatDate instead.
export function formatTimestamp(value: string): { date: string; time: string } {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return { date: value, time: '' }
  }

  const date = new Intl.DateTimeFormat('ar-EG', {
    numberingSystem: WESTERN_DIGITS_NUMBERING_SYSTEM,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed)

  const time = new Intl.DateTimeFormat('ar-EG', {
    numberingSystem: WESTERN_DIGITS_NUMBERING_SYSTEM,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(parsed)

  return { date, time }
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}