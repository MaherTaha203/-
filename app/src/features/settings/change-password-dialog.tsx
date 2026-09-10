import { useState } from 'react'

import { ActionSheet } from '@/components/shell/action-sheet'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useToastStore } from '@/components/ui/use-toast-store'
import { passwordPolicyError } from '@/features/auth/password-policy'
import { useAuthStore } from '@/store/use-auth-store'

type ChangePasswordDialogProps = {
  onClose: () => void
}

/**
 * Lets the signed-in owner set a new account password. The new password must pass
 * the same strengthened policy used at the recovery gate. Supabase updates the
 * password for the active session; the audit log records the change server-side.
 */
export function ChangePasswordDialog({ onClose }: ChangePasswordDialogProps) {
  const updatePassword = useAuthStore((state) => state.updatePassword)
  const isSubmitting = useAuthStore((state) => state.isSubmitting)
  const serverError = useAuthStore((state) => state.error)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  async function handleSubmit() {
    const policyError = passwordPolicyError(password)
    if (policyError) {
      setLocalError(policyError)
      return
    }
    if (password !== confirm) {
      setLocalError('تأكيد كلمة المرور لا يطابق كلمة المرور')
      return
    }
    setLocalError(null)
    const ok = await updatePassword(password)
    if (!ok) return
    useToastStore.getState().show('تم تغيير كلمة المرور')
    onClose()
  }

  const message = localError ?? serverError

  return (
    <ActionSheet title="تغيير كلمة المرور" onClose={onClose}>
      {message ? (
        <div role="alert" className="mb-4 rounded-xl border border-clay/25 bg-clay-weak px-4 py-3 text-sm text-clay">
          {message}
        </div>
      ) : null}

      <div className="space-y-4">
        <Field label="كلمة المرور الجديدة">
          {(control) => (
            <Input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              {...control}
            />
          )}
        </Field>
        <Field label="تأكيد كلمة المرور">
          {(control) => (
            <Input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              {...control}
            />
          )}
        </Field>
      </div>

      <div className="mt-6 flex gap-3">
        <Button className="flex-1" onClick={handleSubmit} disabled={isSubmitting || !password || !confirm}>
          {isSubmitting ? 'جارٍ الحفظ…' : 'حفظ كلمة المرور'}
        </Button>
        <Button variant="quiet" onClick={onClose} disabled={isSubmitting}>
          إلغاء
        </Button>
      </div>
    </ActionSheet>
  )
}
