import { useEffect } from 'react'

import { useSettingsStore } from '@/store/use-settings-store'

// Reflects the operator's motion and density preferences onto the document root
// so purely-presentational CSS (index.css) can respond without prop-drilling.
export function useApplyRootSettings(): void {
  const enableMotion = useSettingsStore((state) => state.settings.enableMotion)
  const tableDensity = useSettingsStore((state) => state.settings.tableDensity)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.motion = enableMotion ? 'on' : 'off'
    root.dataset.density = tableDensity
  }, [enableMotion, tableDensity])
}

const IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const
const MINUTE_MS = 60_000

// Signs the operator out after a chosen span of inactivity — a shared-device
// safeguard. Disabled when the setting is 0. Any real interaction resets the
// countdown. The timer and listeners are torn down when the span changes or the
// shell unmounts.
export function useIdleLogout(signOut: () => void | Promise<void>): void {
  const minutes = useSettingsStore((state) => state.settings.autoLogoutMinutes)

  useEffect(() => {
    if (minutes <= 0) return

    let timer: ReturnType<typeof setTimeout>
    const arm = () => {
      clearTimeout(timer)
      timer = setTimeout(() => void signOut(), minutes * MINUTE_MS)
    }

    arm()
    for (const event of IDLE_EVENTS) window.addEventListener(event, arm, { passive: true })
    return () => {
      clearTimeout(timer)
      for (const event of IDLE_EVENTS) window.removeEventListener(event, arm)
    }
  }, [minutes, signOut])
}
