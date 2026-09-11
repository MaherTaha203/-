import { PrintPreview } from '@/components/print/print-preview'
import { formatDate, formatNumber, todayIsoDate } from '@/lib/format'
import { getSettings } from '@/store/use-settings-store'
import { formatVoucherNo } from '@/lib/voucher'
import { chronological, withRunningBalance, type RunningMovement } from '@/lib/statement-rows'
import type { ReportView } from '@/store/use-shell-store'
import type { FinancialMovement } from '@/types/domain'

type FinancialReportPrintProps = {
  view: ReportView
  title: string
  net: number
  totalIn: number
  totalOut: number
  opening: number
  receiptCount: number
  paymentCount: number
  movements: FinancialMovement[]
  periodLabel?: string
  onClose: () => void
}

const INK = 'text-[#0f172a]'
const MUTED = 'text-[#475569]'
const HAIR = 'border-[#e2e8f0]'
const HEAD = 'border-[#cbd5e1]'

function partyAndContext(movement: FinancialMovement) {
  const party = movement.movementType === 'receipt' ? movement.partyName ?? '—' : 'المركز'
  return movement.context ? `${party} · ${movement.context}` : party
}

export function FinancialReportPrint({
  view,
  title,
  net,
  totalIn,
  totalOut,
  opening,
  receiptCount,
  paymentCount,
  movements,
  periodLabel,
  onClose,
}: FinancialReportPrintProps) {
  const centerName = getSettings().name
  const orderedRows = chronological(movements)
  const runningRows = withRunningBalance(movements, opening)

  return (
    <PrintPreview
      docTitle={title}
      documentTitle={`${title} — ${centerName}`}
      onClose={onClose}
      meta={
        <>
          {periodLabel ? <div>الفترة · {periodLabel}</div> : null}
          <div>
            التاريخ <span className="figure">{formatDate(todayIsoDate())}</span>
          </div>
          <div>
            عدد الحركات المالية <span className="figure">{formatNumber(movements.length)}</span>
          </div>
        </>
      }
    >
      {view === 'general' ? (
        // Opening and closing balances are not repeated here — they live in the
        // ledger below (the opening-balance row and the final running balance).
        <div className="grid grid-cols-3 gap-4 border-y border-[#e2e8f0] py-5">
          <SummaryCell label="إجمالي المقبوضات" value={totalIn} color="text-[#059669]" />
          <SummaryCell label="إجمالي المدفوعات" value={totalOut} color="text-[#dc2626]" />
          <SummaryCell label="صافي التدفق النقدي" value={net} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 border-y border-[#e2e8f0] py-5">
          <SummaryCell
            label={view === 'receipts' ? 'إجمالي المقبوضات' : 'إجمالي المدفوعات'}
            value={view === 'receipts' ? totalIn : totalOut}
            color={view === 'receipts' ? 'text-[#059669]' : 'text-[#dc2626]'}
          />
          <SummaryCell
            label={view === 'receipts' ? 'عدد سندات القبض' : 'عدد سندات الصرف'}
            value={view === 'receipts' ? receiptCount : paymentCount}
          />
        </div>
      )}

      <h3 className={`mt-6 mb-2 text-[13px] font-bold ${INK}`}>سجل الحركات المالية</h3>
      {view === 'general' ? (
        <GeneralMovementTable movements={runningRows} opening={opening} />
      ) : (
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className={`text-[10.5px] ${MUTED}`}>
              <th className={`border-b ${HEAD} px-2 py-2 text-start font-semibold`}>النوع</th>
              <th className={`border-b ${HEAD} px-2 py-2 text-start font-semibold`}>رقم السند</th>
              <th className={`border-b ${HEAD} px-2 py-2 text-start font-semibold`}>التاريخ</th>
              <th className={`border-b ${HEAD} px-2 py-2 text-start font-semibold`}>البيان</th>
              <th className={`border-b ${HEAD} px-2 py-2 text-end font-semibold`}>المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {orderedRows.map((movement) => {
              const isReceipt = movement.movementType === 'receipt'
              return (
                <tr key={`${movement.movementType}-${movement.id}`} className={INK}>
                  <td className={`border-b ${HAIR} px-2 py-2.5`}>
                    <span className={isReceipt ? 'text-[#059669]' : 'text-[#dc2626]'}>{isReceipt ? 'قبض' : 'صرف'}</span>
                  </td>
                  <td className={`figure border-b ${HAIR} px-2 py-2.5 ${MUTED}`}>
                    {formatVoucherNo(movement.voucherNumber)}
                  </td>
                  <td className={`border-b ${HAIR} px-2 py-2.5`}>{formatDate(movement.voucherDate)}</td>
                  <td className={`border-b ${HAIR} px-2 py-2.5 ${MUTED}`}>{partyAndContext(movement)}</td>
                  <td className={`figure border-b ${HAIR} px-2 py-2.5 text-end font-semibold ${isReceipt ? 'text-[#059669]' : 'text-[#dc2626]'}`}>
                    {formatNumber(movement.amount)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </PrintPreview>
  )
}

function GeneralMovementTable({ movements, opening }: { movements: RunningMovement[]; opening: number }) {
  return (
    <table className="w-full border-collapse text-[12.5px]">
      <thead>
        <tr className={`text-[10.5px] ${MUTED}`}>
          <th className={`border-b ${HEAD} px-2 py-2 text-start font-semibold`}>التاريخ</th>
          <th className={`border-b ${HEAD} px-2 py-2 text-start font-semibold`}>رقم السند</th>
          <th className={`border-b ${HEAD} px-2 py-2 text-start font-semibold`}>البيان</th>
          <th className={`border-b ${HEAD} px-2 py-2 text-end font-semibold`}>صرف</th>
          <th className={`border-b ${HEAD} px-2 py-2 text-end font-semibold`}>قبض</th>
          <th className={`border-b ${HEAD} px-2 py-2 text-end font-semibold`}>الرصيد الجاري</th>
        </tr>
      </thead>
      <tbody>
        <tr className={INK}>
          <td className={`border-b ${HAIR} px-2 py-2.5`}>—</td>
          <td className={`border-b ${HAIR} px-2 py-2.5`}>—</td>
          <td className={`border-b ${HAIR} px-2 py-2.5 font-medium ${MUTED}`}>الرصيد الافتتاحي</td>
          <td className={`figure border-b ${HAIR} px-2 py-2.5 text-end ${MUTED}`}>—</td>
          <td className={`figure border-b ${HAIR} px-2 py-2.5 text-end ${MUTED}`}>—</td>
          <td className={`figure border-b ${HAIR} px-2 py-2.5 text-end font-semibold ${balanceClass(opening)}`}>
            {formatNumber(opening)}
          </td>
        </tr>
        {movements.map((movement) => {
          const isReceipt = movement.movementType === 'receipt'
          return (
            <tr key={`${movement.movementType}-${movement.id}`} className={INK}>
              <td className={`border-b ${HAIR} px-2 py-2.5`}>{formatDate(movement.voucherDate)}</td>
              <td className={`figure border-b ${HAIR} px-2 py-2.5 ${MUTED}`}>{formatVoucherNo(movement.voucherNumber)}</td>
              <td className={`border-b ${HAIR} px-2 py-2.5 ${MUTED}`}>{partyAndContext(movement)}</td>
              <td className={`figure border-b ${HAIR} px-2 py-2.5 text-end font-semibold ${isReceipt ? MUTED : 'text-[#dc2626]'}`}>
                {isReceipt ? '—' : formatNumber(movement.amount)}
              </td>
              <td className={`figure border-b ${HAIR} px-2 py-2.5 text-end font-semibold ${isReceipt ? 'text-[#059669]' : MUTED}`}>
                {isReceipt ? formatNumber(movement.amount) : '—'}
              </td>
              <td className={`figure border-b ${HAIR} px-2 py-2.5 text-end font-semibold ${balanceClass(movement.runningBalance)}`}>
                {formatNumber(movement.runningBalance)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function balanceClass(value: number) {
  return value < 0 ? 'text-[#dc2626]' : INK
}

function SummaryCell({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div className={`text-[11px] ${MUTED}`}>{label}</div>
      <div className={`figure mt-1 text-2xl font-semibold ${color ?? INK}`}>{formatNumber(value)}</div>
    </div>
  )
}
