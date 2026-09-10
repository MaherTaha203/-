import { useEffect, useLayoutEffect, useState } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowUpRight } from 'lucide-react'
import { useForm, type DefaultValues } from 'react-hook-form'

import { ActionSheet } from '@/components/shell/action-sheet'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { VoucherPrint } from '@/features/print/voucher-print'
import { paymentVoucherFormSchema, type PaymentVoucherFormValues } from '@/features/payment-voucher/schema'
import { formatNumber, todayIsoDate } from '@/lib/format'
import { useMoneyOutStore } from '@/store/use-money-out-store'
import { useSettingsStore } from '@/store/use-settings-store'
import { useShellStore } from '@/store/use-shell-store'
import { useToastStore } from '@/components/ui/use-toast-store'
import { useVoucherAdminStore } from '@/store/use-voucher-admin-store'
import { useWorkspaceStore } from '@/store/use-workspace-store'
import type { FinancialMovement } from '@/types/domain'

function buildDefaults(): DefaultValues<PaymentVoucherFormValues> {
  // Amount starts empty (not 0) so typing doesn't produce a leading zero like
  // "0500"; the input shows a grey "0" placeholder instead.
  return { paymentDate: todayIsoDate(), expenseType: '', amount: undefined, notes: '' }
}

export function PaymentSheet() {
  const closeOverlay = useShellStore((state) => state.closeOverlay)
  const editVoucherId = useShellStore((state) => state.editVoucherId)
  const isEdit = Boolean(editVoucherId)
  const savePaymentVoucher = useMoneyOutStore((state) => state.savePaymentVoucher)
  const isSaving = useMoneyOutStore((state) => state.isSaving)
  const error = useMoneyOutStore((state) => state.error)
  const clearError = useMoneyOutStore((state) => state.clearError)
  const fetchPayment = useVoucherAdminStore((state) => state.fetchPayment)
  const updatePayment = useVoucherAdminStore((state) => state.updatePayment)
  const adminBusy = useVoucherAdminStore((state) => state.isBusy)
  const adminError = useVoucherAdminStore((state) => state.error)
  const clearAdminError = useVoucherAdminStore((state) => state.clearError)
  const reloadWorkspace = useWorkspaceStore((state) => state.load)
  const currencySymbol = useSettingsStore((state) => state.settings.currencySymbol)
  const maxAmount = useSettingsStore((state) => state.settings.maxVoucherAmount)
  const blockFutureDate = useSettingsStore((state) => state.settings.blockFutureDate)
  const maxDate = blockFutureDate ? todayIsoDate() : undefined
  const [loadingEdit, setLoadingEdit] = useState(isEdit)
  const [savedVoucher, setSavedVoucher] = useState<FinancialMovement | null>(null)

  const form = useForm<PaymentVoucherFormValues>({ resolver: zodResolver(paymentVoucherFormSchema), defaultValues: buildDefaults() })

  useLayoutEffect(() => { clearError(); clearAdminError() }, [clearError, clearAdminError])

  useEffect(() => {
    if (!editVoucherId) return
    let active = true
    void (async () => {
      const data = await fetchPayment(editVoucherId)
      if (!active) return
      if (data) form.reset({ paymentDate: data.paymentDate, expenseType: data.expenseType, amount: data.amount, notes: data.notes })
      setLoadingEdit(false)
    })()
    return () => { active = false }
  }, [editVoucherId, fetchPayment, form])

  async function onSubmit(values: PaymentVoucherFormValues) {
    if (isEdit && editVoucherId) {
      const ok = await updatePayment(editVoucherId, values)
      if (!ok) return
      await reloadWorkspace()
      useToastStore.getState().show('تم حفظ التعديل')
      closeOverlay()
      return
    }

    // Soft data-entry guard against a fat-fingered extra zero; the DB financial
    // firewall remains the authoritative limit.
    if (values.amount > maxAmount) {
      form.setError('amount', { message: `المبلغ أكبر من الحدّ المسموح (${formatNumber(maxAmount)})` })
      return
    }

    const saved = await savePaymentVoucher(values)
    if (!saved) return
    await reloadWorkspace()
    const latestVoucher = useMoneyOutStore.getState().vouchers.at(-1)
    if (latestVoucher) {
      setSavedVoucher({ id: latestVoucher.id, movementType: 'payment', voucherNumber: latestVoucher.voucherNumber, voucherDate: latestVoucher.voucherDate, amount: latestVoucher.amount, partyName: null, context: latestVoucher.expenseType })
    }
    useToastStore.getState().show('رُحّل سند الصرف بنجاح')
  }

  const busy = isEdit ? adminBusy : isSaving
  const showError = error || adminError

  if (loadingEdit) {
    return <ActionSheet title="تعديل سند صرف" onClose={closeOverlay}><p className="py-10 text-center text-sm text-faint">جارٍ تحميل السند…</p></ActionSheet>
  }

  return (
    <>
      <ActionSheet title={isEdit ? 'تعديل سند صرف' : 'سند صرف'} onClose={closeOverlay}>
        {showError ? <div role="alert" className="mb-4 rounded-xl border border-clay/25 bg-clay-weak px-4 py-3 text-sm text-clay">{isEdit ? adminError ?? 'تعذّر حفظ التعديل.' : error ?? 'تعذّر حفظ السند.'}</div> : null}
        {savedVoucher ? <div className="py-3"><p className="mb-4 text-center text-sm font-semibold text-foreground">تم حفظ السند</p><Button type="button" variant="outline" className="w-full" onClick={closeOverlay}>إغلاق بعد الطباعة</Button></div> : (
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <Field label="بند المصروف" error={form.formState.errors.expenseType?.message}>{(control) => <Input placeholder="مثال: إيجار، كهرباء، رواتب" readOnly={isEdit} {...control} {...form.register('expenseType')} />}</Field>
            <Field label="المبلغ المدفوع" error={form.formState.errors.amount?.message}>{(control) => <div className="flex items-center gap-2 rounded-xl border border-clay/30 bg-clay-weak/40 px-4 py-1 focus-within:border-clay"><input type="number" min="1" step="1" inputMode="numeric" readOnly={isEdit} className="figure h-12 w-full bg-transparent text-2xl font-semibold text-foreground outline-none placeholder:text-faint" placeholder="0" {...control} {...form.register('amount', { valueAsNumber: true })} /><span className="text-sm font-medium text-muted-foreground">{currencySymbol}</span></div>}</Field>
            <Field label="تاريخ الدفع" error={form.formState.errors.paymentDate?.message}>{(control) => <Input type="date" max={maxDate} readOnly={isEdit} className="figure" {...control} {...form.register('paymentDate')} />}</Field>
            <Field label="الملاحظات" error={form.formState.errors.notes?.message}>{(control) => <Textarea placeholder="ملاحظات اختيارية" {...control} {...form.register('notes')} />}</Field>
            <Button type="submit" size="lg" variant="default" className="w-full" disabled={busy}><ArrowUpRight className="size-4" />{busy ? 'جارٍ الحفظ…' : isEdit ? 'حفظ التعديل' : 'حفظ سند الصرف'}</Button>
          </form>
        )}
      </ActionSheet>
      {savedVoucher ? <VoucherPrint movement={savedVoucher} onClose={closeOverlay} /> : null}
    </>
  )
}
