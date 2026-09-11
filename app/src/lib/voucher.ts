// Voucher identifier helpers.
//
// A voucher number is an IDENTIFIER, not an amount: bare Latin digits, never
// Arabic-Indic, never thousands separators. Owner decision: documents and
// statements show it as a typed reference — R-### for receipts, P-### for
// payments — so the type reads at a glance (voucherRef). The bare number
// (formatVoucherNo) stays available for contexts that don't want the prefix.

export type VoucherType = 'receipt' | 'payment'

/** Bare Latin voucher number, e.g. 1040 -> "1040" (no grouping, no prefix). */
export function formatVoucherNo(voucherNumber: number | string): string {
  return String(Math.trunc(Number(voucherNumber)))
}

const REF_PREFIX: Record<VoucherType, string> = { receipt: 'R', payment: 'P' }

/** Typed document reference, e.g. receipt 15 -> "R-015", payment 10 -> "P-010". */
export function voucherRef(type: VoucherType, voucherNumber: number | string): string {
  return `${REF_PREFIX[type]}-${formatVoucherNo(voucherNumber).padStart(3, '0')}`
}

export function voucherTypeLabel(type: VoucherType): string {
  return type === 'receipt' ? 'سند قبض' : 'سند صرف'
}

/** e.g. "سند قبض — رقم 104". */
export function voucherLabel(type: VoucherType, voucherNumber: number | string): string {
  return `${voucherTypeLabel(type)} — رقم ${formatVoucherNo(voucherNumber)}`
}
