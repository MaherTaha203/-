import { PrintPreview } from '@/components/print/print-preview'
import { formatDate, formatNumber, todayIsoDate } from '@/lib/format'
import { formatVoucherNo } from '@/lib/voucher'
import type { StudentStatementLine } from '@/types/domain'

type StudentStatementPrintProps = {
  studentName: string
  paid: number
  remaining: number
  courses: number
  lines: StudentStatementLine[]
  onClose: () => void
}

const INK = 'text-[#0f172a]'
const MUTED = 'text-[#475569]'
const HAIR = 'border-[#e2e8f0]'
const HEAD = 'border-[#cbd5e1]'

/**
 * The printable student statement — a branded A4 rendering of the student's
 * voucher-derived record. Presentation only; every figure comes from the
 * derived read model, unchanged.
 */
export function StudentStatementPrint({
  studentName,
  paid,
  remaining,
  courses,
  lines,
  onClose,
}: StudentStatementPrintProps) {
  return (
    <PrintPreview
      docTitle="كشف حساب الطالب"
      documentTitle={`كشف حساب الطالب — ${studentName}`}
      onClose={onClose}
      meta={
        <>
          <div className="font-semibold text-[#0f172a]">{studentName}</div>
          <div>
            التاريخ <span className="figure">{formatDate(todayIsoDate())}</span>
          </div>
          <div>
            عدد الدورات <span className="figure">{formatNumber(courses)}</span>
          </div>
        </>
      }
    >
      {/* Summary strip */}
      <div className={`grid grid-cols-2 gap-4 rounded-xl border ${HAIR} p-4 sm:grid-cols-2`}>
        <div>
          <div className={`text-[11px] ${MUTED}`}>إجمالي المسدَّد</div>
          <div className={`figure mt-1 text-2xl font-semibold ${INK}`}>{formatNumber(paid)}</div>
        </div>
        <div>
          <div className={`text-[11px] ${MUTED}`}>إجمالي الرصيد المستحق</div>
          <div className="figure mt-1 text-2xl font-semibold text-[#b45309]">
            {formatNumber(remaining)}
          </div>
        </div>
      </div>

      {/* Statement table */}
      <h3 className={`mt-6 mb-2 text-[13px] font-bold ${INK}`}>كشف الحساب</h3>
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className={`text-[10.5px] ${MUTED}`}>
            <th className={`border-b ${HEAD} px-2 py-2 text-start font-semibold`}>التاريخ</th>
            <th className={`border-b ${HEAD} px-2 py-2 text-start font-semibold`}>رقم السند</th>
            <th className={`border-b ${HEAD} px-2 py-2 text-start font-semibold`}>الدورة</th>
            <th className={`border-b ${HEAD} px-2 py-2 text-end font-semibold`}>قيمة الدورة</th>
            <th className={`border-b ${HEAD} px-2 py-2 text-end font-semibold`}>المسدَّد</th>
            <th className={`border-b ${HEAD} px-2 py-2 text-end font-semibold`}>الرصيد المستحق</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className={INK}>
              <td className={`border-b ${HAIR} px-2 py-2.5`}>{formatDate(line.voucherDate)}</td>
              <td className={`figure border-b ${HAIR} px-2 py-2.5 ${MUTED}`}>{formatVoucherNo(line.voucherNumber)}</td>
              <td className={`border-b ${HAIR} px-2 py-2.5 ${MUTED}`}>{line.courseName}</td>
              <td className={`figure border-b ${HAIR} px-2 py-2.5 text-end`}>
                {formatNumber(line.courseValue)}
              </td>
              <td className={`figure border-b ${HAIR} px-2 py-2.5 text-end`}>
                {formatNumber(line.amountReceived)}
              </td>
              <td className={`figure border-b ${HAIR} px-2 py-2.5 text-end`}>
                {formatNumber(line.remainingBalance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </PrintPreview>
  )
}
