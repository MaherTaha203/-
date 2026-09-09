import { z } from 'zod'

// Generous data-entry ceiling in whole shekels. Not a business rule — the DB
// financial firewall remains the authoritative cap; this only stops an obvious
// fat-finger (an extra zero) from being submitted in the first place.
const MAX_SHEKEL_AMOUNT = 1_000_000

export const paymentVoucherFormSchema = z.object({
  paymentDate: z.string().min(1, 'تاريخ الدفع مطلوب'),
  expenseType: z.string().trim().min(1, 'بند المصروف مطلوب'),
  amount: z.coerce.number().int('المبلغ المدفوع يجب أن يكون عددًا صحيحًا من الشواكل').positive('المبلغ المدفوع يجب أن يكون أكبر من صفر').max(MAX_SHEKEL_AMOUNT, 'المبلغ المدفوع أكبر من الحدّ المسموح'),
  notes: z.string().trim(),
})

export type PaymentVoucherFormValues = z.infer<typeof paymentVoucherFormSchema>
