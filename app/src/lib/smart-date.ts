// Smart, keyboard-first date entry. The operator types just the day and the
// current month/year are filled in; a day+month keeps the current year; a full
// day/month/year is taken as-is. Separators are any non-digits, and a run of
// digits with no separators is split by width (ddmm, ddmmyy, ddmmyyyy). Returns
// a YYYY-MM-DD ISO string, or null when the input can't be a real calendar date.

export function parseSmartDate(raw: string, today: Date = new Date()): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const tokens = trimmed.split(/\D+/).filter(Boolean)
  if (tokens.length === 0) return null

  let day: number
  let month = today.getMonth() + 1
  let year = today.getFullYear()

  if (tokens.length === 1) {
    const t = tokens[0]
    if (t.length <= 2) {
      day = Number(t)
    } else if (t.length === 3) {
      // d + mm  → single day digit then month
      day = Number(t.slice(0, 1))
      month = Number(t.slice(1, 3))
    } else if (t.length === 4) {
      day = Number(t.slice(0, 2))
      month = Number(t.slice(2, 4))
    } else if (t.length === 6) {
      day = Number(t.slice(0, 2))
      month = Number(t.slice(2, 4))
      year = 2000 + Number(t.slice(4, 6))
    } else if (t.length === 8) {
      day = Number(t.slice(0, 2))
      month = Number(t.slice(2, 4))
      year = Number(t.slice(4, 8))
    } else {
      return null
    }
  } else if (tokens.length === 2) {
    day = Number(tokens[0])
    month = Number(tokens[1])
  } else {
    day = Number(tokens[0])
    month = Number(tokens[1])
    const y = tokens[2]
    year = y.length <= 2 ? 2000 + Number(y) : Number(y)
  }

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  // Reject impossible calendar dates (e.g. 31/02) by round-tripping through Date.
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
