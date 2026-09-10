import { useState, type ComponentProps, type ReactNode } from 'react'

import { Input } from '@/components/ui/input'

// A labelled settings row: label on the start, control on the end. Deliberately
// carries no helper/description text — the label and control speak for themselves.
export function SettingRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border py-3.5 last:border-b-0">
      <span className="text-[13.5px] font-medium text-foreground">{label}</span>
      <div className="flex items-center">{children}</div>
    </div>
  )
}

// An accessible on/off switch.
export function Toggle({
  checked,
  onChange,
  labelOn = 'مفعّل',
  labelOff = 'معطّل',
}: {
  checked: boolean
  onChange: (next: boolean) => void
  labelOn?: string
  labelOff?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5"
    >
      <span
        className={`relative h-[22px] w-10 flex-none rounded-full transition-colors ${checked ? 'bg-olive' : 'bg-border-strong'}`}
      >
        <span
          className={`absolute top-0.5 size-[18px] rounded-full bg-white shadow transition-all ${checked ? 'start-auto end-0.5' : 'start-0.5 end-auto'}`}
        />
      </span>
      <span className={`text-[12px] font-bold ${checked ? 'text-olive' : 'text-muted-foreground'}`}>
        {checked ? labelOn : labelOff}
      </span>
    </button>
  )
}

// A text input that edits a local buffer and only commits on blur, so store-side
// trimming/validation never fights the operator mid-typing.
export function TextSetting({
  value,
  onCommit,
  ...inputProps
}: { value: string; onCommit: (next: string) => void } & Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'onBlur'>) {
  const [buffer, setBuffer] = useState(value)
  // Re-sync the buffer when the committed value changes externally (e.g. after a
  // reset, or store-side trimming) — the recommended "adjust state during render"
  // pattern, tracked by the last value seen, rather than a sync effect.
  const [lastValue, setLastValue] = useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    setBuffer(value)
  }
  return (
    <Input
      value={buffer}
      onChange={(event) => setBuffer(event.target.value)}
      onBlur={() => {
        if (buffer !== value) onCommit(buffer)
      }}
      {...inputProps}
    />
  )
}

export type SegmentOption<T extends string | number> = { value: T; label: ReactNode }

// A compact segmented control for a small set of mutually-exclusive choices.
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T
  options: SegmentOption<T>[]
  onChange: (next: T) => void
  ariaLabel?: string
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex overflow-hidden rounded-lg border border-border-strong">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`border-s border-border px-3 py-1.5 text-[12px] font-semibold first:border-s-0 ${selected ? 'bg-olive text-white' : 'text-muted-foreground'}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
