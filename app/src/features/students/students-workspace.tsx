import { useMemo, useState } from 'react'

import { ArrowDownLeft, Pencil, Printer, Search } from 'lucide-react'

import { ConfigNotice, ErrorNotice } from '@/components/shell/notices'
import { RouteHeader } from '@/components/shell/route-header'
import { StudentStatementPrint } from '@/features/print/student-statement-print'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/ui/money'
import { SkeletonRows } from '@/components/ui/skeleton'
import { aggregateStudents, statementFor, type StudentAggregate } from '@/lib/aggregate'
import { formatDate, formatNumber } from '@/lib/format'
import { formatVoucherNo } from '@/lib/voucher'
import { normalizeArabic } from '@/lib/text'
import { useShellStore } from '@/store/use-shell-store'
import { useWorkspaceStore } from '@/store/use-workspace-store'
import './detail-table.css'

const REMAINING_EPSILON = 0.0001

type StudentStatus = 'ok' | 'due' | 'none'

function statusOf(item: StudentAggregate): StudentStatus {
  if (item.remaining <= REMAINING_EPSILON) return 'ok'
  if (item.paid <= REMAINING_EPSILON) return 'none'
  return 'due'
}

export function StudentsWorkspace() {
  const students = useWorkspaceStore((state) => state.students)
  const statementLines = useWorkspaceStore((state) => state.statementLines)
  const loaded = useWorkspaceStore((state) => state.loaded)
  const error = useWorkspaceStore((state) => state.error)
  const clearError = useWorkspaceStore((state) => state.clearError)
  const reload = useWorkspaceStore((state) => state.load)

  const selectedStudentId = useShellStore((state) => state.selectedStudentId)
  const selectStudent = useShellStore((state) => state.selectStudent)
  const openReceiveFor = useShellStore((state) => state.openReceiveFor)
  const openEditStudent = useShellStore((state) => state.openEditStudent)
  const navigateStudents = useShellStore((state) => state.navigateStudents)

  const [query, setQuery] = useState('')
  const [printing, setPrinting] = useState(false)

  const aggregates = useMemo(() => aggregateStudents(students, statementLines), [students, statementLines])

  const sorted = useMemo(
    () => aggregates.slice().sort((a, b) => b.remaining - a.remaining || a.student.name.localeCompare(b.student.name, 'ar')),
    [aggregates],
  )

  const filtered = useMemo(() => {
    const trimmed = query.trim()
    if (!trimmed) return sorted
    const term = normalizeArabic(trimmed)
    const digits = trimmed.replace(/\D/g, '')
    return sorted.filter((item) => {
      const { name, phone, idNumber } = item.student
      if (normalizeArabic(name).includes(term)) return true
      if (digits.length > 0) {
        const phoneHit = phone ? phone.replace(/\D/g, '').includes(digits) : false
        const idHit = idNumber ? idNumber.replace(/\D/g, '').includes(digits) : false
        if (phoneHit || idHit) return true
      }
      return statementFor(statementLines, item.student.id).some((line) => normalizeArabic(line.courseName).includes(term))
    })
  }, [sorted, query, statementLines])

  const activeId = selectedStudentId ?? filtered[0]?.student.id ?? sorted[0]?.student.id ?? null
  const active = useMemo(() => aggregates.find((item) => item.student.id === activeId) ?? null, [aggregates, activeId])
  const activeLines = useMemo(() => (activeId ? statementFor(statementLines, activeId) : []), [statementLines, activeId])

  return (
    <div className="detail-workspace">
      <RouteHeader eyebrow="الطلاب" title="كشف الحساب" />
      <ConfigNotice />
      <ErrorNotice message={error} onDismiss={clearError} onRetry={reload} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => navigateStudents('directory')} className="rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground">دليل الطلاب</button>
        <button type="button" onClick={() => navigateStudents('statement')} aria-current="page" className="rounded-full bg-olive-weak px-3.5 py-1.5 text-sm font-medium text-olive">كشف الحساب</button>
      </div>

      <div className="grid gap-6 md:grid-cols-[380px_minmax(0,1fr)]">
        <div>
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-border-strong bg-panel px-3.5 py-2.5 shadow-sm focus-within:border-olive">
            <Search aria-hidden className="size-4 flex-none text-faint" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && filtered[0]) selectStudent(filtered[0].student.id) }} aria-label="البحث عن طالب" placeholder="الاسم أو الهاتف أو الرقم التعريفي أو الدورة" className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-faint" />
          </div>

          <div className="border-t border-border-strong">
            {!loaded ? <div className="p-3"><SkeletonRows rows={6} /></div> : filtered.length > 0 ? filtered.map((item) => <StudentRow key={item.student.id} item={item} active={item.student.id === activeId} onSelect={() => selectStudent(item.student.id)} onQuickReceive={() => openReceiveFor(item.student.name)} />) : <p className="px-4 py-8 text-center text-sm text-faint">لا نتائج مطابقة.</p>}
          </div>
        </div>

        <section className="min-w-0 border-y border-border py-6" aria-label={`كشف حساب ${active?.student.name ?? ''}`}>
          {active ? (
            <>
              <div className="mb-6 flex flex-wrap items-center gap-4 border-b border-border pb-6">
                <span className="editorial grid size-14 flex-none place-items-center rounded-full bg-olive text-2xl text-white">{active.student.name.charAt(0)}</span>
                <div className="min-w-0">
                  <h2 className="editorial text-2xl text-foreground">{active.student.name}</h2>
                  <div className="text-[13px] text-muted-foreground">{formatNumber(active.courses)} دورة · آخر حركة {active.lastActivity ? formatDate(active.lastActivity) : '—'}</div>
                  {active.student.idNumber || active.student.phone ? <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[12.5px] text-faint">
                    {active.student.idNumber ? <span>الرقم التعريفي <span className="figure text-muted-foreground" dir="ltr">{active.student.idNumber}</span></span> : null}
                    {active.student.phone ? <span>الهاتف <span className="figure text-muted-foreground" dir="ltr">{active.student.phone}</span></span> : null}
                  </div> : null}
                </div>
                <div className="ms-auto flex gap-8"><RecordFigure label="المسدَّد" value={active.paid} tone="ink" /><RecordFigure label="الرصيد المستحق" value={active.remaining} tone="warn" /></div>
              </div>

              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-bold text-foreground">كشف الحساب — مُستخرج من السندات</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="quiet" size="sm" onClick={() => openEditStudent(active.student.id)}><Pencil className="size-4" />تعديل بيانات الطالب</Button>
                  <Button variant="quiet" size="sm" onClick={() => setPrinting(true)}><Printer className="size-4" />طباعة الكشف</Button>
                  <Button variant="quiet" size="sm" onClick={() => openReceiveFor(active.student.name)}><ArrowDownLeft className="size-4" />تسجيل دفعة</Button>
                </div>
              </div>

              <div className="detail-table-wrap">
                <table className="border-collapse text-sm">
                  <thead><tr className="text-[11px] tracking-wide text-faint">
                    <th className="border-b border-border px-2 py-2.5 text-start font-semibold">التاريخ</th>
                    <th className="border-b border-border px-2 py-2.5 text-start font-semibold">البيان</th>
                    <th className="border-b border-border px-2 py-2.5 text-start font-semibold">الدورة</th>
                    <th className="border-b border-border px-2 py-2.5 text-end font-semibold">قيمة الدورة</th>
                    <th className="border-b border-border px-2 py-2.5 text-end font-semibold">المسدَّد</th>
                    <th className="border-b border-border px-2 py-2.5 text-end font-semibold">الرصيد المستحق</th>
                  </tr></thead>
                  <tbody>{activeLines.length > 0 ? activeLines.map((line) => <tr key={line.id}>
                    <td className="border-b border-border px-2 py-3">{formatDate(line.voucherDate)}</td>
                    <td className="border-b border-border px-2 py-3">سند قبض — رقم {formatVoucherNo(line.voucherNumber)}</td>
                    <td className="border-b border-border px-2 py-3 text-muted-foreground">{line.courseName}</td>
                    <td className="figure border-b border-border px-2 py-3 text-end">{formatNumber(line.courseValue)}</td>
                    <td className="figure border-b border-border px-2 py-3 text-end font-medium">{formatNumber(line.amountReceived)}</td>
                    <td className="figure border-b border-border px-2 py-3 text-end font-semibold">{formatNumber(line.remainingBalance)}</td>
                  </tr>) : <tr><td colSpan={6} className="px-2 py-10 text-center text-sm text-faint">لا توجد حركات.</td></tr>}</tbody>
                </table>
              </div>
            </>
          ) : <div className="py-16 text-center text-sm text-faint">{loaded ? 'لا يوجد طلاب.' : 'جارٍ التحميل…'}</div>}
        </section>
      </div>

      {printing && active ? <StudentStatementPrint studentName={active.student.name} paid={active.paid} remaining={active.remaining} courses={active.courses} lines={activeLines} onClose={() => setPrinting(false)} /> : null}
    </div>
  )
}

