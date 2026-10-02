import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Panel } from '@/components/ui/Panel'
import { useJourney } from '@/app/providers/JourneyProvider'

const optionalPrompts = [
  { key: 'trigger', label: 'Welke prijs zit hierachter?', options: ['Geen duidelijke', 'Waardering', 'Controle', 'Wanhoop', 'Vertrouwen', 'Vrees'] },
  { key: 'source', label: 'Waar komt dat vandaan?', options: ['Mijn eigen ervaring', 'Een ander', 'Een patroon', 'Een herinnering', 'Een verwachting', 'Geen idee'] },
  { key: 'reaction', label: 'Wat wil je ermee doen?', options: ['Ik wil er meer over nadenken', 'Ik wil dit laten rusten', 'Ik wil het anders formuleren', 'Ik wil het bespreken', 'Ik wil het opnemen in mijn praktijk'] },
] as const

export function AnswerPage() {
  const { currentDay, answers, saveAnswer } = useJourney()
  const storedAnswer = answers[currentDay] ?? ''
  const [answer, setAnswer] = useState(storedAnswer)
  const [selectedPrompts, setSelectedPrompts] = useState<Record<string, string>>({})

  const answerSummary = useMemo(() => {
    const lines = [answer.trim()].filter(Boolean)
    optionalPrompts.forEach((prompt) => {
      if (selectedPrompts[prompt.key]) {
        lines.push(`${prompt.label}: ${selectedPrompts[prompt.key]}`)
      }
    })
    return lines.join('\n\n')
  }, [answer, selectedPrompts])

  const handleSave = () => {
    if (!answer.trim()) return
    saveAnswer(currentDay, answerSummary)
  }

  return (
    <Panel title="Mijn antwoord" subtitle={`Dag ${currentDay} · Reflectie zonder oordeel`}>
      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.1em] text-[var(--gold-muted)]">
            Reflectie
          </label>
          <textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            className="min-h-56 w-full resize-y rounded-xl border border-[var(--line)] bg-[rgba(9,13,18,0.7)] p-4 text-base text-[var(--text-main)] outline-none transition focus:border-[var(--gold)]"
            placeholder="Schrijf rustig en precies. Wat zie je werkelijk in je antwoord?"
          />
        </div>

        <div className="space-y-3">
          {optionalPrompts.map((prompt) => (
            <label key={prompt.key} className="block text-sm text-[var(--text-subtle)]">
              <span className="mb-2 block text-[var(--gold-muted)]">{prompt.label}</span>
              <select
                value={selectedPrompts[prompt.key] ?? ''}
                onChange={(event) =>
                  setSelectedPrompts((current) => ({
                    ...current,
                    [prompt.key]: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-[var(--line)] bg-[rgba(9,13,18,0.7)] p-3 text-[var(--text-main)] outline-none transition focus:border-[var(--gold)]"
              >
                <option value="">Selecteer...</option>
                {prompt.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <Link
            to="/vraag"
            className="rounded-full border border-[var(--line)] px-5 py-2.5 text-sm font-semibold tracking-wide text-[var(--text-subtle)] transition hover:border-[var(--gold-muted)] hover:text-[var(--text-main)]"
          >
            Terug naar vraag
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={!answer.trim()}
            className="rounded-full border border-[var(--gold)] bg-[rgba(200,169,122,0.18)] px-5 py-2.5 text-sm font-semibold tracking-wide text-[var(--text-main)] transition hover:bg-[rgba(200,169,122,0.3)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Opslaan
          </button>
        </div>
      </div>
    </Panel>
  )
}
