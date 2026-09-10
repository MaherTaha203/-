import { useEffect, useLayoutEffect, useState } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDownLeft } from 'lucide-react'
import { useForm, type DefaultValues } from 'react-hook-form'

import { ActionSheet } from '@/components/shell/action-sheet'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { VoucherPrint } from '@/features/print/voucher-print'
import { receiptVoucherFormSchema, type ReceiptVoucherFormValues } from '@/features/receipt-voucher/schema'
import { StudentPicker } from '@/features/receipt-voucher/student-picker'
import { todayIsoDate } from '@/lib/format'
import { useMoneyInStore } from '@/store/use-money-in-store'
import { useShellStore } from '@/store/use-shell-store'
import { useToastStore } from '@/components/ui/use-toast-store'
import { useVoucherAdminStore } from '@/store/use-voucher-admin-store'
import { useWorkspaceStore } from '@/store/use-workspace-store'
import type { FinancialMovement } from '@/types/domain'

function buildDefaults(studentName: string | null): DefaultValues<ReceiptVoucherFormValues> {
  // Amount fields start empty (not 0) so typing doesn't produce a leading zero
  // like "0500"; the input shows a grey "0" placeholder instead.
  return { paymentDate: todayIsoDate(), studentName: studentName ?? '', studentId: '', studentIdNumber: '', studentPhone: '', courseName: '', courseValue: undefined, amountReceived: undefined, payerName: '', notes: '' }
}

