import { useEffect, useState } from 'react'
import './App.css'
import { AppProviders } from './app/providers/AppProviders'
import { AppRouter } from './app/router'
import { databaseService } from './services/database.service'
import { settingsRepository, type AppPreferences, type ThemePreference } from './settings/settings.repository'
import { useSystemTheme } from './hooks/useSystemTheme'
import { getErrorMessage } from './utils/errors'

const defaultPreferences: AppPreferences = { theme: 'system', dateFormat: 'localized' }

function App() {
  const [preferences, setPreferences] = useState(defaultPreferences)
  const [retry, setRetry] = useState(0)
  const [databaseReady, setDatabaseReady] = useState(false)
  const [databaseError, setDatabaseError] = useState<string | null>(null)
  const theme = useSystemTheme(preferences.theme)

  useEffect(() => {
    document.body.dataset.theme = theme
    document.body.dataset.dateFormat = preferences.dateFormat
  }, [preferences.dateFormat, theme])

  useEffect(() => {
    let active = true
    void databaseService.initialize()
      .then(() => settingsRepository.load())
      .then((loadedPreferences) => {
        if (!active) return
        setPreferences(loadedPreferences)
        setDatabaseReady(true)
      })
      .catch((reason: unknown) => {
        if (active) setDatabaseError(getErrorMessage(reason))
      })
    return () => {
      active = false
    }
  }, [retry])

  const reloadPreferences = async () => {
    setPreferences(await settingsRepository.load())
  }

  const setTheme = async (themePreference: ThemePreference) => {
    await settingsRepository.setTheme(themePreference)
    setPreferences((current) => ({ ...current, theme: themePreference }))
  }

  const setDateFormat = async (dateFormat: AppPreferences['dateFormat']) => {
    await settingsRepository.setDateFormat(dateFormat)
    setPreferences((current) => ({ ...current, dateFormat }))
  }

  if (!databaseReady) {
    return databaseError ? (
      <main className="mx-auto mt-8 max-w-xl rounded-2xl border border-red-400/40 bg-red-400/10 p-6 text-red-100">
        <h1 className="font-serif text-2xl">De lokale gegevens konden niet worden geopend</h1>
        <p className="mt-2 text-sm" role="alert">{databaseError}</p>
        <button type="button" className="mt-4 rounded-lg border border-red-200/50 px-4 py-2" onClick={() => setRetry((value) => value + 1)}>
          Opnieuw proberen
        </button>
      </main>
    ) : (
      <p className="p-8 text-[var(--text-subtle)]" role="status">De lokale database wordt geopend…</p>
    )
  }

  return (
    <AppProviders>
      <AppRouter
        preferences={preferences}
        onThemeChange={setTheme}
        onDateFormatChange={setDateFormat}
        onPreferencesReload={reloadPreferences}
      />
    </AppProviders>
  )
}

export default App
