import { useMemo } from 'react'

import { User } from 'lucide-react'

import { ConfigNotice, ErrorNotice } from '@/components/shell/notices'
import { Money } from '@/components/ui/money'
import { Skeleton, SkeletonRows } from '@/components/ui/skeleton'
import { aggregateStudents, attentionList, financialTotals, movementsNewestFirst } from '@/lib/aggregate'
import { formatDate, formatNumber } from '@/lib/format'
import type { FinancialMovement } from '@/types/domain'
import { useSettingsStore } from '@/store/use-settings-store'
import { useShellStore } from '@/store/use-shell-store'
import { useWorkspaceStore } from '@/store/use-workspace-store'

const RECENT_LIMIT = 6

function todayLong(): string {
  return new Intl.DateTimeFormat('en-US', {
    numberingSystem: 'latn',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
}

function statement(movement: FinancialMovement): string {
  const party = movement.movementType === 'receipt' ? movement.partyName ?? '—' : 'المركز'
  return movement.context ? `${party} · ${movement.context}` : party
}

// The home page: a quick read of the centre's position — cash on hand, today's
// date, the latest movements, and students who still owe. Plain and text-first;
// the only icons are the student marks.
export function GlanceWorkspace() {
  const students = useWorkspaceStore((state) => state.students)
  const statementLines = useWorkspaceStore((state) => state.statementLines)
  const movements = useWorkspaceStore((state) => state.movements)
  const loaded = useWorkspaceStore((state) => state.loaded)
  const error = useWorkspaceStore((state) => state.error)
  const clearError = useWorkspaceStore((state) => state.clearError)
  const reload = useWorkspaceStore((state) => state.load)

  const navigate = useShellStore((state) => state.navigate)
  const selectStudent = useShellStore((state) => state.selectStudent)
  const attentionCount = useSettingsStore((state) => state.settings.attentionCount)

  const totals = useMemo(() => financialTotals(movements), [movements])
  const recent = useMemo(() => movementsNewestFirst(movements).slice(0, RECENT_LIMIT), [movements])
  const attention = useMemo(
    () => attentionList(aggregateStudents(students, statementLines)).slice(0, attentionCount),
    [students, statementLines, attentionCount],
  )

  return (
    <div className="space-y-6">
      <ConfigNotice />
      <ErrorNotice message={error} onDismiss={clearError} onRetry={reload} />

      <header>
        <h1 className="editorial text-[clamp(1.6rem,3vw,2.1rem)] text-foreground">مرحبًا بك في أرض كنعان</h1>
      </header>

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="الرصيد النقديّ للمركز" className="rounded-2xl border border-border bg-panel px-6 py-6">
          <div className="text-[13px] font-medium text-muted-foreground">الرصيد النقديّ الحالي</div>
          {!loaded ? (
            <Skeleton className="mt-3 h-11 w-48" />
          ) : (
            <>
              <Money
                value={totals.net}
                className={`mt-2 block text-[40px] font-semibold leading-none ${totals.net < 0 ? 'text-clay' : 'text-foreground'}`}
                currencyClassName="text-[0.34em]"
              />
              <div className="mt-5 flex flex-wrap gap-x-8 gap-y-1 text-[13px] text-muted-foreground">
                <span>المقبوضات <Money value={totals.totalIn} currency={false} className="font-semibold text-gold" /></span>
                <span>المدفوعات <Money value={totals.totalOut} currency={false} className="font-semibold text-clay" /></span>
              </div>
            </>
          )}
        </section>

        <section aria-label="تاريخ اليوم" className="rounded-2xl border border-border bg-panel px-6 py-6">
          <div className="text-[13px] font-medium text-muted-foreground">التاريخ اليوم</div>
          <div className="figure mt-2 text-2xl font-semibold text-foreground">{todayLong()}</div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="recent-heading" className="rounded-2xl border border-border bg-panel">
          <div className="flex items-baseline justify-between gap-4 border-b border-border px-5 py-4">
            <h2 id="recent-heading" className="text-base font-bold text-foreground">آخر العمليات</h2>
            <button type="button" onClick={() => navigate('report')} className="text-xs font-semibold text-olive">عرض الكل</button>
          </div>
          <div className="overflow-x-auto">
            {!loaded ? (
              <div className="p-4"><SkeletonRows rows={5} /></div>
            ) : recent.length > 0 ? (
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead><tr className="text-[11px] tracking-wide text-faint">
                  <th className="border-b border-border px-4 py-2.5 text-start font-semibold">التاريخ</th>
                  <th className="border-b border-border px-4 py-2.5 text-start font-semibold">النوع</th>
                  <th className="border-b border-border px-4 py-2.5 text-start font-semibold">البيان</th>
                  <th className="border-b border-border px-4 py-2.5 text-end font-semibold">المبلغ</th>
                  <th className="border-b border-border px-4 py-2.5 text-start font-semibold">الحالة</th>
                </tr></thead>
                <tbody>
                  {recent.map((movement) => {
                    const isReceipt = movement.movementType === 'receipt'
                    return (
                      <tr key={`${movement.movementType}-${movement.id}`}>
                        <td className="figure whitespace-nowrap border-b border-border px-4 py-2.5">{formatDate(movement.voucherDate)}</td>
                        <td className="border-b border-border px-4 py-2.5">
                          <span className={isReceipt ? 'text-gold' : 'text-clay'}>{isReceipt ? 'سند قبض' : 'سند صرف'}</span>
                        </td>
                        <td className="border-b border-border px-4 py-2.5 text-muted-foreground">{statement(movement)}</td>
                        <td className={`figure border-b border-border px-4 py-2.5 text-end font-bold ${isReceipt ? 'text-gold' : 'text-clay'}`}>{isReceipt ? '+' : '−'}{formatNumber(movement.amount)}</td>
                        <td className="border-b border-border px-4 py-2.5">
                          <span className="inline-flex border border-gold/25 bg-gold-weak px-2.5 py-0.5 text-[11px] font-medium text-gold">مُرحَّل</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-faint">لا توجد عمليات بعد.</p>
            )}
          </div>
        </section>

        <section aria-labelledby="attention-heading" className="rounded-2xl border border-border bg-panel">
          <div className="flex items-baseline justify-between gap-4 border-b border-border px-5 py-4">
            <h2 id="attention-heading" className="text-base font-bold text-foreground">طلاب لديهم أرصدة مستحقة</h2>
            <button type="button" onClick={() => navigate('students')} className="text-xs font-semibold text-olive">عرض الطلاب</button>
          </div>
          <div className="px-2 py-1.5">
            {!loaded ? (
              <div className="p-3"><SkeletonRows rows={3} /></div>
            ) : attention.length > 0 ? (
              attention.map((item) => (
                <button
                  key={item.student.id}
                  type="button"
                  onClick={() => selectStudent(item.student.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start hover:bg-highlight"
                >
                  <span aria-hidden className="grid size-9 flex-none place-items-center rounded-full bg-olive-weak text-olive">
                    <User className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{item.student.name}</span>
                    <span className="text-[11px] font-medium text-warn">مستحق</span>
                  </span>
                  <Money value={item.remaining} currency={false} className="text-sm font-bold text-warn" />
                </button>
              ))
            ) : (
              <p className="px-3 py-8 text-center text-sm text-faint">لا توجد أرصدة مستحقة.</p>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-panel px-6 py-5">
        <p className="text-[15px] font-semibold text-foreground">الالتزام الماليّ … أساس الاستمراريّة</p>
        <p className="mt-1 text-[12px] font-bold tracking-wide text-olive">أرض كنعان</p>
      </section>
    </div>
  )
}
