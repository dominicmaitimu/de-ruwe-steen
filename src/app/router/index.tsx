import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { AppShell } from '@/components/layout/AppShell'
import { HomePage } from '@/pages/Home'
import { ProgressPage } from '@/pages/Progress'
import { ReflectionPage } from '@/pages/Reflection'
import { QuestionPage } from '@/pages/Question'
import { StonePage } from '@/pages/Stone'
import { AuthPage } from '@/pages/Auth'
import { FinalDayPage } from '@/pages/FinalDay'
import { TransformationPage } from '@/pages/Transformation'

function ProtectedApp() {
  const { user, loading } = useAuth()
  if (loading) return <p className="p-8 text-[var(--text-subtle)]">Sessie laden...</p>
  if (!user) return <Navigate to="/inloggen" replace />

  return (
    <AppShell />
  )
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/inloggen" element={<AuthPage />} />
      <Route element={<ProtectedApp />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/vraag" element={<QuestionPage />} />
        <Route path="/antwoord" element={<Navigate to="/vraag" replace />} />
        <Route path="/steen" element={<StonePage />} />
        <Route path="/voortgang" element={<ProgressPage />} />
        <Route path="/reflectie" element={<ReflectionPage />} />
        <Route path="/transformatie" element={<TransformationPage />} />
        <Route path="/themas" element={<Navigate to="/voortgang" replace />} />
        <Route path="/eindpunt" element={<FinalDayPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
