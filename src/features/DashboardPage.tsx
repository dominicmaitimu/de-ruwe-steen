import { useEffect, useState } from 'react'
import { getDailyQuestion, getGreeting, toDateKey } from '../check-in/check-in.logic'
import { checkInRepository } from '../check-in/check-in.repository'
import type { CheckIn, Pillar } from '../check-in/check-in.types'
import { ScoreSummary } from '../check-in/check-in.components'
import { HabitDashboardSection } from '../habits/HabitDashboardSection'
import { GoalDashboardSection } from '../goals/GoalDashboardSection'
import { ActivityDashboardSection } from '../activities/ActivityDashboardSection'
import { ReflectionDashboardSection } from '../reflections/ReflectionDashboardSection'
import { useLocalDate } from '../hooks/useLocalDate'
import { formatDateDisplay } from '../utils/format-date'

interface DashboardPageProps {
  onOpenCheckIn: (date: string, existing?: CheckIn | null) => void
  onOpenHistory: () => void
  onOpenStatistics: () => void
  onOpenHabits: (pillarId?: string) => void
  onOpenGoals: () => void
  onOpenActivities: (create?: boolean) => void
  onOpenReflections: (create?: boolean) => void
  onHabitsUpdated: () => void
  refreshKey: number
}

export function DashboardPage({
  onOpenCheckIn,
  onOpenHistory,
  onOpenStatistics,
  onOpenHabits,
  onOpenGoals,
  onOpenActivities,
  onOpenReflections,
  onHabitsUpdated,
  refreshKey,
}: DashboardPageProps) {
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [todayCheckIn, setTodayCheckIn] = useState<CheckIn | null>(null)
  const [recentCheckIns, setRecentCheckIns] = useState<CheckIn[]>([])
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<{ key: string; message: string } | null>(null)
  const now = useLocalDate()
  const today = toDateKey(now)
  const loadKey = `${today}:${refreshKey}`
  const loading = loadedKey !== loadKey
  const error = loadError?.key === loadKey ? loadError.message : null

  useEffect(() => {
    let active = true

    void Promise.all([
      checkInRepository.getPillars(),
      checkInRepository.getByDate(today),
      checkInRepository.getBetween('0000-01-01', today),
    ]).then(([nextPillars, nextToday, nextCheckIns]) => {
      if (!active) return
      setPillars(nextPillars)
      setTodayCheckIn(nextToday)
      setRecentCheckIns(nextCheckIns.slice(0, 3))
      setLoadError(null)
    }).catch((reason: unknown) => {
      if (!active) return
      setLoadError({ key: loadKey, message: reason instanceof Error ? reason.message : String(reason) })
    }).finally(() => {
      if (active) setLoadedKey(loadKey)
    })

    return () => {
      active = false
    }
  }, [loadKey, today])

  return (
    <section className="screen-section dashboard-page">
      <header className="greeting-block">
        <div>
          <p className="eyebrow">{formatDateDisplay(now, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h2>{getGreeting(now.getHours())}</h2>
        </div>
        <p className="greeting-note">Een moment voor jezelf, op jouw manier.</p>
      </header>

      {error ? <div className="inline-error" role="alert">Gegevens konden niet worden geladen: {error}</div> : null}
      {loading ? <div className="loading-card" role="status">Je gegevens laden…</div> : null}

      {!loading && !error ? (
        <>
          <article className={`checkin-card ${todayCheckIn ? 'complete' : ''}`}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Dagelijkse check-in</p>
                <h2>{todayCheckIn ? 'Je hebt al stilgestaan bij vandaag' : 'Hoe gaat het met jou vandaag?'}</h2>
              </div>
              <span className="checkin-mark" aria-hidden="true">{todayCheckIn ? '✓' : '○'}</span>
            </div>
            {todayCheckIn ? (
              <>
                <ScoreSummary values={todayCheckIn} />
                {todayCheckIn.reflection ? <p className="checkin-note">{todayCheckIn.reflection}</p> : null}
              </>
            ) : (
              <p>Een korte check-in om op te merken hoe je je voelt. Er is geen goed of fout antwoord.</p>
            )}
            <button
              type="button"
              className="primary-button"
              onClick={() => onOpenCheckIn(today, todayCheckIn)}
            >
              {todayCheckIn ? 'Bekijk of pas aan' : 'Start check-in'}
            </button>
          </article>

          <section className="content-card">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Jouw kompas</p>
                <h2>De vijf pijlers</h2>
              </div>
            </div>
            <div className="pillar-grid">
              {pillars.map((pillar) => (
                <button type="button" className="pillar-item pillar-button" key={pillar.id} onClick={() => onOpenHabits(pillar.id)} aria-label={`Bekijk gewoontes bij pijler ${pillar.name}`}>
                  <span className="pillar-icon" style={{ backgroundColor: pillar.color }} aria-hidden="true">{pillar.icon}</span>
                  <span>{pillar.name}</span>
                </button>
              ))}
            </div>
          </section>

          <article className="question-card">
            <p className="eyebrow">Vraag van de dag</p>
            <h2>{getDailyQuestion(now)}</h2>
            <p>Je hoeft het antwoord niet op te schrijven. Neem het mee als je wilt.</p>
          </article>

          <section className="content-card">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Jouw ruimte</p>
                <h2>Persoonlijke samenvatting</h2>
              </div>
            </div>
            <GoalDashboardSection refreshKey={refreshKey} onOpenGoals={onOpenGoals} />
            <HabitDashboardSection date={today} refreshKey={refreshKey} onOpenHabits={onOpenHabits} onUpdated={onHabitsUpdated} />
            <ActivityDashboardSection refreshKey={refreshKey} onOpenActivities={onOpenActivities} />
            <ReflectionDashboardSection refreshKey={refreshKey} onOpenReflections={onOpenReflections} />
            <div className="recent-header">
              <h3>Recente check-ins</h3>
              <button type="button" className="text-button" onClick={onOpenHistory}>Bekijk historie</button>
            </div>
            {recentCheckIns.length ? (
              <ul className="recent-checkins">
                {recentCheckIns.map((checkIn) => (
                  <li key={checkIn.id}>
                    <button type="button" onClick={() => onOpenCheckIn(checkIn.date, checkIn)}>
                      <span>{formatDateDisplay(new Date(`${checkIn.date}T12:00:00`), { day: 'numeric', month: 'short' })}</span>
                      <span>Stemming {checkIn.mood} · Energie {checkIn.energy}</span>
                      <span aria-hidden="true">›</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-copy">Je check-ins verschijnen hier wanneer je er een hebt ingevuld.</p>
            )}
            <button type="button" className="secondary-button full-width" onClick={onOpenStatistics}>
              Bekijk ontwikkeling over tijd
            </button>
          </section>
        </>
      ) : null}
    </section>
  )
}
