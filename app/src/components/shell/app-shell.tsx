import { useEffect, useRef, useState, type ComponentType } from 'react'

import { ArrowDownLeft, ArrowUpRight, ChevronDown, FileText, Home, LogOut, Settings, Users } from 'lucide-react'

import { ReceiptSheet } from '@/features/receipt-voucher/receipt-sheet'
import { PaymentSheet } from '@/features/payment-voucher/payment-sheet'
import { StudentEditSheet } from '@/features/students/student-edit-sheet'
import { ActivityWorkspace } from '@/features/activity/activity-workspace'
import { GlanceWorkspace } from '@/features/glance/glance-workspace'
import { StudentDirectoryWorkspace } from '@/features/students/student-directory-workspace'
import { Toaster } from '@/components/ui/toast'
import { StudentsWorkspace } from '@/features/students/students-workspace'
import { FinancialReportWorkspace } from '@/features/financial-report/financial-report-workspace'
import { SettingsWorkspace } from '@/features/settings/settings-workspace'
import { useAuthStore } from '@/store/use-auth-store'
import { useShellStore, type ReportView, type SettingsView, type ShellRoute, type StudentView } from '@/store/use-shell-store'
import { useWorkspaceStore } from '@/store/use-workspace-store'

type MenuItem<T> = { value: T; label: string }

const REPORT_MENU: MenuItem<ReportView>[] = [
  { value: 'general', label: 'كشف الحساب العام' },
  { value: 'receipts', label: 'تقرير المقبوضات' },
  { value: 'payments', label: 'تقرير المدفوعات' },
]

const STUDENT_MENU: MenuItem<StudentView>[] = [
  { value: 'directory', label: 'دليل الطلاب' },
  { value: 'statement', label: 'كشف الحساب' },
]

const SETTINGS_MENU: MenuItem<SettingsView>[] = [
  { value: 'system', label: 'الإعدادات' },
  { value: 'activity', label: 'سجل التدقيق' },
]

function CurrentView({ route, studentView, settingsView }: { route: ShellRoute; studentView: StudentView; settingsView: SettingsView }) {
  switch (route) {
    case 'home':
      return <GlanceWorkspace />
    case 'students':
      return studentView === 'directory' ? <StudentDirectoryWorkspace /> : <StudentsWorkspace />
    case 'report':
      return <FinancialReportWorkspace />
    case 'activity':
      return <ActivityWorkspace />
    case 'settings':
      return settingsView === 'system' ? <SettingsWorkspace /> : <ActivityWorkspace />
  }
}

export function AppShell() {
  const route = useShellStore((state) => state.route)
  const studentView = useShellStore((state) => state.studentView)
  const settingsView = useShellStore((state) => state.settingsView)
  const reportView = useShellStore((state) => state.reportView)
  const overlay = useShellStore((state) => state.overlay)
  const editVoucherId = useShellStore((state) => state.editVoucherId)
  const editStudentId = useShellStore((state) => state.editStudentId)
  const receivePrefillName = useShellStore((state) => state.receivePrefillName)
  const navigate = useShellStore((state) => state.navigate)
  const navigateStudents = useShellStore((state) => state.navigateStudents)
  const navigateSettings = useShellStore((state) => state.navigateSettings)
  const navigateReport = useShellStore((state) => state.navigateReport)
  const openOverlay = useShellStore((state) => state.openOverlay)
  const signOut = useAuthStore((state) => state.signOut)
  const load = useWorkspaceStore((state) => state.load)
  const loaded = useWorkspaceStore((state) => state.loaded)

  useEffect(() => {
    if (!loaded) void load()
  }, [loaded, load])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 flex flex-none items-center gap-2 border-b border-border bg-panel/95 px-4 py-3 md:gap-4 md:px-8">
        <button type="button" onClick={() => navigate('home')} className="flex items-baseline gap-2">
          <span className="editorial text-[19px] text-foreground">أرض كنعان</span>
        </button>

        <nav aria-label="التنقل" className="ms-6 hidden items-center gap-1 md:flex">
          <NavLink label="الرئيسية" icon={Home} active={route === 'home'} onClick={() => navigate('home')} />
          <GroupNav
            label="الطلاب"
            icon={Users}
            active={route === 'students'}
            value={studentView}
            items={STUDENT_MENU}
            onPick={navigateStudents}
          />
          <ReportNav active={route === 'report'} reportView={reportView} onPick={navigateReport} />
          <GroupNav
            label="إعدادات"
            icon={Settings}
            active={route === 'settings' || route === 'activity'}
            value={settingsView}
            items={SETTINGS_MENU}
            onPick={navigateSettings}
          />
        </nav>

        <div className="ms-auto flex items-center gap-1.5 md:gap-2">
          <button type="button" onClick={() => openOverlay('receive')} className="hidden items-center gap-2 rounded-full bg-olive px-4 py-2 text-[13px] font-semibold text-white shadow-sm sm:inline-flex">
            <ArrowDownLeft className="size-4" />
            سند قبض
          </button>
          <button type="button" onClick={() => openOverlay('expense')} className="hidden items-center gap-2 rounded-full border border-border-strong px-4 py-2 text-[13px] font-semibold text-muted-foreground sm:inline-flex">
            <ArrowUpRight className="size-4" />
            سند صرف
          </button>
          <button type="button" onClick={() => void signOut()} aria-label="خروج" className="rounded-full p-2 text-muted-foreground">
            <LogOut className="size-[18px]" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-x-clip">
        <div className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-8 md:px-8 md:pb-14 md:pt-10">
          <div key={`${route}:${studentView}:${settingsView}:${reportView}`} className="route-fade">
            <CurrentView route={route} studentView={studentView} settingsView={settingsView} />
          </div>
        </div>
      </main>

      {overlay === 'receive' ? <ReceiptSheet key={editVoucherId ?? receivePrefillName ?? 'new'} /> : null}
      {overlay === 'expense' ? <PaymentSheet key={editVoucherId ?? 'new'} /> : null}
      {overlay === 'student' ? <StudentEditSheet key={editStudentId ?? 'new'} /> : null}

      <Toaster />

      <nav aria-label="التنقل" className="fixed inset-x-0 bottom-0 z-20 flex flex-none items-stretch justify-around border-t border-border bg-panel/95 px-1 py-1.5 md:hidden">
        <MobileNavButton active={route === 'home'} icon={Home} label="الرئيسية" onClick={() => navigate('home')} />
        <MobileGroupNav label="الطلاب" icon={Users} active={route === 'students'} value={studentView} items={STUDENT_MENU} onPick={navigateStudents} />
        <MobileGroupNav label="التقرير" icon={FileText} active={route === 'report'} value={reportView} items={REPORT_MENU} onPick={navigateReport} />
        <MobileGroupNav label="إعدادات" icon={Settings} active={route === 'settings' || route === 'activity'} value={settingsView} items={SETTINGS_MENU} onPick={navigateSettings} />
        <MobileNavButton icon={ArrowDownLeft} label="قبض" accent onClick={() => openOverlay('receive')} />
        <MobileNavButton icon={ArrowUpRight} label="صرف" onClick={() => openOverlay('expense')} />
      </nav>
    </div>
  )
}

