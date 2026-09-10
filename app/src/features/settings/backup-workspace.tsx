import { RouteHeader } from '@/components/shell/route-header'
import { BackupHistory } from '@/features/settings/backup-history'
import { BackupRestore } from '@/features/settings/backup-restore'

// The backup/restore page: create or restore a full snapshot at the top, with the
// history of previous backup/restore events below. Separated from the settings
// page so this high-stakes action has room of its own.
export function BackupWorkspace() {
  return (
    <div>
      <RouteHeader eyebrow="النسخ الاحتياطي" title="النسخ الاحتياطي والاستعادة" />

      <div className="grid w-full max-w-[880px] gap-6">
        <BackupRestore />
        <BackupHistory />
      </div>
    </div>
  )
}
