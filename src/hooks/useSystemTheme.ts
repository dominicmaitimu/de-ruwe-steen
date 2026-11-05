import { useSyncExternalStore } from 'react'
import type { ThemePreference } from '../settings/settings.repository'

export type ThemeMode = 'light' | 'dark'

export function useSystemTheme(preference: ThemePreference = 'system'): ThemeMode {
  const getSnapshot = () => {
    if (preference !== 'system') return preference
    if (typeof window === 'undefined') {
      return 'light'
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  return useSyncExternalStore(
    (notify) => {
      if (preference !== 'system') return () => undefined
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => notify()

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    },
    getSnapshot,
    () => 'light',
  )
}