function NavLink({ label, icon: Icon, active, onClick }: { label: string; icon: ComponentType<{ className?: string }>; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined} className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium ${active ? 'bg-olive-weak text-olive' : 'text-muted-foreground'}`}>
      <Icon className="size-4" />
      {label}
    </button>
  )
}

function GroupNav<T extends string>({ label, icon: Icon, active, value, items, onPick }: { label: string; icon: ComponentType<{ className?: string }>; active: boolean; value: T; items: MenuItem<T>[]; onPick: (value: T) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} aria-current={active ? 'page' : undefined} className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium ${active ? 'bg-olive-weak text-olive' : 'text-muted-foreground'}`}>
        <Icon className="size-4" />
        {label}
        <ChevronDown className="size-4" />
      </button>
      {open ? <div role="menu" className="menu-in absolute start-0 z-30 mt-1 w-48 overflow-hidden rounded-xl border border-border-strong bg-panel py-1 shadow-lg">
        {items.map((item) => <button key={item.value} type="button" role="menuitemradio" aria-checked={active && value === item.value} onClick={() => { onPick(item.value); setOpen(false) }} className={`flex w-full px-3.5 py-2 text-start text-sm ${active && value === item.value ? 'font-semibold text-olive' : 'text-muted-foreground'}`}>{item.label}</button>)}
      </div> : null}
    </div>
  )
}

function ReportNav({ active, reportView, onPick }: { active: boolean; reportView: ReportView; onPick: (view: ReportView) => void }) {
  return <GroupNav label="التقارير المالية" icon={FileText} active={active} value={reportView} items={REPORT_MENU} onPick={onPick} />
}

function MobileGroupNav<T extends string>({ label, icon: Icon, active, value, items, onPick }: { label: string; icon: ComponentType<{ className?: string }>; active: boolean; value: T; items: MenuItem<T>[]; onPick: (value: T) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative flex flex-1 justify-center">
      {open ? <div className="menu-fade absolute bottom-[calc(100%+6px)] end-1/2 z-30 w-48 translate-x-1/2 overflow-hidden rounded-xl border border-border-strong bg-panel py-1 shadow-lg">
        {items.map((item) => <button key={item.value} type="button" onClick={() => { onPick(item.value); setOpen(false) }} className={`flex w-full px-3.5 py-2.5 text-start text-sm ${active && value === item.value ? 'font-semibold text-olive' : 'text-muted-foreground'}`}>{item.label}</button>)}
      </div> : null}
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-medium ${active ? 'text-olive' : 'text-muted-foreground'}`}>
        <span className={`grid size-8 place-items-center rounded-full ${active ? 'bg-olive-weak' : ''}`}><Icon className="size-[18px]" /></span>
        {label}
      </button>
    </div>
  )
}

function MobileNavButton({ icon: Icon, label, active, accent, onClick }: { icon: ComponentType<{ className?: string }>; label: string; active?: boolean; accent?: boolean; onClick: () => void }) {
  const color = accent ? 'text-olive' : active ? 'text-olive' : 'text-muted-foreground'
  return <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined} className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-medium ${color}`}>
    <span className={`grid size-8 place-items-center rounded-full ${active || accent ? 'bg-olive-weak' : ''}`}><Icon className="size-[18px]" /></span>
    {label}
  </button>
}
