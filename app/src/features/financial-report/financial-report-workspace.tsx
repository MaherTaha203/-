import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Ban, ChevronDown, Eye, Pencil, Printer, RotateCw, Users } from 'lucide-react'

import { ConfigNotice, ErrorNotice } from '@/components/shell/notices'
import { RouteHeader } from '@/components/shell/route-header'
import { FinancialReportPrint } from '@/features/print/financial-report-print'
import { StudentStatementPrint } from '@/features/print/student-statement-print'
import { VoucherPrint } from '@/features/print/voucher-print'
import { CancelVoucherDialog } from '@/features/financial-report/cancel-voucher-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Money } from '@/components/ui/money'
import { SkeletonRows } from '@/components/ui/skeleton'
import type { StudentAggregate } from '@/lib/aggregate'
import { aggregateStudents, financialTotals, movementsNewestFirst, paymentCount, receiptCount, statementFor } from '@/lib/aggregate'
import { withRunningBalance, type RunningMovement } from '@/lib/statement-rows'
import { formatDate, formatNumber } from '@/lib/format'
import { formatVoucherNo } from '@/lib/voucher'
import type { FinancialMovement } from '@/types/domain'
import { useSettingsStore } from '@/store/use-settings-store'
import { useShellStore, type ReportView } from '@/store/use-shell-store'
import { useWorkspaceStore } from '@/store/use-workspace-store'

type Period = 'all' | 'month' | 'week'

const PERIODS: { id: Period; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'month', label: 'هذا الشهر' },
  { id: 'week', label: 'هذا الأسبوع' },
]

const REPORT_VIEWS: { id: ReportView; label: string }[] = [
  { id: 'general', label: 'كشف الحساب العام' },
  { id: 'receipts', label: 'تقرير المقبوضات' },
  { id: 'payments', label: 'تقرير المدفوعات' },
]

function partyAndContext(movement: FinancialMovement) {
  const party = movement.movementType === 'receipt' ? movement.partyName ?? '—' : 'المركز'
  return movement.context ? `${party} · ${movement.context}` : party
}

function periodStartIso(period: Period, today = new Date()): string | null {
  if (period === 'all') return null
  const year = today.getFullYear()
  const month = today.getMonth()
  if (period === 'month') return `${year}-${String(month + 1).padStart(2, '0')}-01`
  const daysSinceSaturday = (today.getDay() + 1) % 7
  const start = new Date(year, month, today.getDate() - daysSinceSaturday)
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
}

