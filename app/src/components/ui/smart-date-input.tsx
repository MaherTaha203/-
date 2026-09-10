import { useState, type ComponentProps } from 'react'

import { Input } from '@/components/ui/input'
import { formatDate, todayIsoDate } from '@/lib/format'
import { parseSmartDate } from '@/lib/smart-date'

type SmartDateInputProps = {
  // Current value as a YYYY-MM-DD ISO string ('' when empty).
  value: string
  onChange: (iso: string) => void
  // Optional upper bound as ISO; a parsed date beyond it is rejected (e.g. the
  // "block future date" guard passes today).
  max?: string
} & Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'onBlur' | 'type'>

// A keyboard-first date field: the operator types the day (or day/month, or a
// full date) and it resolves against today on blur/Enter. Displays the resolved
// date in the configured format; an unparseable entry reverts to the last value.
export function SmartDateInput({ value, onChange, max, ...inputProps }: SmartDateInputProps) {
  const [buffer, setBuffer] = useState(value ? formatDate(value) : '')
  const [lastValue, setLastValue] = useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    setBuffer(value ? formatDate(value) : '')
  }

  function commit() {
    const trimmed = buffer.trim()
    if (!trimmed) {
      onChange('')
      return
    }
    const iso = parseSmartDate(trimmed)
    if (iso && (!max || iso <= max)) {
      onChange(iso)
      setBuffer(formatDate(iso))
    } else {
      setBuffer(value ? formatDate(value) : '')
    }
  }

  return (
    <Input
      inputMode="numeric"
      className="figure"
      dir="ltr"
      placeholder={formatDate(todayIsoDate())}
      value={buffer}
      onChange={(event) => setBuffer(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          commit()
        }
      }}
      {...inputProps}
    />
  )
}
