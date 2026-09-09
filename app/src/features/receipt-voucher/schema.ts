import { z } from 'zod'

// Generous data-entry ceiling in whole shekels. Not a business rule — the DB
// financial firewall remains the authoritative cap; this only stops an obvious
// fat-finger (an extra zero) from being submitted in the first place.
const MAX_SHEKEL_AMOUNT = 1_000_000

export const receiptVoucherFormSchema = z.object({
  paymentDate: z.string().min(1, 'تاريخ الدفع مطلوب'),
  studentName: z.string().trim().min(1, 'اسم الطالب مطلوب'),
  // Identity of a picked existing student. Empty string = the name is free text and
  // the student will be resolved by name (created if new). Never a financial field.
  studentId: z.string().trim(),
  // Only used when a NEW student is being created (no studentId). For an existing,
  // picked student these are shown read-only and never overwrite their record.
  studentIdNumber: z.string().trim(),
  studentPhone: z.string().trim(),
  courseName: z.string().trim().min(1, 'اسم الدورة مطلوب'),
  courseValue: z.coerce.number().int('قيمة الدورة يجب أن تكون عددًا صحيحًا من الشواكل').min(0, 'قيمة الدورة يجب أن تكون صفرًا أو أكثر').max(MAX_SHEKEL_AMOUNT, 'قيمة الدورة أكبر من الحدّ المسموح'),
  amountReceived: z.coerce.number().int('المبلغ المقبوض يجب أن يكون عددًا صحيحًا من الشواكل').positive('المبلغ المقبوض يجب أن يكون أكبر من صفر').max(MAX_SHEKEL_AMOUNT, 'المبلغ المقبوض أكبر من الحدّ المسموح'),
  // BUG-1 (approved): payer name and notes are truly optional. Empty is valid;
  // only the financial fields above gate save. Sent to the DB as '' (NOT NULL-safe).
  payerName: z.string().trim(),
  notes: z.string().trim(),
})

export type ReceiptVoucherFormValues = z.infer<typeof receiptVoucherFormSchema>
