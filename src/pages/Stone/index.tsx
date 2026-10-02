import { Panel } from '@/components/ui/Panel'
import { useJourney } from '@/app/providers/JourneyProvider'
import { StoneCanvas } from '@/components/stone/StoneCanvas'
import { Link } from 'react-router-dom'

export function StonePage() {
  const { progress } = useJourney()
  const demoProgressValue = Number(new URLSearchParams(window.location.search).get('demoProgress'))
  const demoProgress =
    import.meta.env.DEV && Number.isInteger(demoProgressValue) && demoProgressValue >= 1 && demoProgressValue <= 100
      ? demoProgressValue
      : null
  const demoCompletedDays = demoProgress === null ? 0 : Math.floor((demoProgress / 100) * 365)
  const displayedProgress = demoProgress !== null
    ? {
        ...progress,
        currentDay: Math.min(demoCompletedDays + 1, 365),
        percentage: demoProgress,
        week: Math.min(Math.floor(demoCompletedDays / 7) + 1, 52),
        completedCount: demoCompletedDays,
      }
    : progress
  const stage = Math.min(Math.floor(displayedProgress.completedCount / 7), 52)

  return (
    <Panel title="Mijn Steen" subtitle={`Week ${displayedProgress.week} · Stage ${stage}`}>
      {demoProgress && (
        <p className="mb-5 rounded-lg border border-[var(--gold-muted)] bg-[rgba(200,169,122,0.1)] px-3 py-2 text-center text-xs text-[var(--gold-muted)]">
          Testweergave op {demoProgress}% · echte voortgang is niet gewijzigd
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--line)] bg-[rgba(0,0,0,0.2)] p-4">
          <p className="text-xs uppercase tracking-[0.1em] text-[var(--gold-muted)]">Week</p>
          <p className="mt-2 text-3xl">{displayedProgress.week}</p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[rgba(0,0,0,0.2)] p-4">
          <p className="text-xs uppercase tracking-[0.1em] text-[var(--gold-muted)]">Dag</p>
          <p className="mt-2 text-3xl">{displayedProgress.currentDay} / 365</p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[rgba(0,0,0,0.2)] p-4">
          <p className="text-xs uppercase tracking-[0.1em] text-[var(--gold-muted)]">Voortgang</p>
          <p className="mt-2 text-3xl">{displayedProgress.percentage}%</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-dashed border-[var(--line)] bg-[rgba(6,10,14,0.65)] p-8 text-center">
        <StoneCanvas stage={stage} progress={displayedProgress.percentage} />
        <p className="mt-4 text-sm text-[var(--text-subtle)]">
          Stage {stage} van 52 · De vorm verandert alleen door werkelijk voltooide dagen.
        </p>
        <Link
          to="/transformatie"
          className="mt-4 inline-flex rounded-full border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--text-subtle)] transition hover:border-[var(--gold-muted)] hover:text-[var(--text-main)]"
        >
          Bekijk de transformatie
        </Link>
      </div>
    </Panel>
  )
}
