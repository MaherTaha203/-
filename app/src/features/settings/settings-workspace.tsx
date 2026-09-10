import { type ReactNode, useRef, useState } from 'react'

import { RouteHeader } from '@/components/shell/route-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useToastStore } from '@/components/ui/use-toast-store'
import { ChangePasswordDialog } from '@/features/settings/change-password-dialog'
import { Segmented, SettingRow, TextSetting, Toggle, type SegmentOption } from '@/features/settings/settings-controls'
import { recordActivityEvent } from '@/lib/activity-log'
import { useAuthStore } from '@/store/use-auth-store'
import { useSettingsStore } from '@/store/use-settings-store'
import { useShellStore } from '@/store/use-shell-store'

const DATE_FORMAT_OPTIONS: SegmentOption<'dmy' | 'ymd'>[] = [
  { value: 'dmy', label: 'DD/MM/YYYY' },
  { value: 'ymd', label: 'YYYY/MM/DD' },
]

const DENSITY_OPTIONS: SegmentOption<'comfortable' | 'compact'>[] = [
  { value: 'comfortable', label: 'مريح' },
  { value: 'compact', label: 'مضغوط' },
]

const PERIOD_OPTIONS: SegmentOption<'all' | 'month' | 'week'>[] = [
  { value: 'all', label: 'الكل' },
  { value: 'month', label: 'الشهر' },
  { value: 'week', label: 'الأسبوع' },
]

const AUTO_LOGOUT_OPTIONS: SegmentOption<0 | 15 | 30 | 60>[] = [
  { value: 0, label: 'معطّل' },
  { value: 15, label: '15 د' },
  { value: 30, label: '30 د' },
  { value: 60, label: '60 د' },
]

// A logo must stay small enough to embed in localStorage and every printed sheet.
const MAX_LOGO_BYTES = 400 * 1024

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="block">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
      </CardHeader>
      <CardContent className="px-6 py-1.5">{children}</CardContent>
    </Card>
  )
}

