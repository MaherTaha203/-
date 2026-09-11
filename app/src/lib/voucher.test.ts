import { describe, expect, it } from 'vitest'

import { formatVoucherNo, voucherLabel, voucherRef, voucherTypeLabel } from '@/lib/voucher'

describe('formatVoucherNo', () => {
  it('renders bare Latin digits with no grouping', () => {
    expect(formatVoucherNo(1040)).toBe('1040')
    expect(formatVoucherNo(1)).toBe('1')
  })

  it('accepts a string and never adds a separator', () => {
    expect(formatVoucherNo('1000000')).toBe('1000000')
  })

  it('truncates any fractional noise to an integer identifier', () => {
    expect(formatVoucherNo(104.9)).toBe('104')
  })
})

describe('voucher labels', () => {
  it('names the voucher type in Arabic', () => {
    expect(voucherTypeLabel('receipt')).toBe('سند قبض')
    expect(voucherTypeLabel('payment')).toBe('سند صرف')
  })

  it('builds the full "type — رقم N" label with no letter prefix', () => {
    expect(voucherLabel('receipt', 104)).toBe('سند قبض — رقم 104')
    expect(voucherLabel('payment', 27)).toBe('سند صرف — رقم 27')
  })
})

describe('voucherRef', () => {
  it('prefixes by type and zero-pads to three digits', () => {
    expect(voucherRef('receipt', 15)).toBe('R-015')
    expect(voucherRef('payment', 10)).toBe('P-010')
  })

  it('does not truncate numbers already wider than three digits', () => {
    expect(voucherRef('receipt', 1040)).toBe('R-1040')
  })
})
