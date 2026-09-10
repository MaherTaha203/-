import { useRef, useState } from 'react'

import { Download, Upload } from 'lucide-react'

import { ActionSheet } from '@/components/shell/action-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToastStore } from '@/components/ui/use-toast-store'
import {
  downloadBackup,
  readBackupFile,
  validateBackup,
  type RestorePayload,
} from '@/lib/backup'
import { recordActivityEvent } from '@/lib/activity-log'
import { useBackupStore } from '@/store/use-backup-store'
import { useWorkspaceStore } from '@/store/use-workspace-store'

const CONFIRM_WORD = 'استعادة'

/**
 * Backup (export a JSON snapshot) and restore (replace everything from a backup).
 * Restore is guarded: it downloads an automatic backup of the current data first,
 * then requires the operator to type a confirmation word, then runs the atomic
 * server-side restore. If the restore fails, current data is left untouched.
 */
export function BackupRestore() {
  const exportBackup = useBackupStore((state) => state.exportBackup)
  const restore = useBackupStore((state) => state.restore)
  const isBusy = useBackupStore((state) => state.isBusy)
  const reloadWorkspace = useWorkspaceStore((state) => state.load)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<RestorePayload | null>(null)
  const [confirmText, setConfirmText] = useState('')
  // Non-null while the server has asked to confirm a smaller-than-current restore.
  const [shrinkWarn, setShrinkWarn] = useState<string | null>(null)

  function resetRestore() {
    setPending(null)
    setConfirmText('')
    setShrinkWarn(null)
  }

  async function handleExport() {
    const payload = await exportBackup()
    if (!payload) {
      useToastStore.getState().show('تعذّر إنشاء نسخة احتياطيّة كاملة')
      return
    }
    downloadBackup(payload)
    const students = payload.students.length
    const vouchers = payload.receipt_vouchers.length + payload.payment_vouchers.length
    void recordActivityEvent({
      entity: 'backup',
      action: 'export',
      label: 'نسخة احتياطيّة',
      description: `تصدير نسخة احتياطيّة — ${students} طالبًا و${vouchers} سندًا`,
      metadata: { students, vouchers },
    })
    useToastStore.getState().show('تم تنزيل النسخة الاحتياطيّة')
  }

  async function handleFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Reset the input so choosing the same file again re-triggers change.
    event.target.value = ''
    if (!file) return
    try {
      const parsed = await readBackupFile(file)
      const result = validateBackup(parsed)
      if (!result.ok) {
        useToastStore.getState().show(result.reason)
        return
      }
      setConfirmText('')
      setShrinkWarn(null)
      setPending(result.payload)
    } catch {
      useToastStore.getState().show('تعذّرت قراءة الملف')
    }
  }

  // The actual restore call. Kept separate from the safety-backup step so the
  // "shrink" re-confirmation (force=true) doesn't download a second safety backup.
  async function runRestore(payload: RestorePayload, force: boolean) {
    const result = await restore(payload, force)
    if (result.status === 'confirm') {
      setShrinkWarn('النسخة الاحتياطيّة تحتوي عددًا من السجلّات أقلّ من الموجود حاليًّا. المتابعة ستحذف الفائض.')
      return
    }
    if (result.status !== 'done') {
      useToastStore.getState().show('تعذّرت الاستعادة')
      return
    }
    const students = result.counts.students
    const vouchers = result.counts.receipt_vouchers + result.counts.payment_vouchers
    void recordActivityEvent({
      entity: 'backup',
      action: 'restore',
      label: 'استعادة نسخة احتياطيّة',
      description: `استعادة نسخة احتياطيّة — ${students} طالبًا و${vouchers} سندًا`,
      metadata: { students, vouchers },
    })
    await reloadWorkspace()
    resetRestore()
    useToastStore.getState().show('تمت الاستعادة بنجاح')
  }

  async function handleConfirmRestore() {
    if (!pending) return
    // Safety net FIRST: a full backup of the CURRENT data must be produced and
    // downloaded before we touch anything. If it can't, abort — never restore
    // without the promised safety copy.
    const current = await exportBackup()
    if (!current) {
      useToastStore.getState().show('تعذّر إنشاء نسخة احتياطيّة قبل الاستعادة — أُوقفت العمليّة')
      return
    }
    downloadBackup(current)
    await runRestore(pending, false)
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 py-2">
        <Button variant="outline" onClick={handleExport} disabled={isBusy}>
          <Download className="size-4" />
          تصدير نسخة احتياطيّة
        </Button>
        <Button variant="quiet" onClick={() => fileInputRef.current?.click()} disabled={isBusy}>
          <Upload className="size-4" />
          استعادة من نسخة
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFileChosen}
          className="hidden"
        />
      </div>

      {pending ? (
        <ActionSheet title="تأكيد الاستعادة" onClose={resetRestore}>
          <div className="mb-4 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
            ستُستبدل كل البيانات الحاليّة بمحتوى الملف. سنُنزّل نسخةً احتياطيّة
            تلقائيّة أولًا. لا يمكن التراجع بعد التأكيد إلا بالاستعادة من نسخة.
          </div>

          {shrinkWarn ? (
            <div className="rounded-xl border border-clay/30 bg-clay-weak px-4 py-3 text-sm text-clay">
              <div className="font-semibold">تحذير: النسخة أصغر من البيانات الحاليّة</div>
              <p className="mt-1 leading-6">{shrinkWarn}</p>
              <div className="mt-4 flex gap-3">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => void runRestore(pending, true)}
                  disabled={isBusy}
                >
                  {isBusy ? 'جارٍ الاستعادة…' : 'متابعة رغم النقص'}
                </Button>
                <Button variant="quiet" onClick={resetRestore} disabled={isBusy}>
                  إلغاء
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-2 text-[13px] text-muted-foreground">
                اكتب «{CONFIRM_WORD}» للمتابعة:
              </p>
              <Input
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                placeholder={CONFIRM_WORD}
                autoFocus
              />
              <div className="mt-6 flex gap-3">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleConfirmRestore}
                  disabled={isBusy || confirmText.trim() !== CONFIRM_WORD}
                >
                  {isBusy ? 'جارٍ الاستعادة…' : 'تأكيد الاستعادة'}
                </Button>
                <Button variant="quiet" onClick={resetRestore} disabled={isBusy}>
                  تراجع
                </Button>
              </div>
            </>
          )}
        </ActionSheet>
      ) : null}
    </>
  )
}