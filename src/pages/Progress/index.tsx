import { useState } from 'react'
import { Panel } from '@/components/ui/Panel'
import { useJourney } from '@/app/providers/JourneyProvider'
import { journeyContent } from '@/data/journey'
import { StoneCanvas } from '@/components/stone/StoneCanvas'

export function ProgressPage() {
  const { progress, answers, reflections } = useJourney()
  const [activeTab, setActiveTab] = useState<'overview' | 'themes'>('overview')

  const milestones = [
    { label: 'Start', day: 1, stage: 0 },
    { label: 'Dag 91', day: 91, stage: 13 },
    { label: 'Dag 182', day: 182, stage: 26 },
    { label: 'Dag 273', day: 273, stage: 39 },
    { label: 'Dag 365', day: 365, stage: 52 },
  ]
  const categoryCards = journeyContent.categories.map((category) => {
    const totalQuestions = journeyContent.questions.filter((question) => question.category === category.key).length
    const answeredQuestions = journeyContent.questions.filter((question) => {
      if (question.category !== category.key) return false
      return Object.keys(answers)
        .map((day) => Number(day))
        .some((day) => day >= question.minimumDay && day <= question.maximumDay && Boolean(answers[day]?.trim()))
    }).length

    return {
      ...category,
      totalQuestions,
      answeredQuestions,
      progress: totalQuestions === 0 ? 0 : Math.round((answeredQuestions / totalQuestions) * 100),
    }
  })

  return (
    <Panel title="Mijn Voortgang">
      <div className="mb-6 flex gap-2 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.02)] p-1">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${activeTab === 'overview' ? 'bg-[rgba(200,169,122,0.16)] text-[var(--gold)]' : 'text-[var(--text-subtle)] hover:text-[var(--text-main)]'}`}
        >
          Overzicht
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('themes')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${activeTab === 'themes' ? 'bg-[rgba(200,169,122,0.16)] text-[var(--gold)]' : 'text-[var(--text-subtle)] hover:text-[var(--text-main)]'}`}
        >
          Thema's
        </button>
      </div>

      {activeTab === 'overview' ? (
        <>
          <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {milestones.map((milestone) => (
              <div key={milestone.label} className="min-w-0 text-center">
                <StoneCanvas
                  compact
                  stage={milestone.stage}
                  progress={Math.min((milestone.day / 365) * 100, 100)}
                />
                <p className="mt-2 text-sm text-[var(--text-main)]">{milestone.label}</p>
              </div>
            ))}
          </div>
          <div className="mb-2 h-3 overflow-hidden rounded-full bg-[rgba(132,151,163,0.32)]">
            <div
              className="h-full rounded-full bg-[var(--gold)] transition-all"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <div className="mb-8 flex justify-between gap-4 text-lg text-[var(--text-main)]">
            <span>{progress.percentage}% voltooid</span>
            <span>{Math.max(365 - progress.currentDay, 0)} dagen te gaan</span>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[rgba(10,15,22,0.7)] p-5 sm:p-7">
            <h3 className="font-serif text-2xl text-[var(--text-main)]">Recente inzichten</h3>
            {reflections[0] ? (
              <div className="mt-4">
                <p className="font-serif text-xl italic leading-relaxed text-[var(--text-main)]">“{reflections[0].text}”</p>
                <p className="mt-3 text-sm text-[var(--text-subtle)]">Dag {progress.currentDay}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-[var(--text-subtle)]">
                Je eerste inzicht verschijnt hier vanuit Reflectie.
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          {categoryCards.map((category, index) => (
            <div key={category.key} className="rounded-xl border border-[var(--line)] bg-[rgba(0,0,0,0.16)] p-3">
              <div className="mb-2 flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--gold-muted)] text-[var(--gold)]">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <strong className="block text-sm text-[var(--text-main)]">{category.name}</strong>
                  <span className="text-xs text-[var(--text-subtle)]">{category.description}</span>
                </div>
                <span className="text-xs text-[var(--gold-muted)]">{category.answeredQuestions}/{category.totalQuestions}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
                <div
                  className="h-full rounded-full bg-[var(--gold)] transition-all"
                  style={{ width: `${category.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}
