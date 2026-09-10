import { create } from 'zustand'

// Navigation + overlay state for the workspace shell — UI state only.
// Authentication now lives in use-auth-store (real Supabase Auth), and Postgres
// RLS is the security boundary; this store no longer models a "session".

export type ShellRoute = 'home' | 'students' | 'report' | 'activity' | 'settings'
export type StudentView = 'directory' | 'statement'
export type SettingsView = 'system' | 'activity' | 'backup'
export type ShellOverlay = 'receive' | 'expense' | 'student' | null
export type ReportView = 'general' | 'receipts' | 'payments'

type ShellStore = {
  route: ShellRoute
  studentView: StudentView
  settingsView: SettingsView
  reportView: ReportView
  selectedStudentId: string | null
  overlay: ShellOverlay
  receivePrefillName: string | null
  editVoucherId: string | null
  editStudentId: string | null
  navigate: (route: ShellRoute) => void
  navigateStudents: (view: StudentView) => void
  navigateSettings: (view: SettingsView) => void
  navigateReport: (view: ReportView) => void
  selectStudent: (studentId: string) => void
  openOverlay: (overlay: Exclude<ShellOverlay, null | 'student'>) => void
  openReceiveFor: (studentName: string) => void
  openEditReceipt: (id: string) => void
  openEditPayment: (id: string) => void
  openEditStudent: (id: string) => void
  closeOverlay: () => void
}

const CLEARED = { overlay: null, receivePrefillName: null, editVoucherId: null, editStudentId: null }

export const useShellStore = create<ShellStore>((set) => ({
  route: 'home',
  studentView: 'directory',
  settingsView: 'system',
  reportView: 'general',
  selectedStudentId: null,
  overlay: null,
  receivePrefillName: null,
  editVoucherId: null,
  editStudentId: null,
  navigate: (route) => set({ route, ...CLEARED }),
  navigateStudents: (view) => set({ route: 'students', studentView: view, ...CLEARED }),
  navigateSettings: (view) => set({ route: 'settings', settingsView: view, ...CLEARED }),
  navigateReport: (view) => set({ route: 'report', reportView: view, ...CLEARED }),
  selectStudent: (studentId) => set({ selectedStudentId: studentId, route: 'students', studentView: 'statement', ...CLEARED }),
  openOverlay: (overlay) => set({ ...CLEARED, overlay }),
  openReceiveFor: (studentName) => set({ ...CLEARED, overlay: 'receive', receivePrefillName: studentName }),
  openEditReceipt: (id) => set({ ...CLEARED, overlay: 'receive', editVoucherId: id }),
  openEditPayment: (id) => set({ ...CLEARED, overlay: 'expense', editVoucherId: id }),
  openEditStudent: (id) => set({ ...CLEARED, overlay: 'student', editStudentId: id }),
  closeOverlay: () => set({ ...CLEARED }),
}))
