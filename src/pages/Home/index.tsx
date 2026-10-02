import { Link } from 'react-router-dom'
import { useJourney } from '@/app/providers/JourneyProvider'
import { StoneCanvas } from '@/components/stone/StoneCanvas'

export function HomePage() {
  const { currentDay, progress, answers } = useJourney()
  const hasStartedToday = Boolean(answers[currentDay])

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[rgba(7,12,16,0.72)] px-5 pb-5 pt-6 sm:p-8">
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--gold-muted)]">Dag {currentDay} van 365</p>
          <h2 className="mt-2 text-4xl text-[var(--text-main)] sm:text-5xl">De Ruwe Steen</h2>
          <p className="mt-2 max-w-md text-[var(--text-subtle)]">Elke dag een kleine stap dichter bij jezelf.</p>
        </div>

        <div className="-mx-5 mt-3 sm:mx-0 sm:mt-5">
          <StoneCanvas
            stage={Math.min(Math.floor(progress.completedCount / 7), 52)}
            progress={progress.percentage}
          />
        </div>

        <p className="mt-4 text-center font-serif text-sm italic text-[var(--text-subtle)]">
          “Niet om volmaakt te zijn, maar om bewuster te worden.”
        </p>

        <div className="mt-5 flex justify-center">
          {hasStartedToday ? (
            <Link
              to="/vraag"
              className="inline-flex w-full justify-center rounded-xl border border-[var(--gold)] bg-[var(--gold)] px-5 py-3 text-sm font-semibold tracking-wide text-[var(--ink)] transition hover:bg-[#e2c394] sm:w-auto"
            >
              Bekijk vandaag <span className="ml-2">›</span>
            </Link>
          ) : (
            <Link
              to="/vraag"
              className="inline-flex w-full justify-center rounded-xl border border-[var(--gold)] bg-[var(--gold)] px-5 py-3 text-sm font-semibold tracking-wide text-[var(--ink)] transition hover:bg-[#e2c394] sm:w-auto"
            >
              Begin vandaag <span className="ml-2">›</span>
            </Link>
          )}
        </div>
      </section>

    </div>
  )
}
