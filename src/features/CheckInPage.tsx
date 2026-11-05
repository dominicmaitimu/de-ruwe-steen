import { useEffect, useState } from 'react'
import { isCheckInDraftValid } from '../check-in/check-in.logic'
import { checkInRepository } from '../check-in/check-in.repository'
import { ScoreSlider } from '../check-in/check-in.components'
import type { CheckIn, CheckInDraft, CheckInScoreField } from '../check-in/check-in.types'
import { formatDateDisplay } from '../utils/format-date'

interface CheckInPageProps {
  date: string
  onSaved: () => void
}

const scoreQuestions: { field: CheckInScoreField; label: string; description: string }[] = [
  { field: 'mood', label: 'Stemming', description: '1 = zwaar · 10 = licht' },
  { field: 'energy', label: 'Energie', description: '1 = uitgeput · 10 = energiek' },
  { field: 'mentalCalm', label: 'Mentale rust', description: '1 = onrustig · 10 = rustig' },
  { field: 'satisfaction', label: 'Tevredenheid', description: '1 = niet tevreden · 10 = tevreden' },
]

function draftFromCheckIn(checkIn: CheckIn | null, date: string): CheckInDraft {
  if (!checkIn) {
    return {
      date,
      mood: 5,
      energy: 5,
      mentalCalm: 5,
      satisfaction: 5,
      didSomethingForSelf: null,
      reflection: '',
    }
  }

  return {
    date: checkIn.date,
    mood: checkIn.mood,
    energy: checkIn.energy,
    mentalCalm: checkIn.mentalCalm,
    satisfaction: checkIn.satisfaction,
    didSomethingForSelf: checkIn.didSomethingForSelf,
    reflection: checkIn.reflection ?? '',
  }
}

export function CheckInPage({ date, onSaved }: CheckInPageProps) {
  const [draft, setDraft] = useState<CheckInDraft>(() => draftFromCheckIn(null, date))
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void checkInRepository.getByDate(date).then((existing) => {
      if (active) setDraft(draftFromCheckIn(existing, date))
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : String(reason))
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => {
      active = false
    }
  }, [date])

  const setScore = (field: CheckInScoreField, value: number) => {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  const save = async () => {
    if (!isCheckInDraftValid(draft)) {
      setError('Controleer je antwoorden en probeer opnieuw.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await checkInRepository.save(draft)
      onSaved()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
      setSaving(false)
    }
  }

  const dateLabel = formatDateDisplay(new Date(`${date}T12:00:00`), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <section className="screen-section">
      {loading ? <div className="loading-card" role="status">Check-in laden…</div> : null}
      {!loading ? (
        <form
          className="form-card"
          onSubmit={(event) => {
            event.preventDefault()
            if (step === 1) {
              setStep(2)
              setError(null)
              return
            }
            void save()
          }}
        >
          <div className="form-intro">
            <p className="eyebrow">{dateLabel}</p>
            <h2>Even bij jezelf inchecken</h2>
            <p>Er zijn geen goede of foute antwoorden. Kies wat nu bij je past.</p>
          </div>

          <div className="form-progress" aria-label={`Stap ${step} van 2`}>
            <span className={step === 1 ? 'current' : 'complete'} />
            <span className={step === 2 ? 'current' : ''} />
            <small>Stap {step} van 2 · ongeveer 1 minuut</small>
          </div>

          {step === 1 ? (
            <div className="score-list">
              {scoreQuestions.slice(0, 3).map((question) => (
                <ScoreSlider
                  key={question.field}
                  {...question}
                  value={draft[question.field]}
                  onChange={setScore}
                />
              ))}
            </div>
          ) : (
            <div className="score-list">
              <ScoreSlider
                {...scoreQuestions[3]}
                value={draft.satisfaction}
                onChange={setScore}
              />
              <fieldset className="self-care-fieldset">
                <legend>Heb ik vandaag iets voor mezelf gedaan?</legend>
                <div className="choice-row">
                  <button
                    type="button"
                    className={`choice-button ${draft.didSomethingForSelf ? 'selected' : ''}`}
                    aria-pressed={draft.didSomethingForSelf === true}
                    onClick={() => setDraft((current) => ({ ...current, didSomethingForSelf: true }))}
                  >
                    Ja
                  </button>
                  <button
                    type="button"
                    className={`choice-button ${draft.didSomethingForSelf === false ? 'selected' : ''}`}
                    aria-pressed={draft.didSomethingForSelf === false}
                    onClick={() => setDraft((current) => ({ ...current, didSomethingForSelf: false }))}
                  >
                    Nee
                  </button>
                </div>
              </fieldset>
              <label className="reflection-label" htmlFor="check-in-reflection">
                Wat houdt me vandaag bezig? <span>Optioneel</span>
              </label>
              <textarea
                id="check-in-reflection"
                rows={3}
                maxLength={2000}
                placeholder="Schrijf iets op als je daar behoefte aan hebt…"
                value={draft.reflection}
                onChange={(event) => {
                  const reflection = event.currentTarget.value
                  setDraft((current) => ({ ...current, reflection }))
                }}
              />
            </div>
          )}

          {error ? <div className="inline-error" role="alert">Opslaan is niet gelukt: {error}</div> : null}
          <div className="form-actions">
            {step === 2 ? (
              <button type="button" className="secondary-button" disabled={saving} onClick={() => setStep(1)}>
                Vorige
              </button>
            ) : null}
            {step === 1 ? (
              <button type="submit" className="primary-button">
                Verder
              </button>
            ) : (
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Opslaan…' : 'Check-in bewaren'}
              </button>
            )}
          </div>
        </form>
      ) : null}
    </section>
  )
}
