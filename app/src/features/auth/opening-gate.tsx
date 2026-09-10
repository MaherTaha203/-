import { useState } from 'react'

import { ArrowLeft } from 'lucide-react'

import { useAuthStore } from '@/store/use-auth-store'

const EMBLEM_SRC = `${import.meta.env.BASE_URL}brand/emblem.jpg`

type Mode = 'signin' | 'forgot'

const inputClass =
  'h-12 w-full rounded-xl border border-border-strong bg-panel px-4 text-[15px] text-foreground outline-none placeholder:text-faint focus:border-olive'

export function OpeningGate() {
  const signIn = useAuthStore((state) => state.signIn)
  const sendPasswordReset = useAuthStore((state) => state.sendPasswordReset)
  const isSubmitting = useAuthStore((state) => state.isSubmitting)
  const error = useAuthStore((state) => state.error)
  const clearError = useAuthStore((state) => state.clearError)

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [resetSent, setResetSent] = useState(false)

  function switchMode(next: Mode) {
    clearError()
    setResetSent(false)
    setMode(next)
  }

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault()
    await signIn(email, password)
  }

  async function handleForgot(event: React.FormEvent) {
    event.preventDefault()
    const ok = await sendPasswordReset(email)
    if (ok) setResetSent(true)
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative flex flex-col justify-between overflow-hidden bg-olive-weak px-8 py-12 sm:px-12 lg:px-16 lg:py-16">
        <div className="relative">
          <img
            src={EMBLEM_SRC}
            alt="شعار أرض كنعان — شجرة الحياة الكنعانيّة"
            className="w-[clamp(168px,22vw,288px)] rounded-2xl object-cover shadow-[0_24px_50px_-24px_rgba(15,23,42,0.35)] ring-1 ring-white/70"
          />
          <div className="editorial mt-7 text-[clamp(2.4rem,5.5vw,4rem)] text-foreground">
            أرض كنعان
          </div>
        </div>
        <div className="relative mt-10 border-t border-border pt-7 text-[12.5px] leading-6 text-muted-foreground">
          مركزٌ واحد · مشغّلٌ واحد
        </div>
      </section>

      <section className="flex flex-col justify-center gap-5 bg-panel px-8 py-12 sm:px-12 lg:px-16">
        {mode === 'signin' ? (
          <>
            <div className="text-[12px] font-bold tracking-wide text-olive">الدخول</div>
            <h1 className="editorial text-3xl text-foreground">أهلًا بعودتك</h1>

            {error ? (
              <div role="alert" className="rounded-xl border border-clay/25 bg-clay-weak px-4 py-3 text-sm text-clay">
                {error}
              </div>
            ) : null}

            <form className="flex flex-col gap-4" onSubmit={handleSignIn}>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-muted-foreground">بريد المشغّل</span>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (error) clearError()
                  }}
                  placeholder="name@example.com"
                  className={`figure ${inputClass}`}
                  dir="ltr"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-muted-foreground">كلمة المرور</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    if (error) clearError()
                  }}
                  className={inputClass}
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-olive px-7 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'جارٍ الدخول…' : 'دخول'}
                <ArrowLeft className="size-4" />
              </button>
            </form>

            <button type="button" onClick={() => switchMode('forgot')} className="w-fit text-[13px] font-medium text-olive">
              نسيت كلمة المرور؟
            </button>
          </>
        ) : (
          <>
            <div className="text-[12px] font-bold tracking-wide text-olive">استعادة الدخول</div>
            <h1 className="editorial text-3xl text-foreground">نسيت كلمة المرور</h1>

            {resetSent ? (
              <>
                <div className="rounded-xl border border-gold/25 bg-gold-weak px-4 py-3 text-sm text-gold">
                  إن كان البريد مسجّلًا فستصلك رسالة تحوي رابطًا لإعادة تعيين كلمة المرور. افتح الرابط من هذا الجهاز.
                </div>
                <button type="button" onClick={() => switchMode('signin')} className="w-fit text-[13px] font-medium text-olive">
                  العودة إلى الدخول
                </button>
              </>
            ) : (
              <>
                <p className="text-[13.5px] leading-6 text-muted-foreground">
                  أدخل بريد المشغّل وسنرسل إليك رابطًا لإعادة تعيين كلمة المرور.
                </p>

                {error ? (
                  <div role="alert" className="rounded-xl border border-clay/25 bg-clay-weak px-4 py-3 text-sm text-clay">
                    {error}
                  </div>
                ) : null}

                <form className="flex flex-col gap-4" onSubmit={handleForgot}>
                  <label className="block">
                    <span className="mb-1.5 block text-[13px] font-medium text-muted-foreground">بريد المشغّل</span>
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value)
                        if (error) clearError()
                      }}
                      placeholder="name@example.com"
                      className={`figure ${inputClass}`}
                      dir="ltr"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-olive px-7 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'جارٍ الإرسال…' : 'إرسال رابط الاستعادة'}
                    <ArrowLeft className="size-4" />
                  </button>
                </form>

                <button type="button" onClick={() => switchMode('signin')} className="w-fit text-[13px] font-medium text-olive">
                  العودة إلى الدخول
                </button>
              </>
            )}
          </>
        )}
      </section>
    </div>
  )
}
