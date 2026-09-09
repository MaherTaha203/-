import { useState } from 'react'

import { ArrowLeft } from 'lucide-react'

import { MIN_PASSWORD_LENGTH, passwordPolicyError } from '@/features/auth/password-policy'
import { useAuthStore } from '@/store/use-auth-store'

const EMBLEM_SRC = `${import.meta.env.BASE_URL}brand/emblem.jpg`

const inputClass =
  'h-12 w-full rounded-xl border border-border-strong bg-panel px-4 text-[15px] text-foreground outline-none placeholder:text-faint focus:border-olive focus:ring-2 focus:ring-olive/20'

export function RecoveryGate() {
  const updatePassword = useAuthStore((state) => state.updatePassword)
  const signOut = useAuthStore((state) => state.signOut)
  const isSubmitting = useAuthStore((state) => state.isSubmitting)
  const error = useAuthStore((state) => state.error)
  const clearError = useAuthStore((state) => state.clearError)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLocalError(null)
    const policyError = passwordPolicyError(password)
    if (policyError) {
      setLocalError(policyError)
      return
    }
    if (password !== confirm) {
      setLocalError('كلمتا المرور غير متطابقتين')
      return
    }
    await updatePassword(password)
  }

  const shownError = localError ?? error

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative flex flex-col justify-between overflow-hidden bg-olive-weak px-8 py-12 sm:px-12 lg:px-16 lg:py-16">
        <div className="relative">
          <img
            src={EMBLEM_SRC}
            alt="شعار أرض كنعان — شجرة الحياة الكنعانيّة"
            className="w-[clamp(168px,22vw,288px)] rounded-2xl object-cover shadow-[0_24px_50px_-24px_rgba(15,23,42,0.35)] ring-1 ring-white/70"
          />
          <div className="editorial mt-7 text-[clamp(2.4rem,5.5vw,4rem)] text-foreground">أرض كنعان</div>
        </div>
        <div className="relative mt-10 border-t border-border pt-7 text-[12.5px] leading-6 text-muted-foreground">
          مركزٌ واحد · مشغّلٌ واحد
        </div>
      </section>

      <section className="flex flex-col justify-center gap-5 bg-panel px-8 py-12 sm:px-12 lg:px-16">
        <div className="text-[12px] font-bold tracking-wide text-olive">استعادة الدخول</div>
        <h1 className="editorial text-3xl text-foreground">تعيين كلمة مرور جديدة</h1>

        {shownError ? (
          <div role="alert" className="rounded-xl border border-clay/25 bg-clay-weak px-4 py-3 text-sm text-clay">
            {shownError}
          </div>
        ) : null}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-muted-foreground">كلمة المرور الجديدة</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                if (shownError) {
                  setLocalError(null)
                  if (error) clearError()
                }
              }}
              className={inputClass}
            />
            <span className="mt-1.5 block text-[12px] text-faint">
              10 أحرف على الأقل، وتشمل أحرفًا لاتينيّة كبيرة وصغيرة وأرقامًا ورمزًا واحدًا على الأقل
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-muted-foreground">تأكيد كلمة المرور</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
              value={confirm}
              onChange={(event) => {
                setConfirm(event.target.value)
                if (shownError) {
                  setLocalError(null)
                  if (error) clearError()
                }
              }}
              className={inputClass}
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-olive px-7 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'جارٍ الحفظ…' : 'تعيين كلمة المرور'}
            <ArrowLeft className="size-4" />
          </button>
        </form>

        <button type="button" onClick={() => void signOut()} className="w-fit text-[13px] font-medium text-olive">
          العودة إلى الدخول
        </button>
      </section>
    </div>
  )
}
