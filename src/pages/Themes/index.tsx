import { Panel } from '@/components/ui/Panel'
import { useJourney } from '@/app/providers/JourneyProvider'
import { journeyContent } from '@/data/journey'

export function ThemesPage() {
  const { answers } = useJourney()

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
    <Panel title="Thema's" subtitle="Jouw werk bekeken vanuit verschillende invalshoeken.">
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
    </Panel>
  )
}