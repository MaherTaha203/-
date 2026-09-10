import { useMemo, useState } from 'react'

import { Ban, Eye, Pencil, Printer, RotateCw } from 'lucide-react'

import { ConfigNotice, ErrorNotice } from '@/components/shell/notices'
import { RouteHeader } from '@/components/shell/route-header'
import { FinancialReportPrint } from '@/features/print/financial-report-print'
import { VoucherPrint } from '@/features/print/voucher-print'
import { CancelVoucherDialog } from '@/features/financial-report/cancel-voucher-dialog'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/ui/money'
import { SkeletonRows } from '@/components/ui/skeleton'
import { financialTotals, movementsNewestFirst, paymentCount, receiptCount } from '@/lib/aggregate'
import { formatDate, formatNumber } from '@/lib/format'
import { formatVoucherNo } from '@/lib/voucher'
import type { FinancialMovement } from '@/types/domain'
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
  const isLoading = useWorkspaceStore((state) => state.isLoading)
  const loaded = useWorkspaceStore((state) => state.loaded)
  const error = useWorkspaceStore((state) => state.error)
  const clearError = useWorkspaceStore((state) => state.clearError)
  const reload = useWorkspaceStore((state) => state.load)
  const view = useShellStore((state) => state.reportView)
  const navigateReport = useShellStore((state) => state.navigateReport)
  const openEditReceipt = useShellStore((state) => state.openEditReceipt)
  const openEditPayment = useShellStore((state) => state.openEditPayment)
  const [period, setPeriod] = useState<Period>('all')
  const [printing, setPrinting] = useState(false)
  const [printingVoucher, setPrintingVoucher] = useState<FinancialMovement | null>(null)
  const [cancelTarget, setCancelTarget] = useState<FinancialMovement | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)

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

  return (
    <div className="space-y-8">
      <RouteHeader
        eyebrow="التقارير المالية"
        title={title}
        actions={
          <>
            <Button variant="quiet" onClick={() => setPrinting(true)} disabled={!loaded || viewMovements.length === 0}>
              <Printer className="size-4" />
              طباعة
            </Button>
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
        <GeneralSummary net={totals.net} totalIn={totals.totalIn} totalOut={totals.totalOut} opening={opening} closing={closing} periodLabel={periodLabel} />
      ) : (
        <SidedSummary view={view} amount={view === 'receipts' ? totals.totalIn : totals.totalOut} count={viewMovements.length} periodLabel={periodLabel} />
      )}

      <section className="border-y border-border">
        <div className="flex items-baseline justify-between gap-4 border-b border-border px-1 py-4">
          <h2 className="text-base font-bold text-foreground">سجل الحركات المالية</h2>
          <span className="text-[12px] text-faint">من الأحدث</span>
        </div>
        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="overflow-x-auto">
            <MovementTable
              view={view}
              loaded={loaded}
              movements={viewMovements}
              allEmpty={movements.length === 0}
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
      </section>

      {printing ? <FinancialReportPrint view={view} title={title} net={totals.net} totalIn={totals.totalIn} totalOut={totals.totalOut} opening={opening} closing={closing} receiptCount={receiptCount(scoped)} paymentCount={paymentCount(scoped)} movements={viewMovements} periodLabel={periodLabel} onClose={() => setPrinting(false)} /> : null}
      {printingVoucher ? <VoucherPrint movement={printingVoucher} onClose={() => setPrintingVoucher(null)} /> : null}
      {cancelTarget ? <CancelVoucherDialog movement={cancelTarget} onClose={() => setCancelTarget(null)} onCancelled={async () => { setCancelTarget(null); setPreviewId(null); await reload() }} /> : null}
    </div>
  )
}

