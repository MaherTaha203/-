import { useState } from 'react'

import { ActionSheet } from '@/components/shell/action-sheet'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { Money } from '@/components/ui/money'
import { formatDate } from '@/lib/format'
import { formatVoucherNo, voucherTypeLabel } from '@/lib/voucher'
import type { FinancialMovement } from '@/types/domain'
import { useToastStore } from '@/components/ui/use-toast-store'
import { useSettingsStore } from '@/store/use-settings-store'
import { useVoucherAdminStore } from '@/store/use-voucher-admin-store'

// Kept when the operator turns off "اشتراط سبب عند الإبطال": the audit trail must
// still carry a reason, so a blank one is recorded as this rather than rejected.
const UNSPECIFIED_REASON = 'إبطال بدون سبب محدّد'

type CancelVoucherDialogProps = {
  movement: FinancialMovement
  onClose: () => void
  onCancelled: () => void | Promise<void>
}

/**
 * Confirms cancelling a voucher. Cancelling never deletes: the voucher keeps its
 * number, drops out of active totals, and stays reviewable. A reason is mandatory
 * and the audit log captures who/when server-side.
 */
export function CancelVoucherDialog({ movement, onClose, onCancelled }: CancelVoucherDialogProps) {
  const cancelVoucher = useVoucherAdminStore((state) => state.cancelVoucher)
  const isBusy = useVoucherAdminStore((state) => state.isBusy)
  const error = useVoucherAdminStore((state) => state.error)
  const requireReason = useSettingsStore((state) => state.settings.requireCancelReason)
  const doubleConfirm = useSettingsStore((state) => state.settings.doubleConfirmCancel)
  const [reason, setReason] = useState('')
  const [armed, setArmed] = useState(false)

  const typeLabel = voucherTypeLabel(movement.movementType)
  const reasonMissing = requireReason && !reason.trim()

  async function handleConfirm() {
    if (reasonMissing) return
    // A second, deliberate press is required when the operator enabled the extra
    // confirmation guard.
    if (doubleConfirm && !armed) {
      setArmed(true)
      return
    }
    const finalReason = reason.trim() || UNSPECIFIED_REASON
    const ok = await cancelVoucher(movement.movementType, movement.id, finalReason)
    if (!ok) {
      setArmed(false)
      return
    }
    useToastStore.getState().show('تم إبطال السند')
    await onCancelled()
  }

  return (
    <ActionSheet title={`إبطال ${typeLabel}`} onClose={onClose}>
      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-clay/25 bg-clay-weak px-4 py-3 text-sm text-clay"
        >
          {error}
        </div>
      ) : null}

      <div className="mb-5 rounded-xl border border-border bg-highlight/60 p-4 text-sm">
        <div className="flex items-center justify-between py-1">
          <span className="text-muted-foreground">رقم السند</span>
          <span className="figure font-semibold text-foreground">
            {formatVoucherNo(movement.voucherNumber)}
          </span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-muted-foreground">التاريخ</span>
          <span className="figure text-foreground">{formatDate(movement.voucherDate)}</span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-muted-foreground">المبلغ</span>
          <Money
            value={movement.amount}
            currency={false}
            className={`font-semibold ${movement.movementType === 'receipt' ? 'text-gold' : 'text-clay'}`}
          />
        </div>
      </div>

      <p className="mb-4 text-[13px] leading-6 text-muted-foreground">
        لا يُحذف السند؛ يبقى برقمه ويخرج من الإجماليات، ويظل متاحًا للمراجعة.
      </p>

      <Field
        label={requireReason ? 'سبب الإبطال' : 'سبب الإبطال (اختياري)'}
        error={reasonMissing ? 'سبب الإبطال مطلوب' : undefined}
      >
        {(control) => (
          <Textarea
            placeholder="اكتب سبب الإبطال"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              setArmed(false)
            }}
            {...control}
          />
        )}
      </Field>

      {armed ? (
        <p className="mt-4 rounded-xl border border-clay/30 bg-clay-weak px-4 py-3 text-sm font-medium text-clay">
          اضغط «تأكيد الإبطال» مرّة أخرى لإتمام العمليّة.
        </p>
      ) : null}

      <div className="mt-6 flex gap-3">
        <Button
          variant="destructive"
          className="flex-1"
          onClick={handleConfirm}
          disabled={isBusy || reasonMissing}
        >
          {isBusy ? 'جارٍ الإبطال…' : armed ? 'تأكيد الإبطال نهائيًّا' : 'تأكيد الإبطال'}
        </Button>
        <Button variant="quiet" onClick={onClose} disabled={isBusy}>
          تراجع
        </Button>
      </div>
    </ActionSheet>
  )
}
