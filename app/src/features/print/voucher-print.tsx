import { PrintPreview } from '@/components/print/print-preview'
import { amountInWords } from '@/lib/amount-in-words'
import { formatDate, formatNumber } from '@/lib/format'
import { formatVoucherNo, voucherTypeLabel } from '@/lib/voucher'
import { getSettings } from '@/store/use-settings-store'
import type { FinancialMovement } from '@/types/domain'

type VoucherPrintProps = {
  movement: FinancialMovement
  onClose: () => void
}

const INK = 'text-[#0f172a]'
const MUTED = 'text-[#475569]'
const HAIR = 'border-[#e2e8f0]'

export function VoucherPrint({ movement, onClose }: VoucherPrintProps) {
  const isReceipt = movement.movementType === 'receipt'
  const typeLabel = voucherTypeLabel(movement.movementType)
  const voucherNo = formatVoucherNo(movement.voucherNumber)
  const settings = getSettings()
  const centerName = settings.name
  const words = amountInWords(movement.amount)

  return (
    <PrintPreview
      docTitle={typeLabel}
      documentTitle={`${typeLabel} رقم ${voucherNo} — ${centerName}`}
      onClose={onClose}
      meta={
        <>
          <div>
            رقم السند <span className="figure font-semibold text-[#0f172a]">{voucherNo}</span>
          </div>
          <div>
            التاريخ <span className="figure">{formatDate(movement.voucherDate)}</span>
          </div>
        </>
      }
    >
      <div className={`rounded-xl border ${HAIR} p-5`}>
        {isReceipt ? <Row label="استلمنا من" value={movement.partyName ?? '—'} /> : null}
        {movement.context ? <Row label={isReceipt ? 'عن الدورة' : 'بند المصروف'} value={movement.context} /> : null}
        <div className={`mt-4 border-t ${HAIR} pt-4`}>
          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <div dir="rtl" className="text-[13px] font-medium leading-6 text-[#334155]">
                {words.ar}
              </div>
              <div dir="ltr" className="mt-0.5 text-[11.5px] leading-5 text-[#64748b]">
                {words.en}
              </div>
            </div>
            <div className="text-end sm:min-w-[150px]">
              <div className={`text-[12px] font-medium ${MUTED}`}>
                {isReceipt ? 'المبلغ المقبوض' : 'المبلغ المدفوع'}
              </div>
              <div className={`figure mt-1 text-3xl font-bold ${INK}`}>
                {formatNumber(movement.amount)} <span className="text-lg font-medium text-[#64748b]">{settings.currencySymbol}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-2 gap-10">
        <Signature label={isReceipt ? 'توقيع المستلِم' : 'توقيع المسؤول'} />
        <Signature label={isReceipt ? 'توقيع الدافع' : 'توقيع المستلِم'} />
      </div>
    </PrintPreview>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-[14px]">
      <span className={MUTED}>{label}</span>
      <span className={`font-semibold ${INK}`}>{value}</span>
    </div>
  )
}

function Signature({ label }: { label: string }) {
  return (
    <div className="text-center">
      <div className={`mb-2 border-t ${HAIR}`} />
      <span className={`text-[12px] ${MUTED}`}>{label}</span>
    </div>
  )
}
