import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useJourney } from '../../journey/journey.context'
import { AppShell } from '../../components/layout/AppShell'
import { FinalDayPage } from '../../pages/FinalDay'
import { HomePage } from '../../pages/Home'
import { ProgressPage } from '../../pages/Progress'
import { QuestionPage } from '../../pages/Question'
import { ReflectionPage } from '../../pages/Reflection'
import { StonePage } from '../../pages/Stone'
import { TransformationPage } from '../../pages/Transformation'
import { SettingsPage } from '../../settings/SettingsPage'
import type { AppPreferences, ThemePreference } from '../../settings/settings.repository'
import { getErrorMessage } from '../../utils/errors'

interface AppRouterProps {
  preferences: AppPreferences
  onThemeChange: (theme: ThemePreference) => Promise<void>
  onDateFormatChange: (format: AppPreferences['dateFormat']) => Promise<void>
  onPreferencesReload: () => Promise<void>
}

function SettingsRoute({ preferences, onThemeChange, onDateFormatChange, onPreferencesReload }: AppRouterProps) {
  const navigate = useNavigate()
  const { refresh } = useJourney()
  const [dataError, setDataError] = useState<string | null>(null)

  const handleDataChanged = () => {
    setDataError(null)
    void Promise.all([refresh(), onPreferencesReload()])
      .then(() => navigate('/', { replace: true }))
      .catch((reason: unknown) => setDataError(getErrorMessage(reason)))
  }

  return (
    <>
      {dataError ? <p className="mb-4 rounded-xl border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200" role="alert">{dataError}</p> : null}
      <SettingsPage
        preferences={preferences}
        onThemeChange={onThemeChange}
        onDateFormatChange={onDateFormatChange}
        onClose={() => navigate('/', { replace: true })}
        onDataChanged={handleDataChanged}
      />
    </>
  )
}

function AndroidBackButton() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return
    const listener = CapacitorApp.addListener('backButton', () => {
      if (pathname !== '/') {
        navigate('/')
        return
      }
      void CapacitorApp.exitApp().catch((reason: unknown) => {
        console.error('Unable to exit the app:', getErrorMessage(reason))
      })
    })
    return () => {
      void listener.then((handle) => handle.remove()).catch((reason: unknown) => {
        console.error('Unable to remove the Android back button listener:', getErrorMessage(reason))
      })
    }
  }, [navigate, pathname])

  return null
}

export function AppRouter(props: AppRouterProps) {
  return (
    <>
      <AndroidBackButton />
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/inloggen" element={<Navigate to="/" replace />} />
          <Route path="/vraag" element={<QuestionPage />} />
          <Route path="/antwoord" element={<Navigate to="/vraag" replace />} />
          <Route path="/steen" element={<StonePage />} />
          <Route path="/voortgang" element={<ProgressPage />} />
          <Route path="/reflectie" element={<ReflectionPage />} />
          <Route path="/transformatie" element={<TransformationPage />} />
          <Route path="/themas" element={<Navigate to="/voortgang" replace />} />
          <Route path="/eindpunt" element={<FinalDayPage />} />
          <Route path="/instellingen" element={<SettingsRoute {...props} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  )
}