export function SettingsWorkspace() {
  const session = useAuthStore((state) => state.session)
  const signOut = useAuthStore((state) => state.signOut)
  const email = session?.user?.email ?? '—'
  const settings = useSettingsStore((state) => state.settings)
  const update = useSettingsStore((state) => state.update)
  const reset = useSettingsStore((state) => state.reset)
  const navigateSettings = useShellStore((state) => state.navigateSettings)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [showChangePassword, setShowChangePassword] = useState(false)

  function handleLogoChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      useToastStore.getState().show('يُسمح بملفّات الصور فقط')
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      useToastStore.getState().show('حجم الشعار كبير — الحدّ الأقصى 400 كيلوبايت')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        update({ logo: reader.result })
        void recordActivityEvent({ entity: 'settings', action: 'edit', label: 'شعار المركز', description: 'تحديث شعار المركز' })
        useToastStore.getState().show('تم تحديث الشعار')
      }
    }
    reader.onerror = () => useToastStore.getState().show('تعذّرت قراءة ملفّ الشعار')
    reader.readAsDataURL(file)
  }

  function handleReset() {
    reset()
    void recordActivityEvent({ entity: 'settings', action: 'edit', label: 'الإعدادات', description: 'إعادة كل الإعدادات إلى الافتراضي' })
    useToastStore.getState().show('أُعيدت الإعدادات إلى الافتراضي')
  }

  return (
    <div>
      <RouteHeader eyebrow="الإعدادات" title="الإعدادات" />

      <div className="grid w-full max-w-[880px] gap-6">
        <Group title="بيانات المركز والمستندات">
          <SettingRow label="اسم المركز">
            <TextSetting className="w-64" value={settings.name} onCommit={(name) => update({ name })} />
          </SettingRow>
          <SettingRow label="اسم المسؤول">
            <TextSetting className="w-64" value={settings.responsibleName} onCommit={(responsibleName) => update({ responsibleName })} />
          </SettingRow>
          <SettingRow label="هاتف المركز">
            <TextSetting className="figure w-64" dir="ltr" inputMode="tel" value={settings.phone} onCommit={(phone) => update({ phone })} />
          </SettingRow>
          <SettingRow label="عنوان المركز">
            <TextSetting className="w-64" value={settings.address} onCommit={(address) => update({ address })} />
          </SettingRow>
          <SettingRow label="شعار المركز">
            <div className="flex items-center gap-3">
              {settings.logo ? (
                <img src={settings.logo} alt="شعار المركز" className="size-11 rounded-lg object-cover ring-1 ring-border-strong" />
              ) : (
                <span className="grid size-11 place-items-center rounded-lg border border-dashed border-border-strong text-[10px] text-faint">
                  لا شعار
                </span>
              )}
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoChosen} className="hidden" />
              <Button variant="quiet" size="sm" onClick={() => logoInputRef.current?.click()}>
                {settings.logo ? 'تغيير' : 'رفع'}
              </Button>
              {settings.logo ? (
                <Button variant="quiet" size="sm" onClick={() => update({ logo: '' })}>
                  إزالة
                </Button>
              ) : null}
            </div>
          </SettingRow>
          <SettingRow label="الرقم الضريبي / رقم الترخيص">
            <TextSetting className="figure w-64" dir="ltr" value={settings.taxId} onCommit={(taxId) => update({ taxId })} />
          </SettingRow>
          <SettingRow label="نص تذييل السند المطبوع">
            <TextSetting className="w-64" value={settings.voucherFooter} onCommit={(voucherFooter) => update({ voucherFooter })} />
          </SettingRow>
        </Group>

        <Group title="السندات والأرقام">
          <SettingRow label="رمز العملة">
            <TextSetting className="w-24 text-center" maxLength={6} value={settings.currencySymbol} onCommit={(currencySymbol) => update({ currencySymbol })} />
          </SettingRow>
          <SettingRow label="الحدّ الأعلى للمبلغ في السند">
            <TextSetting className="figure w-40 text-center" dir="ltr" inputMode="numeric" value={String(settings.maxVoucherAmount)} onCommit={(value) => update({ maxVoucherAmount: Number(value) })} />
          </SettingRow>
          <SettingRow label="تنسيق التاريخ">
            <Segmented ariaLabel="تنسيق التاريخ" value={settings.dateFormat} options={DATE_FORMAT_OPTIONS} onChange={(dateFormat) => update({ dateFormat })} />
          </SettingRow>
          <SettingRow label="اشتراط سبب عند الإبطال">
            <Toggle checked={settings.requireCancelReason} onChange={(requireCancelReason) => update({ requireCancelReason })} />
          </SettingRow>
          <SettingRow label="تأكيد إضافيّ قبل الإبطال">
            <Toggle checked={settings.doubleConfirmCancel} onChange={(doubleConfirmCancel) => update({ doubleConfirmCancel })} />
          </SettingRow>
          <SettingRow label="منع تأريخ سند في المستقبل">
            <Toggle checked={settings.blockFutureDate} onChange={(blockFutureDate) => update({ blockFutureDate })} />
          </SettingRow>
        </Group>

        <Group title="العرض والتقارير">
          <SettingRow label="عدد طلاب المتابعة في الرئيسية">
            <TextSetting className="figure w-24 text-center" dir="ltr" inputMode="numeric" value={String(settings.attentionCount)} onCommit={(value) => update({ attentionCount: Number(value) })} />
          </SettingRow>
          <SettingRow label="كثافة الجداول">
            <Segmented ariaLabel="كثافة الجداول" value={settings.tableDensity} options={DENSITY_OPTIONS} onChange={(tableDensity) => update({ tableDensity })} />
          </SettingRow>
          <SettingRow label="تفعيل حركات الواجهة">
            <Toggle checked={settings.enableMotion} onChange={(enableMotion) => update({ enableMotion })} />
          </SettingRow>
          <SettingRow label="طيّ ملخّص كشف الحساب افتراضيًّا">
            <Toggle checked={settings.collapseStatementSummary} onChange={(collapseStatementSummary) => update({ collapseStatementSummary })} labelOn="مطويّ" labelOff="مفتوح" />
          </SettingRow>
          <SettingRow label="الفترة الافتراضية للتقارير">
            <Segmented ariaLabel="الفترة الافتراضية" value={settings.defaultReportPeriod} options={PERIOD_OPTIONS} onChange={(defaultReportPeriod) => update({ defaultReportPeriod })} />
          </SettingRow>
        </Group>

        <Group title="النسخ الاحتياطي">
          <SettingRow label="النسخ الاحتياطي والاستعادة">
            <Button variant="quiet" size="sm" onClick={() => navigateSettings('backup')}>
              فتح صفحة النسخ الاحتياطي
            </Button>
          </SettingRow>
        </Group>

        <Group title="الحساب والأمان">
          <SettingRow label="البريد الإلكتروني">
            <span className="figure text-sm text-foreground" dir="ltr">
              {email}
            </span>
          </SettingRow>
          <SettingRow label="كلمة المرور">
            <Button variant="quiet" size="sm" onClick={() => setShowChangePassword(true)}>
              تغيير كلمة المرور
            </Button>
          </SettingRow>
          <SettingRow label="تسجيل الخروج التلقائي بعد خمول">
            <Segmented ariaLabel="تسجيل الخروج التلقائي" value={settings.autoLogoutMinutes} options={AUTO_LOGOUT_OPTIONS} onChange={(autoLogoutMinutes) => update({ autoLogoutMinutes })} />
          </SettingRow>
          <SettingRow label="الجلسة">
            <Button variant="quiet" size="sm" onClick={() => void signOut()}>
              تسجيل الخروج
            </Button>
          </SettingRow>
        </Group>

        <div className="flex justify-end">
          <Button variant="quiet" size="sm" onClick={handleReset}>
            إعادة كل الإعدادات إلى الافتراضي
          </Button>
        </div>
      </div>

      {showChangePassword ? <ChangePasswordDialog onClose={() => setShowChangePassword(false)} /> : null}
    </div>
  )
}
