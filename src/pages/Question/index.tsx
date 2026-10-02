import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Panel } from '@/components/ui/Panel'
import { getQuestionForDay } from '@/data/journey'
import { useJourney } from '@/app/providers/JourneyProvider'

export function QuestionPage() {
  const { currentDay, answers, progress, saveAnswer, supabaseError } = useJourney()
  const currentQuestion = getQuestionForDay(currentDay)
  const storedAnswer = answers[currentDay] ?? ''
  const [answer, setAnswer] = useState(storedAnswer)
  const [isSaved, setIsSaved] = useState(Boolean(storedAnswer))

  useEffect(() => {
    setAnswer(storedAnswer)
    setIsSaved(Boolean(storedAnswer))
  }, [currentDay, storedAnswer])

  const handleSave = () => {
    if (!answer.trim()) return
    saveAnswer(currentDay, answer.trim())
    setIsSaved(true)
  }

  return (
    <Panel
      title={`Dag ${currentDay} van 365`}
    >
      <div className="mb-6">
        <Link
          to="/"
          aria-label="Terug naar Home"
          className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--line)] text-3xl leading-none text-[var(--text-main)] transition hover:border-[var(--gold-muted)] hover:text-[var(--gold)]"
        >
          ‹
        </Link>
        <div
          className="relative mt-3 h-2 overflow-hidden rounded-full bg-[rgba(132,151,163,0.32)]"
          role="progressbar"
          aria-label={`Voortgang: ${progress.percentage}%`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percentage}
        >
          <div
            className="h-full rounded-full bg-[var(--gold)] transition-[width] duration-500"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl border border-[var(--line)] bg-[rgba(10,15,22,0.7)] p-5 sm:p-7">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--gold-muted)]">
            {currentQuestion?.title ?? 'Vraag van vandaag'}
          </p>
          <p className="mt-5 max-w-3xl text-xl leading-relaxed text-[var(--text-main)] sm:text-2xl">
            “{currentQuestion?.question ?? 'Er is voor deze dag nog geen vraag beschikbaar.'}”
          </p>
          <div className="mt-6 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.02)] p-4 text-sm leading-relaxed text-[var(--text-subtle)]">
            Neem de tijd. Er is geen goed of fout antwoord. Schrijf wat er in je opkomt.
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[rgba(10,15,22,0.7)] p-5 sm:p-7">
          <label className="mb-3 block font-serif text-2xl text-[var(--text-main)]">Mijn antwoord</label>
          {supabaseError ? (
            <p className="mb-4 rounded-xl border border-red-400/40 bg-red-400/10 p-3 text-sm leading-relaxed text-red-200" role="alert">
              Supabase-melding: {supabaseError}
            </p>
          ) : null}
          <textarea
            value={answer}
            onChange={(event) => {
              setAnswer(event.target.value)
              setIsSaved(false)
            }}
            className="min-h-56 w-full resize-y rounded-xl border border-[var(--line)] bg-[rgba(9,13,18,0.7)] p-4 text-base text-[var(--text-main)] outline-none transition focus:border-[var(--gold)]"
            placeholder="Schrijf hier je gedachten..."
          />
          {isSaved ? <p className="mt-3 text-sm text-[var(--gold-muted)]" role="status">Antwoord opgeslagen</p> : null}
          <button
            type="button"
            onClick={handleSave}
            disabled={!answer.trim()}
            className="mt-5 inline-flex w-full justify-center rounded-xl border border-[var(--gold)] bg-[var(--gold)] px-5 py-3 text-sm font-semibold tracking-wide text-[var(--ink)] transition hover:bg-[#e2c394] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Mijn antwoord opslaan <span className="ml-2">›</span>
          </button>
        </div>
      </div>
    </Panel>
  )
}
