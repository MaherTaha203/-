import { create } from 'zustand'

import {
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  persistAppSettings,
  sanitizeSettings,
  type AppSettings,
} from '@/lib/app-settings'

type SettingsStore = {
  settings: AppSettings
  // Merge a partial change, re-validate, persist, and publish. Immutable: a new
  // settings object is produced every time.
  update: (patch: Partial<AppSettings>) => void
  // Restore every setting to its default.
  reset: () => void
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: loadAppSettings(),
  update: (patch) => {
    const next = sanitizeSettings({ ...get().settings, ...patch })
    persistAppSettings(next)
    set({ settings: next })
  },
  reset: () => {
    persistAppSettings(DEFAULT_APP_SETTINGS)
    set({ settings: { ...DEFAULT_APP_SETTINGS } })
  },
}))

// Synchronous snapshot for non-React callers (print templates, one-off reads).
// React components should subscribe with useSettingsStore for reactivity.
export function getSettings(): AppSettings {
  return useSettingsStore.getState().settings
}
