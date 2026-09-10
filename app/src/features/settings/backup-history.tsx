import { useCallback, useEffect, useState } from 'react'

import { RefreshCw } from 'lucide-react'

import { formatNumber, formatTimestamp } from '@/lib/format'
import { getSupabaseBrowserClient } from '@/lib/supabase'

// One backup/restore event as recorded in the audit log. The history is read-only
// and built entirely from real logged events — nothing here is synthesized.
type BackupEventRow = {
  id: string
  action: string
  actor_email: string | null
  changed_at: string
  source: string | null
  metadata: { students?: number; vouchers?: number } | null
}

const HISTORY_LIMIT = 200

function count(value: unknown): string {
  return typeof value === 'number' ? formatNumber(value) : '—'
}

export function BackupHistory() {
  const [rows, setRows] = useState<BackupEventRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      setError('الاتصال بقاعدة البيانات غير مهيأ بعد.')
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    const { data, error: queryError } = await supabase
      .from('audit_log')
      .select('id, action, actor_email, changed_at, source, metadata')
      .or('entity.eq.backup,action.eq.restore')
      .order('changed_at', { ascending: false })
      .range(0, HISTORY_LIMIT - 1)

    if (queryError) {
      console.error('backup history load failed', queryError)
      setError('تعذّر تحميل سجلّ النسخ الاحتياطي.')
      setRows([])
    } else {
      setRows((data ?? []) as BackupEventRow[])
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(task)
  }, [load])

  return (
    <section className="border-t border-border pt-6">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-base font-bold text-foreground">سجلّ النسخ الاحتياطي</h2>
        <button
          type="button"
          onClick={() => void load()}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-olive disabled:opacity-50"
        >
          <RefreshCw className="size-3.5" />
          تحديث
        </button>
      </div>

      {error ? (
        <p role="alert" className="border-y border-border py-4 text-sm text-clay">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="text-[11px] tracking-wide text-faint">
              <th className="border-b border-border-strong px-3 py-2.5 text-start font-semibold">التاريخ</th>
              <th className="border-b border-border-strong px-3 py-2.5 text-start font-semibold">الوقت</th>
              <th className="border-b border-border-strong px-3 py-2.5 text-start font-semibold">النوع</th>
              <th className="border-b border-border-strong px-3 py-2.5 text-end font-semibold">الطلاب</th>
              <th className="border-b border-border-strong px-3 py-2.5 text-end font-semibold">السندات</th>
              <th className="border-b border-border-strong px-3 py-2.5 text-start font-semibold">بواسطة</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-faint">جارٍ تحميل السجلّ…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-faint">لا توجد نسخ احتياطيّة مسجّلة بعد.</td>
              </tr>
            ) : (
              rows.map((row) => {
                const { date, time } = formatTimestamp(row.changed_at)
                const isExport = row.action === 'export'
                return (
                  <tr key={row.id} className="border-b border-border last:border-b-0">
                    <td className="figure whitespace-nowrap border-b border-border px-3 py-2.5">{date}</td>
                    <td className="figure whitespace-nowrap border-b border-border px-3 py-2.5">{time}</td>
                    <td className="border-b border-border px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1.5 border px-2.5 py-0.5 text-[11.5px] font-medium ${isExport ? 'border-gold/30 bg-gold-weak text-gold' : 'border-olive/30 bg-olive-weak text-olive'}`}>
                        {isExport ? 'تصدير' : 'استعادة'}
                      </span>
                    </td>
                    <td className="figure border-b border-border px-3 py-2.5 text-end text-muted-foreground">{count(row.metadata?.students)}</td>
                    <td className="figure border-b border-border px-3 py-2.5 text-end text-muted-foreground">{count(row.metadata?.vouchers)}</td>
                    <td className="border-b border-border px-3 py-2.5 text-muted-foreground" dir="ltr">{row.actor_email ?? 'المالك'}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
