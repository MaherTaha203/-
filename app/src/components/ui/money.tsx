import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/format'
import { useSettingsStore } from '@/store/use-settings-store'

type MoneySign = 'plus' | 'minus' | 'none'

type MoneyProps = {
  value: number
  className?: string
  currencyClassName?: string
  sign?: MoneySign
  currency?: boolean
}

const SIGN_GLYPH: Record<MoneySign, string> = {
  plus: '+',
  minus: '−',
  none: '',
}

/**
 * A financial figure. Always renders Western (Latin) digits via formatNumber,
 * in a tabular monospace face, isolated from the surrounding RTL flow.
 * The value itself is presentation only — it must originate from a voucher-derived source.
 */
export function Money({
  value,
  className,
  currencyClassName,
  sign = 'none',
  currency = true,
}: MoneyProps) {
  const currencySymbol = useSettingsStore((state) => state.settings.currencySymbol)
  return (
    <span className={cn('figure', className)}>
      {SIGN_GLYPH[sign]}
      {formatNumber(value)}
      {currency ? (
        <span className={cn('ms-0.5 font-sans text-[0.72em] text-faint', currencyClassName)}>
          {currencySymbol}
        </span>
      ) : null}
    </span>
  )
}
