// The center's local preferences. This is presentation/UX configuration only —
// nothing here is a financial rule. The Postgres financial firewall and RLS stay
// the sole authority over data integrity; these settings never widen what the
// server allows. Persisted per-browser in localStorage.

export type DateFormat = 'dmy' | 'ymd'
export type TableDensity = 'comfortable' | 'compact'
export type ReportPeriodPref = 'all' | 'month' | 'week'
export type AutoLogoutMinutes = 0 | 15 | 30 | 60

export type AppSettings = {
  // Center identity & printed documents
  name: string
  responsibleName: string
  phone: string
  address: string
  logo: string // data: URL, or '' for the default emblem
  taxId: string
  voucherFooter: string
  // Vouchers & numbers
  currencySymbol: string
  maxVoucherAmount: number
  dateFormat: DateFormat
  requireCancelReason: boolean
  doubleConfirmCancel: boolean
  blockFutureDate: boolean
  // Display & reports
  attentionCount: number
  tableDensity: TableDensity
  enableMotion: boolean
  collapseStatementSummary: boolean
  defaultReportPeriod: ReportPeriodPref
  // Account & security
  autoLogoutMinutes: AutoLogoutMinutes
}

// The absolute data-entry ceiling. The configurable maxVoucherAmount below is a
// softer guard the operator can tighten, but never above this hard ceiling.
export const HARD_MAX_VOUCHER_AMOUNT = 1_000_000
const MIN_ATTENTION_COUNT = 1
const MAX_ATTENTION_COUNT = 20
const AUTO_LOGOUT_OPTIONS: AutoLogoutMinutes[] = [0, 15, 30, 60]

export const DEFAULT_APP_SETTINGS: AppSettings = {
  name: 'أرض كنعان',
  responsibleName: '',
  phone: '',
  address: '',
  logo: '',
  taxId: '',
  voucherFooter: '',
  currencySymbol: '₪',
  maxVoucherAmount: HARD_MAX_VOUCHER_AMOUNT,
  dateFormat: 'dmy',
  requireCancelReason: true,
  doubleConfirmCancel: false,
  blockFutureDate: false,
  attentionCount: 3,
  tableDensity: 'comfortable',
  enableMotion: true,
  collapseStatementSummary: true,
  defaultReportPeriod: 'all',
  autoLogoutMinutes: 0,
}

const STORAGE_KEY = 'ard-kanaan:settings'
// The pre-consolidation key that only held the four center-identity fields.
const LEGACY_CENTER_KEY = 'ard-kanaan:center-settings'

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

function autoLogout(value: unknown, fallback: AutoLogoutMinutes): AutoLogoutMinutes {
  const n = typeof value === 'number' ? value : Number(value)
  return AUTO_LOGOUT_OPTIONS.includes(n as AutoLogoutMinutes) ? (n as AutoLogoutMinutes) : fallback
}

// Trusts nothing from storage: every field is validated and clamped back into a
// safe range, so a corrupt or hand-edited entry can never break the app.
export function sanitizeSettings(raw: Partial<AppSettings> | null | undefined): AppSettings {
  const d = DEFAULT_APP_SETTINGS
  if (!raw || typeof raw !== 'object') return { ...d }
  return {
    name: str(raw.name, d.name).trim() || d.name,
    responsibleName: str(raw.responsibleName, d.responsibleName).trim(),
    phone: str(raw.phone, d.phone).trim(),
    address: str(raw.address, d.address).trim(),
    logo: str(raw.logo, d.logo).startsWith('data:image/') ? String(raw.logo) : '',
    taxId: str(raw.taxId, d.taxId).trim(),
    voucherFooter: str(raw.voucherFooter, d.voucherFooter).trim(),
    currencySymbol: str(raw.currencySymbol, d.currencySymbol).trim().slice(0, 6) || d.currencySymbol,
    maxVoucherAmount: clampInt(raw.maxVoucherAmount, 1, HARD_MAX_VOUCHER_AMOUNT, d.maxVoucherAmount),
    dateFormat: oneOf(raw.dateFormat, ['dmy', 'ymd'], d.dateFormat),
    requireCancelReason: bool(raw.requireCancelReason, d.requireCancelReason),
    doubleConfirmCancel: bool(raw.doubleConfirmCancel, d.doubleConfirmCancel),
    blockFutureDate: bool(raw.blockFutureDate, d.blockFutureDate),
    attentionCount: clampInt(raw.attentionCount, MIN_ATTENTION_COUNT, MAX_ATTENTION_COUNT, d.attentionCount),
    tableDensity: oneOf(raw.tableDensity, ['comfortable', 'compact'], d.tableDensity),
    enableMotion: bool(raw.enableMotion, d.enableMotion),
    collapseStatementSummary: bool(raw.collapseStatementSummary, d.collapseStatementSummary),
    defaultReportPeriod: oneOf(raw.defaultReportPeriod, ['all', 'month', 'week'], d.defaultReportPeriod),
    autoLogoutMinutes: autoLogout(raw.autoLogoutMinutes, d.autoLogoutMinutes),
  }
}

// Reads and validates the stored settings, migrating the legacy center-only key
// on first run so the operator never loses their center identity.
export function loadAppSettings(): AppSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_APP_SETTINGS }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) return sanitizeSettings(JSON.parse(raw) as Partial<AppSettings>)

    const legacy = window.localStorage.getItem(LEGACY_CENTER_KEY)
    if (legacy) {
      const parsed = JSON.parse(legacy) as Partial<AppSettings>
      const migrated = sanitizeSettings({
        name: parsed.name,
        responsibleName: parsed.responsibleName,
        phone: parsed.phone,
        address: parsed.address,
      })
      persistAppSettings(migrated)
      return migrated
    }
  } catch {
    // fall through to defaults on any parse/storage error
  }
  return { ...DEFAULT_APP_SETTINGS }
}

export function persistAppSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // storage may be full or blocked (private mode) — settings stay in-memory
  }
}