export function FinancialReportWorkspace() {
  const movements = useWorkspaceStore((state) => state.movements)
  const students = useWorkspaceStore((state) => state.students)
  const statementLines = useWorkspaceStore((state) => state.statementLines)
  const isLoading = useWorkspaceStore((state) => state.isLoading)
  const loaded = useWorkspaceStore((state) => state.loaded)
  const error = useWorkspaceStore((state) => state.error)
  const clearError = useWorkspaceStore((state) => state.clearError)
  const reload = useWorkspaceStore((state) => state.load)
  const view = useShellStore((state) => state.reportView)
  const navigateReport = useShellStore((state) => state.navigateReport)
  const openEditReceipt = useShellStore((state) => state.openEditReceipt)
  const openEditPayment = useShellStore((state) => state.openEditPayment)
  const defaultReportPeriod = useSettingsStore((state) => state.settings.defaultReportPeriod)
  const [period, setPeriod] = useState<Period>(defaultReportPeriod)
  const [printing, setPrinting] = useState(false)
  const [printingVoucher, setPrintingVoucher] = useState<FinancialMovement | null>(null)
  const [cancelTarget, setCancelTarget] = useState<FinancialMovement | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [printStudentId, setPrintStudentId] = useState<string | null>(null)
  // General-statement filters (the account ledger): a chosen account/party plus
  // an optional custom date range that overrides the quick period presets.
  const [accountName, setAccountName] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Per-student statements are the real, course-aware document derived from
  // statement lines — reused here so the report's single print control can scope
  // to one student without duplicating that logic.
  const studentStatements = useMemo(() => aggregateStudents(students, statementLines), [students, statementLines])
  const printStudent = useMemo(
    () => (printStudentId ? studentStatements.find((item) => item.student.id === printStudentId) ?? null : null),
    [studentStatements, printStudentId],
  )

  function handleEdit(movement: FinancialMovement) {
    if (movement.movementType === 'receipt') openEditReceipt(movement.id)
    else openEditPayment(movement.id)
  }

  const start = periodStartIso(period)
  const periodLabel = PERIODS.find((item) => item.id === period)?.label ?? 'الكل'
  const scoped = useMemo(() => {
    if (!start) return movements
    return movements.filter((movement) => movement.voucherDate >= start)
  }, [movements, start])
  const opening = useMemo(() => {
    if (!start) return 0
    return financialTotals(movements.filter((movement) => movement.voucherDate < start)).net
  }, [movements, start])
  const totals = useMemo(() => financialTotals(scoped), [scoped])
  const closing = opening + totals.net
  const viewMovements = useMemo(() => {
    const ordered = movementsNewestFirst(scoped)
    if (view === 'receipts') return ordered.filter((m) => m.movementType === 'receipt')
    if (view === 'payments') return ordered.filter((m) => m.movementType === 'payment')
    return ordered
  }, [scoped, view])
  const previewMovement = useMemo(
    () => (previewId ? viewMovements.find((m) => m.id === previewId) ?? null : null),
    [viewMovements, previewId],
  )
  const title = view === 'receipts' ? 'تقرير المقبوضات' : view === 'payments' ? 'تقرير المدفوعات' : 'كشف الحساب العام'

  // Distinct parties that appear on receipts, for the general-statement account
  // filter. Payments are the centre's own expenses and carry no party.
  const accountOptions = useMemo(() => {
    const names = new Set<string>()
    for (const movement of movements) {
      if (movement.movementType === 'receipt' && movement.partyName) names.add(movement.partyName)
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'ar'))
  }, [movements])

  // The general statement (account ledger) has its own scoping: an optional
  // account, and a custom date range that overrides the quick period preset.
  const genStart = fromDate || start
  const genEnd = toDate || null
  const matchesAccount = useCallback(
    (movement: FinancialMovement) =>
      !accountName || (movement.movementType === 'receipt' && movement.partyName === accountName),
    [accountName],
  )
  const genScoped = useMemo(
    () =>
      movements.filter(
        (movement) =>
          matchesAccount(movement) &&
          (!genStart || movement.voucherDate >= genStart) &&
          (!genEnd || movement.voucherDate <= genEnd),
      ),
    [movements, matchesAccount, genStart, genEnd],
  )
  const genOpening = useMemo(
    () =>
      genStart
        ? financialTotals(movements.filter((movement) => matchesAccount(movement) && movement.voucherDate < genStart)).net
        : 0,
    [movements, matchesAccount, genStart],
  )
  const genTotals = useMemo(() => financialTotals(genScoped), [genScoped])
  const genClosing = genOpening + genTotals.net
  const genRows = useMemo(() => withRunningBalance(genScoped, genOpening), [genScoped, genOpening])
  const rangeLabel = fromDate || toDate ? `${fromDate ? formatDate(fromDate) : '…'} — ${toDate ? formatDate(toDate) : '…'}` : periodLabel
  const generalScopeLabel = accountName ? `${accountName} · ${rangeLabel}` : rangeLabel

  return (
    <div className="space-y-8">
      <RouteHeader
        eyebrow="التقارير المالية"
        title={title}
        actions={
          <>
            <StatementPrintMenu
              disabled={!loaded}
              canPrintCurrent={view === 'general' ? genScoped.length > 0 : viewMovements.length > 0}
              students={studentStatements}
              onPrintCurrent={() => setPrinting(true)}
              onPrintStudent={setPrintStudentId}
            />
            <Button variant="outline" onClick={() => void reload()} disabled={isLoading}>
              <RotateCw className="size-4" />
              {isLoading ? 'جارٍ التحديث…' : 'تحديث'}
            </Button>
          </>
        }
      />
      <ConfigNotice />
      <ErrorNotice message={error} onDismiss={clearError} onRetry={reload} />

      <div className="flex flex-wrap items-center gap-4 border-b border-border pb-4 md:hidden">
        <span className="text-[13px] font-medium text-muted-foreground">نوع التقرير</span>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {REPORT_VIEWS.map((item) => (
            <button key={item.id} type="button" onClick={() => navigateReport(item.id)} aria-pressed={view === item.id} className={`border-b-2 pb-1 text-[13px] font-medium ${view === item.id ? 'border-olive text-foreground' : 'border-transparent text-muted-foreground'}`}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-b border-border pb-4">
        <span className="text-[13px] font-medium text-muted-foreground">الفترة</span>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {PERIODS.map((item) => (
            <button key={item.id} type="button" onClick={() => setPeriod(item.id)} aria-pressed={period === item.id} className={`border-b-2 pb-1 text-[13px] font-medium ${period === item.id ? 'border-olive text-foreground' : 'border-transparent text-muted-foreground'}`}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'general' ? (
        <div className="flex flex-wrap items-end gap-4 border-b border-border pb-4">
          <label className="flex flex-col gap-1 text-[12px] font-medium text-muted-foreground">
            الحساب
            <select
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              className="h-9 min-w-[180px] rounded-md border border-border-strong bg-panel px-3 text-[13px] text-foreground"
            >
              <option value="">كل الحسابات</option>
              {accountOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-medium text-muted-foreground">
            من تاريخ
            <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="figure h-9 w-40" />
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-medium text-muted-foreground">
            إلى تاريخ
            <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="figure h-9 w-40" />
          </label>
          {accountName || fromDate || toDate ? (
            <button type="button" onClick={() => { setAccountName(''); setFromDate(''); setToDate('') }} className="h-9 text-[12px] font-semibold text-olive">
              مسح الفلاتر
            </button>
          ) : null}
        </div>
      ) : null}

      {view === 'general' ? (
        <GeneralSummary net={genTotals.net} totalIn={genTotals.totalIn} totalOut={genTotals.totalOut} opening={genOpening} closing={genClosing} periodLabel={generalScopeLabel} />
      ) : (
        <SidedSummary view={view} amount={view === 'receipts' ? totals.totalIn : totals.totalOut} count={viewMovements.length} periodLabel={periodLabel} />
      )}

      <section className="border-y border-border">
        <div className="flex items-baseline justify-between gap-4 border-b border-border px-1 py-4">
          <h2 className="text-base font-bold text-foreground">سجل الحركات المالية</h2>
        </div>
        {view === 'general' ? (
          // The general statement is the read-only account ledger: date, voucher
          // number, بيان, صرف, قبض and a running balance — matching the printed
          // form exactly. No per-voucher actions here; editing / cancelling /
          // printing a single voucher lives in the receipts / payments reports.
          <div className="overflow-x-auto">
            <GeneralStatementTable rows={genRows} opening={genOpening} loaded={loaded} allEmpty={movements.length === 0} />
          </div>
        ) : (
          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="overflow-x-auto">
              <MovementTable
                view={view}
                loaded={loaded}
                movements={viewMovements}
                allEmpty={movements.length === 0}
                showActions
                previewId={previewId}
                onPreview={(movement) => setPreviewId(movement.id)}
                onPrintVoucher={setPrintingVoucher}
                onEdit={handleEdit}
                onCancel={setCancelTarget}
              />
            </div>
            <VoucherPreviewPanel
              movement={previewMovement}
              onPrint={() => previewMovement && setPrintingVoucher(previewMovement)}
              onEdit={() => previewMovement && handleEdit(previewMovement)}
              onCancel={() => previewMovement && setCancelTarget(previewMovement)}
            />
          </div>
        )}
      </section>

      {printing ? (
        view === 'general' ? (
          <FinancialReportPrint view={view} title={title} net={genTotals.net} totalIn={genTotals.totalIn} totalOut={genTotals.totalOut} opening={genOpening} closing={genClosing} receiptCount={receiptCount(genScoped)} paymentCount={paymentCount(genScoped)} movements={genScoped} periodLabel={generalScopeLabel} onClose={() => setPrinting(false)} />
        ) : (
          <FinancialReportPrint view={view} title={title} net={totals.net} totalIn={totals.totalIn} totalOut={totals.totalOut} opening={opening} closing={closing} receiptCount={receiptCount(scoped)} paymentCount={paymentCount(scoped)} movements={viewMovements} periodLabel={periodLabel} onClose={() => setPrinting(false)} />
        )
      ) : null}
      {printStudent ? <StudentStatementPrint studentName={printStudent.student.name} paid={printStudent.paid} remaining={printStudent.remaining} courses={printStudent.courses} lines={statementFor(statementLines, printStudent.student.id)} onClose={() => setPrintStudentId(null)} /> : null}
      {printingVoucher ? <VoucherPrint movement={printingVoucher} onClose={() => setPrintingVoucher(null)} /> : null}
      {cancelTarget ? <CancelVoucherDialog movement={cancelTarget} onClose={() => setCancelTarget(null)} onCancelled={async () => { setCancelTarget(null); setPreviewId(null); await reload() }} /> : null}
    </div>
  )
}

// One print control offering the whole statement's scopes: the current view
// (everyone, or by type via the active tab) or a chosen student's statement.
function StatementPrintMenu({
  disabled,
  canPrintCurrent,
  students,
  onPrintCurrent,
  onPrintStudent,
}: {
  disabled: boolean
  canPrintCurrent: boolean
  students: StudentAggregate[]
  onPrintCurrent: () => void
  onPrintStudent: (studentId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const withLines = students.filter((item) => item.lineCount > 0)
  const term = query.trim()
  const filtered = term ? withLines.filter((item) => item.student.name.includes(term)) : withLines

  return (
    <div ref={ref} className="relative">
      <Button variant="quiet" onClick={() => setOpen((value) => !value)} disabled={disabled} aria-haspopup="menu" aria-expanded={open}>
        <Printer className="size-4" />
        طباعة
        <ChevronDown className={`size-3.5 transition-transform ${open ? '-rotate-180' : ''}`} />
      </Button>
      {open ? (
        <div role="menu" className="menu-in absolute end-0 z-30 mt-1 w-72 overflow-hidden rounded-xl border border-border-strong bg-panel py-1 shadow-lg">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onPrintCurrent()
              setOpen(false)
            }}
            disabled={!canPrintCurrent}
            className="flex w-full items-center px-3.5 py-2.5 text-start text-sm font-semibold text-foreground disabled:opacity-40"
          >
            طباعة الكشف الحالي
          </button>

          <div className="mt-1 flex items-center gap-1.5 border-t border-border px-3.5 pb-1 pt-2 text-[11.5px] font-semibold text-faint">
            <Users className="size-3.5" />
            كشف طالب معيّن
          </div>
          <div className="px-2.5 pb-1.5">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن طالب" className="h-9 text-[13px]" />
          </div>
          <div className="max-h-56 overflow-auto">
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <button
                  key={item.student.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onPrintStudent(item.student.id)
                    setOpen(false)
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3.5 py-2 text-start text-sm text-muted-foreground"
                >
                  <span className="truncate">{item.student.name}</span>
                  <Money value={item.remaining} currency={false} className={`text-[12px] font-semibold ${item.remaining > 0.0001 ? 'text-warn' : 'text-faint'}`} />
                </button>
              ))
            ) : (
              <p className="px-3.5 py-3 text-center text-[12.5px] text-faint">لا يوجد طلاب مطابقون.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function GeneralSummary({ net, totalIn, totalOut, opening, closing, periodLabel }: { net: number; totalIn: number; totalOut: number; opening: number; closing: number; periodLabel: string }) {
  // A simple horizontal summary row (not cards): opening, receipts, payments and
  // the closing balance side by side, so the statement's key figures read at a
  // glance while the table stays the focus. The net / period detail expands on
  // demand — starting open when the operator turned off the default collapse.
  const collapseByDefault = useSettingsStore((state) => state.settings.collapseStatementSummary)
  const [open, setOpen] = useState(!collapseByDefault)
  return (
    <section className="border-y border-border py-3.5">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
        <SummaryFigure label="الرصيد الافتتاحي" value={opening} />
        <SummaryFigure label="إجمالي المقبوضات" value={totalIn} tone="in" />
        <SummaryFigure label="إجمالي المدفوعات" value={totalOut} tone="out" />
        <SummaryFigure label="الرصيد الختامي" value={closing} strong />
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="ms-auto inline-flex items-center gap-1 text-[12px] font-semibold text-olive">
          تفاصيل الملخّص
          <ChevronDown className={`size-3.5 transition-transform ${open ? '-rotate-180' : ''}`} />
        </button>
      </div>
      {open ? (
        <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-3 text-[13px]">
          <span className="text-muted-foreground">صافي التدفّق النقديّ <Money value={net} currency={false} className={`font-semibold ${net < 0 ? 'text-clay' : 'text-foreground'}`} /></span>
          <span className="text-faint">النطاق: {periodLabel}</span>
        </div>
      ) : null}
    </section>
  )
}

function SummaryFigure({ label, value, tone = 'ink', strong = false }: { label: string; value: number; tone?: 'ink' | 'in' | 'out'; strong?: boolean }) {
  const color = tone === 'in' ? 'text-gold' : tone === 'out' ? 'text-clay' : value < 0 ? 'text-clay' : 'text-foreground'
  return (
    <div>
      <div className="text-[11px] font-medium text-faint">{label}</div>
      <Money value={value} currency={false} className={`${strong ? 'text-xl' : 'text-lg'} font-bold ${color}`} />
    </div>
  )
}

// The read-only account ledger table: date, voucher number, بيان, صرف, قبض and a
// running balance, opening-balance row first — the same shape as the printed
// statement (both use withRunningBalance) so screen and paper always agree.
function GeneralStatementTable({ rows, opening, loaded, allEmpty }: { rows: RunningMovement[]; opening: number; loaded: boolean; allEmpty: boolean }) {
  return (
    <table className="w-full min-w-[720px] border-collapse text-sm">
      <thead><tr className="text-[11px] tracking-wide text-faint">
        <th className="border-b border-border-strong px-3 py-2.5 text-start font-semibold">التاريخ</th>
        <th className="border-b border-border-strong px-3 py-2.5 text-start font-semibold">رقم السند</th>
        <th className="border-b border-border-strong px-3 py-2.5 text-start font-semibold">البيان</th>
        <th className="border-b border-border-strong px-3 py-2.5 text-end font-semibold">صرف</th>
        <th className="border-b border-border-strong px-3 py-2.5 text-end font-semibold">قبض</th>
        <th className="border-b border-border-strong px-3 py-2.5 text-end font-semibold">الرصيد الجاري</th>
      </tr></thead>
      <tbody>
        {!loaded ? (
          <tr><td colSpan={6} className="px-3 py-3"><SkeletonRows rows={5} /></td></tr>
        ) : (
          <>
            <tr>
              <td className="border-b border-border px-3 py-2.5 text-faint">—</td>
              <td className="border-b border-border px-3 py-2.5 text-faint">—</td>
              <td className="border-b border-border px-3 py-2.5 font-medium text-muted-foreground">الرصيد الافتتاحي</td>
              <td className="figure border-b border-border px-3 py-2.5 text-end text-faint">—</td>
              <td className="figure border-b border-border px-3 py-2.5 text-end text-faint">—</td>
              <td className={`figure border-b border-border px-3 py-2.5 text-end font-bold ${opening < 0 ? 'text-clay' : 'text-foreground'}`}>{formatNumber(opening)}</td>
            </tr>
            {rows.map((movement) => {
              const isReceipt = movement.movementType === 'receipt'
              return (
                <tr key={`${movement.movementType}-${movement.id}`}>
                  <td className="figure whitespace-nowrap border-b border-border px-3 py-2.5">{formatDate(movement.voucherDate)}</td>
                  <td className="figure border-b border-border px-3 py-2.5 text-muted-foreground">{formatVoucherNo(movement.voucherNumber)}</td>
                  <td className="border-b border-border px-3 py-2.5 text-muted-foreground">{partyAndContext(movement)}</td>
                  <td className={`figure border-b border-border px-3 py-2.5 text-end font-semibold ${isReceipt ? 'text-faint' : 'text-clay'}`}>{isReceipt ? '—' : formatNumber(movement.amount)}</td>
                  <td className={`figure border-b border-border px-3 py-2.5 text-end font-semibold ${isReceipt ? 'text-gold' : 'text-faint'}`}>{isReceipt ? formatNumber(movement.amount) : '—'}</td>
                  <td className={`figure border-b border-border px-3 py-2.5 text-end font-bold ${movement.runningBalance < 0 ? 'text-clay' : 'text-foreground'}`}>{formatNumber(movement.runningBalance)}</td>
                </tr>
              )
            })}
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-12 text-center text-sm text-faint">{!allEmpty ? 'لا توجد حركات ضمن هذا النطاق.' : 'لا توجد حركات مالية لعرضها.'}</td></tr>
            ) : null}
          </>
        )}
      </tbody>
    </table>
  )
}

function SidedSummary({ view, amount, count, periodLabel }: { view: Exclude<ReportView, 'general'>; amount: number; count: number; periodLabel: string }) {
  const isReceipts = view === 'receipts'
  return (
    <section className="border-y border-border py-5">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="text-[12px] font-bold tracking-wide text-olive">{isReceipts ? 'إجمالي المقبوضات' : 'إجمالي المدفوعات'} · {periodLabel}</div>
          <Money value={amount} currencyClassName="text-faint" className={`mt-2 block text-[clamp(2.2rem,5vw,3.2rem)] font-semibold leading-none ${isReceipts ? 'text-gold' : 'text-clay'}`} />
        </div>
        <BalanceFigure label={isReceipts ? 'عدد سندات القبض' : 'عدد سندات الصرف'} value={count} />
      </div>
    </section>
  )
}

function BalanceFigure({ label, value, tone = 'ink', strong = false }: { label: string; value: number; tone?: 'ink' | 'in' | 'out'; strong?: boolean }) {
  const color = tone === 'in' ? 'text-gold' : tone === 'out' ? 'text-clay' : value < 0 ? 'text-clay' : 'text-foreground'
  return (
    <div>
      <div className="text-[11px] font-medium text-faint">{label}</div>
      <Money value={value} currency={false} className={`${strong ? 'text-2xl' : 'text-xl'} font-semibold ${color}`} />
    </div>
  )
}

function MovementTable({
  view,
  loaded,
  movements,
  allEmpty,
  showActions,
  previewId,
  onPreview,
  onPrintVoucher,
  onEdit,
  onCancel,
}: {
  view: ReportView
  loaded: boolean
  movements: FinancialMovement[]
  allEmpty: boolean
  showActions: boolean
  previewId?: string | null
  onPreview?: (movement: FinancialMovement) => void
  onPrintVoucher?: (movement: FinancialMovement) => void
  onEdit?: (movement: FinancialMovement) => void
  onCancel?: (movement: FinancialMovement) => void
}) {
  const showType = view === 'general'
  const colCount = (showType ? 5 : 4) + (showActions ? 1 : 0)
  return (
    <table className={`${showActions ? 'min-w-[980px]' : 'min-w-[640px]'} w-full border-collapse text-sm`}>
      <thead><tr className="text-[11px] tracking-wide text-faint">
        {showType ? <th className="border-b border-border-strong px-3 py-2.5 text-start font-semibold">النوع</th> : null}
        <th className="border-b border-border-strong px-3 py-2.5 text-start font-semibold">رقم السند</th>
        <th className="border-b border-border-strong px-3 py-2.5 text-start font-semibold">التاريخ</th>
        <th className="border-b border-border-strong px-3 py-2.5 text-start font-semibold">البيان</th>
        <th className="border-b border-border-strong px-3 py-2.5 text-end font-semibold">المبلغ</th>
        {showActions ? <th className="border-b border-border-strong px-3 py-2.5 text-end font-semibold"><span className="sr-only">إجراءات</span></th> : null}
      </tr></thead>
      <tbody>
        {!loaded ? (
          <tr><td colSpan={colCount} className="px-3 py-3"><SkeletonRows rows={5} /></td></tr>
        ) : movements.length > 0 ? movements.map((movement) => {
          const isReceipt = movement.movementType === 'receipt'
          const selected = showActions && movement.id === previewId
          return (
            <tr key={`${movement.movementType}-${movement.id}`} className={selected ? 'bg-highlight' : ''}>
              {showType ? <td className="border-b border-border px-3 py-2.5"><span className={`inline-flex items-center gap-1.5 border px-2.5 py-0.5 text-[11.5px] font-medium ${isReceipt ? 'border-gold/30 bg-gold-weak text-gold' : 'border-clay/30 bg-clay-weak text-clay'}`}><span className={`size-1.5 ${isReceipt ? 'bg-gold' : 'bg-clay'}`} aria-hidden />{isReceipt ? 'قبض' : 'صرف'}</span></td> : null}
              <td className="figure border-b border-border px-3 py-2.5 text-muted-foreground">{formatVoucherNo(movement.voucherNumber)}</td>
              <td className="figure whitespace-nowrap border-b border-border px-3 py-2.5">{formatDate(movement.voucherDate)}</td>
              <td className="border-b border-border px-3 py-2.5 text-muted-foreground">{partyAndContext(movement)}</td>
              <td className={`figure border-b border-border px-3 py-2.5 text-end font-bold ${isReceipt ? 'text-gold' : 'text-clay'}`}>{isReceipt ? '+' : '−'}{formatNumber(movement.amount)}</td>
              {showActions ? (
                <td className="border-b border-border px-3 py-2.5"><div className="flex items-center justify-end gap-0.5">
                  <button type="button" onClick={() => onPreview?.(movement)} aria-pressed={selected} aria-label={`معاينة ${isReceipt ? 'سند القبض' : 'سند الصرف'} رقم ${formatVoucherNo(movement.voucherNumber)}`} title="معاينة" className={`p-1.5 ${selected ? 'text-olive' : 'text-faint'}`}><Eye className="size-4" /></button>
                  <button type="button" onClick={() => onPrintVoucher?.(movement)} aria-label={`طباعة ${isReceipt ? 'سند القبض' : 'سند الصرف'} رقم ${formatVoucherNo(movement.voucherNumber)}`} title="طباعة السند" className="p-1.5 text-faint"><Printer className="size-4" /></button>
                  <button type="button" onClick={() => onEdit?.(movement)} aria-label={`تعديل ${isReceipt ? 'سند القبض' : 'سند الصرف'} رقم ${formatVoucherNo(movement.voucherNumber)}`} title="تعديل السند" className="p-1.5 text-faint"><Pencil className="size-4" /></button>
                  <button type="button" onClick={() => onCancel?.(movement)} aria-label={`إبطال ${isReceipt ? 'سند القبض' : 'سند الصرف'} رقم ${formatVoucherNo(movement.voucherNumber)}`} title="إبطال السند" className="p-1.5 text-faint"><Ban className="size-4" /></button>
                </div></td>
              ) : null}
            </tr>
          )
        }) : (
          <tr><td colSpan={colCount} className="px-3 py-12 text-center text-sm text-faint">{!allEmpty ? 'لا توجد حركات في هذه الفترة.' : 'لا توجد حركات مالية لعرضها.'}</td></tr>
        )}
      </tbody>
    </table>
  )
}

function VoucherPreviewPanel({
  movement,
  onPrint,
  onEdit,
  onCancel,
}: {
  movement: FinancialMovement | null
  onPrint: () => void
  onEdit: () => void
  onCancel: () => void
}) {
  if (!movement) {
    return (
      <div className="hidden rounded-xl border border-dashed border-border-strong p-5 text-center text-sm text-faint 2xl:block">
        اختر قيدًا من السجلّ لعرض تفاصيله هنا.
      </div>
    )
  }

  const isReceipt = movement.movementType === 'receipt'
  return (
    <div className="rounded-xl border border-border-strong bg-panel p-4">
      <span className={`inline-flex items-center gap-1.5 border px-2.5 py-0.5 text-[11.5px] font-medium ${isReceipt ? 'border-gold/30 bg-gold-weak text-gold' : 'border-clay/30 bg-clay-weak text-clay'}`}>
        <span className={`size-1.5 ${isReceipt ? 'bg-gold' : 'bg-clay'}`} aria-hidden />
        {isReceipt ? 'سند قبض' : 'سند صرف'}
      </span>

      <div className="mt-3 grid gap-2 text-sm">
        <div className="flex items-center justify-between"><span className="text-muted-foreground">رقم السند</span><span className="figure font-semibold text-foreground">{formatVoucherNo(movement.voucherNumber)}</span></div>
        <div className="flex items-center justify-between"><span className="text-muted-foreground">التاريخ</span><span className="figure text-foreground">{formatDate(movement.voucherDate)}</span></div>
        <div className="flex items-center justify-between"><span className="text-muted-foreground">البيان</span><span className="max-w-[60%] truncate text-end text-foreground">{partyAndContext(movement)}</span></div>
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <div className="text-[11px] font-medium text-faint">المبلغ</div>
        <Money value={movement.amount} currency={false} className={`text-xl font-bold ${isReceipt ? 'text-gold' : 'text-clay'}`} />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Button variant="quiet" size="sm" onClick={onPrint}><Printer className="size-4" />طباعة السند</Button>
        <Button variant="quiet" size="sm" onClick={onEdit}><Pencil className="size-4" />تعديل السند</Button>
        <Button variant="destructive" size="sm" onClick={onCancel}><Ban className="size-4" />إبطال السند</Button>
      </div>
    </div>
  )
}
