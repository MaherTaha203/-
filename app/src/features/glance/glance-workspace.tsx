import { useMemo, useState } from 'react'

import { ArrowDownLeft, ChevronLeft } from 'lucide-react'

import { ConfigNotice, ErrorNotice } from '@/components/shell/notices'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/ui/money'
import { Skeleton, SkeletonRows } from '@/components/ui/skeleton'
import { aggregateStudents, attentionList, financialTotals, type StudentAggregate } from '@/lib/aggregate'
import { formatNumber } from '@/lib/format'
import { useShellStore } from '@/store/use-shell-store'
import { useWorkspaceStore } from '@/store/use-workspace-store'

const ATTENTION_LIMIT = 5
const ATTENTION_COLLAPSED = 3

// The Glance is a work entry point, not a dashboard: one cash position, a short
// attention list, and the day's actions. Figures remain derived from vouchers.
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
  const openReceiveFor = useShellStore((state) => state.openReceiveFor)
  const navigateStudents = useShellStore((state) => state.navigateStudents)

  const [previewId, setPreviewId] = useState<string | null>(null)
  const [showAllAttention, setShowAllAttention] = useState(false)

  const totals = useMemo(() => financialTotals(movements), [movements])
  const attention = useMemo(
    () => attentionList(aggregateStudents(students, statementLines)).slice(0, ATTENTION_LIMIT),
    [students, statementLines],
  )
  const visibleAttention = showAllAttention ? attention : attention.slice(0, ATTENTION_COLLAPSED)
  const preview = useMemo(
    () => (previewId ? attention.find((item) => item.student.id === previewId) ?? null : null),
    [attention, previewId],
  )

  return (
    <div className="space-y-9">
      <ConfigNotice />
      <ErrorNotice message={error} onDismiss={clearError} onRetry={reload} />

      <header className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
        <h1 className="editorial text-[clamp(1.5rem,2.6vw,1.9rem)] text-foreground">الرئيسية</h1>
        <div className="text-[11.5px] font-bold tracking-wide text-olive">أرض كنعان</div>
      </header>

      <section aria-label="الرصيد النقديّ للمركز" className="border-y border-border py-7 sm:py-8">
        <div className="text-[13px] font-medium text-muted-foreground">الرصيد النقديّ للمركز</div>
        {!loaded ? (
          <div role="status" aria-label="جارٍ التحميل">
            <Skeleton className="mt-3 h-12 w-56 md:h-14" />
            <Skeleton className="mt-5 h-4 w-44" />
          </div>
        ) : (
          <>
            <Money
              value={totals.net}
              className={`mt-2 block text-[44px] font-semibold leading-none md:text-[56px] ${
                totals.net < 0 ? 'text-clay' : 'text-foreground'
              }`}
              currencyClassName="text-[0.32em]"
            />
            <div className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-1 text-[13px] text-muted-foreground">
              <span>
                المقبوضات <Money value={totals.totalIn} currency={false} className="font-semibold text-gold" />
              </span>
              <span>
                المدفوعات <Money value={totals.totalOut} currency={false} className="font-semibold text-clay" />
              </span>
            </div>
          </>
        )}
      </section>

      <section aria-labelledby="attention-heading" className="border-b border-border pb-7 sm:pb-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="attention-heading" className="text-base font-semibold text-foreground">
            طلاب لديهم أرصدة مستحقة
          </h2>
          <button type="button" onClick={() => navigate('students')} className="text-xs font-semibold text-olive">
            دليل الطلاب
          </button>
        </div>

        <div className="mt-2">
          {!loaded ? (
            <SkeletonRows rows={3} />
          ) : attention.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_300px]">
              <div>
                {visibleAttention.map((item) => (
                  <div
                    key={item.student.id}
                    className={`flex items-center gap-3 border-b border-border py-2.5 last:border-b-0 ${item.student.id === previewId ? 'bg-highlight' : ''}`}
                  >
                    <span aria-hidden className="grid size-9 flex-none place-items-center rounded-full bg-olive-weak text-sm font-bold text-olive">
                      {item.student.name.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{item.student.name}</div>
                    <Money value={item.remaining} currency={false} className="text-sm font-bold text-warn" />
                    <Button variant="quiet" size="sm" onClick={() => setPreviewId(item.student.id)}>
                      عرض
                    </Button>
                  </div>
                ))}
                {!showAllAttention && attention.length > ATTENTION_COLLAPSED ? (
                  <button
                    type="button"
                    onClick={() => setShowAllAttention(true)}
                    className="w-full py-2.5 text-center text-xs font-semibold text-olive"
                  >
                    عرض المزيد ({attention.length - ATTENTION_COLLAPSED})
                  </button>
                ) : null}
              </div>

              <AttentionPreviewPanel
                item={preview}
                onQuickReceive={() => preview && openReceiveFor(preview.student.name)}
                onOpenStatement={() => {
                  if (!preview) return
                  selectStudent(preview.student.id)
                  navigateStudents('statement')
                }}
              />
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-faint">لا توجد أرصدة مستحقة.</p>
          )}
        </div>
      </section>
    </div>
  )
}

function AttentionPreviewPanel({
  item,
  onQuickReceive,
  onOpenStatement,
}: {
  item: StudentAggregate | null
  onQuickReceive: () => void
  onOpenStatement: () => void
}) {
  if (!item) {
    return (
      <div className="hidden rounded-xl border border-dashed border-border-strong p-5 text-center text-sm text-faint md:block">
        اختر طالبًا من القائمة لعرض ملخّص حسابه هنا.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border-strong bg-panel p-4">
      <div className="flex items-center gap-3">
        <span aria-hidden className="editorial grid size-11 flex-none place-items-center rounded-full bg-olive text-lg text-white">{item.student.name.charAt(0)}</span>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-foreground">{item.student.name}</div>
          <div className="text-[12px] text-muted-foreground">رصيد مستحق على {formatNumber(item.courses)} دورة</div>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <div className="text-[11px] font-medium text-faint">الرصيد المستحق</div>
        <Money value={item.remaining} currency={false} className="text-xl font-bold text-warn" />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Button variant="gold" size="sm" onClick={onQuickReceive}>
          <ArrowDownLeft className="size-4" />
          تسجيل دفعة
        </Button>
        <Button variant="quiet" size="sm" onClick={onOpenStatement}>
          <ChevronLeft className="size-4" />
          فتح الكشف الكامل
        </Button>
      </div>
    </div>
  )
}
