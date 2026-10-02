import { useState, type FormEvent } from 'react'
import { Panel } from '@/components/ui/Panel'
import { useJourney } from '@/app/providers/JourneyProvider'

function formatReflectionDate(createdAt: string) {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(createdAt))
}

export function ReflectionPage() {
  const { reflections, saveReflection, supabaseError } = useJourney()
  const [text, setText] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!text.trim()) return
    saveReflection(text)
    setText('')
  }

  return (
    <div className="space-y-5">
      <Panel title="Reflectie" subtitle="Leg vast wat je onderweg opvalt.">
        {supabaseError ? (
          <p className="mb-4 rounded-xl border border-red-400/40 bg-red-400/10 p-3 text-sm leading-relaxed text-red-200" role="alert">
            Supabase-melding: {supabaseError}
          </p>
        ) : null}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="reflection" className="sr-only">Nieuwe reflectie</label>
          <textarea
            id="reflection"
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="min-h-40 w-full resize-y rounded-xl border border-[var(--line)] bg-[rgba(9,13,18,0.7)] p-4 text-base text-[var(--text-main)] outline-none transition focus:border-[var(--gold)]"
            placeholder="Wat valt je vandaag op?"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!text.trim()}
              className="rounded-xl border border-[var(--gold)] bg-[var(--gold)] px-5 py-3 text-sm font-semibold tracking-wide text-[var(--ink)] transition hover:bg-[#e2c394] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reflectie plaatsen
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Mijn reflecties" subtitle="Een terugblik op wat je onderweg hebt gezien.">
        {reflections.length === 0 ? (
          <p className="text-sm leading-relaxed text-[var(--text-subtle)]">
            Je eerste reflectie verschijnt hier zodra je iets hebt gedeeld.
          </p>
        ) : (
          <div className="space-y-3">
            {reflections.map((reflection) => (
              <article key={reflection.id} className="rounded-xl border border-[var(--line)] bg-[rgba(0,0,0,0.16)] p-4">
                <p className="whitespace-pre-wrap font-serif text-lg italic leading-relaxed text-[var(--text-main)]">
                  “{reflection.text}”
                </p>
                <p className="mt-3 text-xs text-[var(--text-subtle)]">{formatReflectionDate(reflection.createdAt)}</p>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