function GeneralSummary({ net, totalIn, totalOut, opening, closing, periodLabel }: { net: number; totalIn: number; totalOut: number; opening: number; closing: number; periodLabel: string }) {
  // One clear hero (the closing balance), two coloured totals, and a proportion
  // bar — hierarchy over a flat row of five equal figures.
  const flow = totalIn + totalOut
  const inPct = flow > 0 ? Math.round((totalIn / flow) * 100) : 0
  return (
    <section className="border-y border-border py-6">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-base font-bold text-foreground">ملخص الفترة</h2>
        <span className="text-[12px] text-faint">{periodLabel}</span>
      </div>

      <div className="text-[11.5px] font-medium text-faint">الرصيد الختاميّ</div>
      <Money
        value={closing}
        currencyClassName="text-[0.34em] text-faint"
        className={`mt-1 block text-[clamp(2.2rem,5vw,3.2rem)] font-semibold leading-none ${closing < 0 ? 'text-clay' : 'text-foreground'}`}
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-gold/25 bg-gold-weak/50 p-4">
          <div className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground"><span className="size-2 rounded-sm bg-gold" aria-hidden />إجمالي المقبوضات</div>
          <Money value={totalIn} currency={false} className="mt-1.5 block text-2xl font-bold text-gold" />
        </div>
        <div className="rounded-xl border border-clay/25 bg-clay-weak/50 p-4">
          <div className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground"><span className="size-2 rounded-sm bg-clay" aria-hidden />إجمالي المدفوعات</div>
          <Money value={totalOut} currency={false} className="mt-1.5 block text-2xl font-bold text-clay" />
        </div>
      </div>

      <div className="mt-5">
        <div className={`flex h-2 overflow-hidden rounded-full ${totalOut > 0 ? 'bg-clay/70' : 'bg-border'}`} aria-hidden>
          <div className="h-full rounded-full bg-gold" style={{ width: `${inPct}%` }} />
        </div>
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-[12.5px] text-muted-foreground">
          <span>صافي التدفّق النقديّ <Money value={net} currency={false} className={`font-semibold ${net < 0 ? 'text-clay' : 'text-foreground'}`} /></span>
          <span>الرصيد الافتتاحيّ <Money value={opening} currency={false} className="font-semibold text-foreground" /></span>
        </div>
      </div>
    </section>
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
  previewId: string | null
  onPreview: (movement: FinancialMovement) => void
  onPrintVoucher: (movement: FinancialMovement) => void
  onEdit: (movement: FinancialMovement) => void
  onCancel: (movement: FinancialMovement) => void
}) {
  const showType = view === 'general'
  const colCount = (showType ? 5 : 4) + 1
  return (
    <table className="min-w-[980px] w-full border-collapse text-sm">
      <thead><tr className="text-[11px] tracking-wide text-faint">
        {showType ? <th className="border-b border-border-strong px-3 py-2.5 text-start font-semibold">النوع</th> : null}
        <th className="border-b border-border-strong px-3 py-2.5 text-start font-semibold">رقم السند</th>
        <th className="border-b border-border-strong px-3 py-2.5 text-start font-semibold">التاريخ</th>
        <th className="border-b border-border-strong px-3 py-2.5 text-start font-semibold">البيان</th>
        <th className="border-b border-border-strong px-3 py-2.5 text-end font-semibold">المبلغ</th>
        <th className="border-b border-border-strong px-3 py-2.5 text-end font-semibold"><span className="sr-only">إجراءات</span></th>
      </tr></thead>
      <tbody>
        {!loaded ? (
          <tr><td colSpan={colCount} className="px-3 py-3"><SkeletonRows rows={5} /></td></tr>
        ) : movements.length > 0 ? movements.map((movement) => {
          const isReceipt = movement.movementType === 'receipt'
          const selected = movement.id === previewId
          return (
            <tr key={`${movement.movementType}-${movement.id}`} className={selected ? 'bg-highlight' : ''}>
              {showType ? <td className="border-b border-border px-3 py-2.5"><span className={`inline-flex items-center gap-1.5 border px-2.5 py-0.5 text-[11.5px] font-medium ${isReceipt ? 'border-gold/30 bg-gold-weak text-gold' : 'border-clay/30 bg-clay-weak text-clay'}`}><span className={`size-1.5 ${isReceipt ? 'bg-gold' : 'bg-clay'}`} aria-hidden />{isReceipt ? 'قبض' : 'صرف'}</span></td> : null}
              <td className="figure border-b border-border px-3 py-2.5 text-muted-foreground">{formatVoucherNo(movement.voucherNumber)}</td>
              <td className="border-b border-border px-3 py-2.5">{formatDate(movement.voucherDate)}</td>
              <td className="border-b border-border px-3 py-2.5 text-muted-foreground">{partyAndContext(movement)}</td>
              <td className={`figure border-b border-border px-3 py-2.5 text-end font-bold ${isReceipt ? 'text-gold' : 'text-clay'}`}>{isReceipt ? '+' : '−'}{formatNumber(movement.amount)}</td>
              <td className="border-b border-border px-3 py-2.5"><div className="flex items-center justify-end gap-0.5">
                <button type="button" onClick={() => onPreview(movement)} aria-pressed={selected} aria-label={`معاينة ${isReceipt ? 'سند القبض' : 'سند الصرف'} رقم ${formatVoucherNo(movement.voucherNumber)}`} title="معاينة" className={`p-1.5 ${selected ? 'text-olive' : 'text-faint'}`}><Eye className="size-4" /></button>
                <button type="button" onClick={() => onPrintVoucher(movement)} aria-label={`طباعة ${isReceipt ? 'سند القبض' : 'سند الصرف'} رقم ${formatVoucherNo(movement.voucherNumber)}`} title="طباعة السند" className="p-1.5 text-faint"><Printer className="size-4" /></button>
                <button type="button" onClick={() => onEdit(movement)} aria-label={`تعديل ${isReceipt ? 'سند القبض' : 'سند الصرف'} رقم ${formatVoucherNo(movement.voucherNumber)}`} title="تعديل السند" className="p-1.5 text-faint"><Pencil className="size-4" /></button>
                <button type="button" onClick={() => onCancel(movement)} aria-label={`إبطال ${isReceipt ? 'سند القبض' : 'سند الصرف'} رقم ${formatVoucherNo(movement.voucherNumber)}`} title="إبطال السند" className="p-1.5 text-faint"><Ban className="size-4" /></button>
              </div></td>
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