export function ReceiptSheet() {
  const closeOverlay = useShellStore((state) => state.closeOverlay)
  const selectStudent = useShellStore((state) => state.selectStudent)
  const prefillName = useShellStore((state) => state.receivePrefillName)
  const editVoucherId = useShellStore((state) => state.editVoucherId)
  const isEdit = Boolean(editVoucherId)
  const saveReceiptVoucher = useMoneyInStore((state) => state.saveReceiptVoucher)
  const isSaving = useMoneyInStore((state) => state.isSaving)
  const error = useMoneyInStore((state) => state.error)
  const clearError = useMoneyInStore((state) => state.clearError)
  const fetchReceipt = useVoucherAdminStore((state) => state.fetchReceipt)
  const updateReceipt = useVoucherAdminStore((state) => state.updateReceipt)
  const adminBusy = useVoucherAdminStore((state) => state.isBusy)
  const adminError = useVoucherAdminStore((state) => state.error)
  const clearAdminError = useVoucherAdminStore((state) => state.clearError)
  const reloadWorkspace = useWorkspaceStore((state) => state.load)
  const students = useWorkspaceStore((state) => state.students)
  const [loadingEdit, setLoadingEdit] = useState(isEdit)
  const [editStudentName, setEditStudentName] = useState('')
  const [savedVoucher, setSavedVoucher] = useState<FinancialMovement | null>(null)

  const form = useForm<ReceiptVoucherFormValues>({ resolver: zodResolver(receiptVoucherFormSchema), defaultValues: buildDefaults(prefillName) })

  useLayoutEffect(() => { clearError(); clearAdminError() }, [clearError, clearAdminError])

  useEffect(() => {
    if (!editVoucherId) return
    let active = true
    void (async () => {
      const data = await fetchReceipt(editVoucherId)
      if (!active) return
      if (data) {
        setEditStudentName(data.studentName)
        form.reset({ paymentDate: data.paymentDate, studentName: data.studentName, studentId: '', studentIdNumber: '', studentPhone: '', courseName: data.courseName, courseValue: data.courseValue, amountReceived: data.amountReceived, payerName: data.payerName, notes: data.notes })
      }
      setLoadingEdit(false)
    })()
    return () => { active = false }
  }, [editVoucherId, fetchReceipt, form])

  async function onSubmit(values: ReceiptVoucherFormValues) {
    if (isEdit && editVoucherId) {
      const ok = await updateReceipt(editVoucherId, values)
      if (!ok) return
      await reloadWorkspace()
      useToastStore.getState().show('تم حفظ التعديل')
      closeOverlay()
      return
    }

    const saved = await saveReceiptVoucher(values)
    if (!saved) return

    await reloadWorkspace()
    const activeStudent = useMoneyInStore.getState().activeStudent
    const latestLine = useMoneyInStore.getState().statementLines.at(-1)
    if (activeStudent) selectStudent(activeStudent.id)
    if (latestLine) {
      setSavedVoucher({ id: latestLine.id, movementType: 'receipt', voucherNumber: latestLine.voucherNumber, voucherDate: latestLine.voucherDate, amount: latestLine.amountReceived, partyName: latestLine.studentName, context: latestLine.courseName })
    }
    useToastStore.getState().show('رُحّل سند القبض بنجاح')
  }

  const busy = isEdit ? adminBusy : isSaving
  const showError = error || adminError

  return (
    <>
      <ActionSheet title={isEdit ? 'تعديل سند قبض' : 'سند قبض'} onClose={closeOverlay}>
        {showError ? <div role="alert" className="mb-4 rounded-xl border border-clay/25 bg-clay-weak px-4 py-3 text-sm text-clay">{isEdit ? adminError ?? 'تعذّر حفظ التعديل.' : error ?? 'تعذّر حفظ السند.'}</div> : null}
        {loadingEdit ? <p className="py-10 text-center text-sm text-faint">جارٍ تحميل السند…</p> : savedVoucher ? (
          <div className="py-3"><p className="mb-4 text-center text-sm font-semibold text-foreground">تم حفظ السند. يمكنك طباعته الآن.</p><Button type="button" variant="outline" className="w-full" onClick={closeOverlay}>إغلاق بعد الطباعة</Button></div>
        ) : (
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            {isEdit ? <Field label="اسم الطالب">{(control) => <Input {...control} value={editStudentName} readOnly />}</Field> : <StudentPicker form={form} students={students} />}
            <Field label="اسم الدورة" error={form.formState.errors.courseName?.message}>{(control) => <Input placeholder="اكتب اسم الدورة" readOnly={isEdit} {...control} {...form.register('courseName')} />}</Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="قيمة الدورة" error={form.formState.errors.courseValue?.message}>{(control) => <Input type="number" min="0" step="1" placeholder="0" readOnly={isEdit} className="figure" {...control} {...form.register('courseValue', { valueAsNumber: true })} />}</Field>
              <Field label="تاريخ الدفع" error={form.formState.errors.paymentDate?.message}>{(control) => <Input type="date" readOnly={isEdit} className="figure" {...control} {...form.register('paymentDate')} />}</Field>
            </div>
            <Field label="المبلغ المقبوض" error={form.formState.errors.amountReceived?.message}>
              {(control) => (
                <div className="flex items-center gap-2 rounded-xl border border-olive/30 bg-olive-weak/40 px-4 py-1 focus-within:border-olive">
                  <input type="number" min="1" step="1" inputMode="numeric" readOnly={isEdit} className="figure h-12 w-full bg-transparent text-2xl font-semibold text-foreground outline-none placeholder:text-faint" placeholder="0" {...control} {...form.register('amountReceived', { valueAsNumber: true })} />
                  <span className="text-sm font-medium text-muted-foreground">₪</span>
                </div>
              )}
            </Field>
            <Field label="اسم الدافع (اختياري)" error={form.formState.errors.payerName?.message}>{(control) => <Input placeholder="اسم من يدفع نيابةً عن الطالب" {...control} {...form.register('payerName')} />}</Field>
            <Field label="الملاحظات (اختياري)" error={form.formState.errors.notes?.message}>{(control) => <Textarea placeholder="ملاحظات اختيارية" {...control} {...form.register('notes')} />}</Field>
            <Button type="submit" size="lg" className="w-full" disabled={busy}><ArrowDownLeft className="size-4" />{busy ? 'جارٍ الحفظ…' : isEdit ? 'حفظ التعديل' : 'حفظ سند القبض'}</Button>
            <p className="text-center text-[11.5px] text-faint">Enter للتالي · Ctrl+Enter للحفظ · Esc للإغلاق</p>
          </form>
        )}
      </ActionSheet>
      {savedVoucher ? <VoucherPrint movement={savedVoucher} onClose={closeOverlay} /> : null}
    </>
  )
}
