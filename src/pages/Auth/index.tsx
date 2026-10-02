import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Panel } from '@/components/ui/Panel'
import { useAuth } from '@/app/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'

export function AuthPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  if (loading) return <p className="text-[var(--text-subtle)]">Sessie laden...</p>
  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!supabase) {
      setError('Supabase is nog niet geconfigureerd in de environment variables.')
      return
    }

    const result = isRegistering
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (result.error) {
      setError(result.error.message)
      return
    }

    if (isRegistering && !result.data.session) {
      setMessage('Controleer je e-mail om je account te bevestigen.')
      return
    }

    navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true })
  }

  return (
    <div className="mx-auto max-w-xl pt-12">
      <Panel
        title={isRegistering ? 'Begin je leerlingreis' : 'Welkom terug'}
        subtitle="Je antwoorden blijven persoonlijk en privé."
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm text-[var(--text-subtle)]">
            E-mailadres
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[rgba(9,13,18,0.7)] p-3 text-[var(--text-main)] outline-none focus:border-[var(--gold)]"
            />
          </label>
          <label className="block text-sm text-[var(--text-subtle)]">
            Wachtwoord
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[rgba(9,13,18,0.7)] p-3 text-[var(--text-main)] outline-none focus:border-[var(--gold)]"
            />
          </label>
          {error && <p className="text-sm text-red-300">{error}</p>}
          {message && <p className="text-sm text-[var(--gold-muted)]">{message}</p>}
          <button
            type="submit"
            className="w-full rounded-full border border-[var(--gold)] bg-[var(--gold)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-[#e2c394]"
          >
            {isRegistering ? 'Account maken' : 'Inloggen'}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setIsRegistering((value) => !value)}
          className="mt-5 text-sm text-[var(--gold-muted)] underline-offset-4 hover:underline"
        >
          {isRegistering ? 'Ik heb al een account' : 'Nieuw account maken'}
        </button>
      </Panel>
    </div>
  )
}