function StudentRow({ item, active, onSelect, onQuickReceive }: { item: StudentAggregate; active: boolean; onSelect: () => void; onQuickReceive: () => void }) {
  const status = statusOf(item)
  const statusLabel = status === 'ok' ? 'مسدَّد بالكامل' : status === 'due' ? 'رصيد مستحق' : 'غير مسدَّد'
  return <div className={`flex items-center gap-2 border-b border-border last:border-b-0 ${active ? 'bg-highlight' : ''}`}>
    <button type="button" onClick={onSelect} aria-current={active ? 'true' : undefined} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pe-1 ps-4 text-start">
      <span className="grid size-8 flex-none place-items-center rounded-full bg-olive-weak text-[13px] font-bold text-olive">{item.student.name.charAt(0)}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{item.student.name}</span>
      <span className="text-[11px] font-medium text-muted-foreground">{statusLabel}</span>
      {item.remaining > REMAINING_EPSILON ? <Money value={item.remaining} currency={false} className="text-xs font-semibold text-warn" /> : null}
    </button>
    <button type="button" onClick={onQuickReceive} aria-label={`سند قبض لـ ${item.student.name}`} title="سند قبض" className="me-2 flex flex-none items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium text-gold"><ArrowDownLeft className="size-3.5" />قبض</button>
  </div>
}

function RecordFigure({ label, value, tone }: { label: string; value: number; tone: 'ink' | 'warn' }) {
  return <div><div className="text-[11px] font-medium text-faint">{label}</div><Money value={value} currency={false} className={`text-xl font-semibold ${tone === 'warn' && value > 0 ? 'text-warn' : 'text-foreground'}`} /></div>
}
