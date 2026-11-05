import { useEffect, useMemo, useState } from 'react'
import { toDateKey } from '../check-in/check-in.logic'
import { useLocalDate } from '../hooks/useLocalDate'
import {
  daysBetween,
  formatAbsoluteDifference,
  getActivityEnergyPattern,
  getHabitInsights,
  getMetricChange,
  getPeriodRange,
  getPreviousRange,
  getTimelineBuckets,
  insightMeasures,
  insightPeriodLabels,
  isInRange,
  shiftDate,
} from './insights.logic'
import { insightsRepository } from './insights.repository'
import type { DateRange } from './insights.logic'
import type { InsightsPeriod, InsightsSnapshot } from './insights.types'
import { formatDateDisplay } from '../utils/format-date'

export type InsightsDestination =
  | { module: 'activities'; pillarId?: string }
  | { module: 'reflection'; pillarId?: string; reflectionId?: string }
  | { module: 'habits'; pillarId?: string }
  | { module: 'goals'; pillarId?: string }

interface InsightsPageProps {
  refreshKey: number
  onExplore: (destination: InsightsDestination) => void
}

const periodChoices: InsightsPeriod[] = ['7', '30', '90', '12m', 'all']

function CheckInChart({ snapshot, range }: { snapshot: InsightsSnapshot; range: DateRange }) {
  const checkIns = snapshot.checkIns.filter((item) => isInRange(item.date, range))
  if (!checkIns.length) {
    return <div className="insight-empty-chart"><strong>Nog geen check-ins in deze periode</strong><span>Wanneer je een check-in invult, verschijnt hier je ontwikkeling.</span></div>
  }
  const span = Math.max(1, daysBetween(range.start, range.end) - 1)
  const x = (date: string) => 12 + ((daysBetween(range.start, date) - 1) / span) * 276
  const y = (value: number) => 110 - ((value - 1) / 9) * 96
  const labels = [...new Set([checkIns[0]?.date, shiftDate(range.start, Math.floor(span / 2)), range.end].filter((value): value is string => Boolean(value)))]
  return (
    <div className="insight-line-wrap">
      <div className="insight-chart-scale" aria-hidden="true"><span>10</span><span>5</span><span>1</span></div>
      <svg className="insight-line-chart" viewBox="0 0 300 124" role="img" aria-label="Welzijnsscores over de geselecteerde periode. Dagen zonder check-in zijn niet verbonden.">
        {[1, 5, 10].map((score) => <line key={score} x1="10" x2="290" y1={y(score)} y2={y(score)} className="chart-grid-line" />)}
        {insightMeasures.map((metric) => {
          let previousDate: string | null = null
          let segment: string[] = []
          const segments: string[][] = []
          for (const point of checkIns) {
            if (previousDate && daysBetween(previousDate, point.date) !== 1) {
              if (segment.length) segments.push(segment)
              segment = []
            }
            segment.push(`${x(point.date)},${y(point[metric.key])}`)
            previousDate = point.date
          }
          if (segment.length) segments.push(segment)
          return (
            <g key={metric.key}>
              {segments.map((points, index) => (
                <g key={`${metric.key}-${index}`}>
                  {points.length > 1 ? <polyline points={points.join(' ')} fill="none" stroke={metric.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /> : null}
                </g>
              ))}
              {checkIns.map((point) => <circle key={`${metric.key}-${point.date}`} cx={x(point.date)} cy={y(point[metric.key])} r="3" fill={metric.color}><title>{`${metric.label}: ${point[metric.key]}/10 · ${point.date}`}</title></circle>)}
            </g>
          )
        })}
      </svg>
      <div className="insight-chart-labels">{labels.map((date) => <span key={date}>{formatDateDisplay(new Date(`${date}T12:00:00`), { day: 'numeric', month: 'short' })}</span>)}</div>
    </div>
  )
}

function InsightBar({ value, maximum, color }: { value: number; maximum: number; color: string }) {
  return <span className="insight-bar"><span style={{ width: `${maximum ? Math.max(value ? 4 : 0, (value / maximum) * 100) : 0}%`, backgroundColor: color }} /></span>
}

function PillarChip({ pillar }: { pillar: InsightsSnapshot['pillars'][number] }) {
  return <span className="insight-pillar-chip"><span style={{ backgroundColor: pillar.color }} />{pillar.icon} {pillar.name}</span>
}

export function InsightsPage({ refreshKey, onExplore }: InsightsPageProps) {
  const today = toDateKey(useLocalDate())
  const [period, setPeriod] = useState<InsightsPeriod>('30')
  const [activityPillar, setActivityPillar] = useState('')
  const [snapshot, setSnapshot] = useState<InsightsSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const selectedRange = useMemo(() => getPeriodRange(period, today, snapshot ?? undefined), [period, snapshot, today])
  const previousRange = useMemo(() => period === 'all' ? null : getPreviousRange(selectedRange), [period, selectedRange])
  const queryStart = period === 'all' ? null : previousRange?.start ?? selectedRange.start

  useEffect(() => {
    let active = true
    void insightsRepository.loadSnapshot(queryStart, today).then((next) => {
      if (!active) return
      setSnapshot(next)
      setError(null)
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : String(reason))
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [queryStart, refreshKey, today])

  const currentCheckIns = useMemo(() => snapshot?.checkIns.filter((item) => isInRange(item.date, selectedRange)) ?? [], [selectedRange, snapshot])
  const currentActivities = useMemo(() => snapshot?.activities.filter((item) =>
    isInRange(item.date, selectedRange) && (!activityPillar || item.pillarIds.includes(activityPillar))) ?? [], [activityPillar, selectedRange, snapshot])
  const priorActivities = useMemo(() => previousRange ? snapshot?.activities.filter((item) =>
    isInRange(item.date, previousRange) && (!activityPillar || item.pillarIds.includes(activityPillar))) ?? [] : [], [activityPillar, previousRange, snapshot])
  const allCurrentActivities = useMemo(() => snapshot?.activities.filter((item) => isInRange(item.date, selectedRange)) ?? [], [selectedRange, snapshot])
  const currentReflections = useMemo(() => snapshot?.reflections.filter((item) => isInRange(item.date, selectedRange)) ?? [], [selectedRange, snapshot])
  const priorReflections = useMemo(() => previousRange ? snapshot?.reflections.filter((item) => isInRange(item.date, previousRange)) ?? [] : [], [previousRange, snapshot])
  const habitInsights = useMemo(() => snapshot ? getHabitInsights(snapshot, selectedRange) : [], [selectedRange, snapshot])
  const activeHabits = habitInsights.filter((item) => item.habit.status === 'active')
  const activeGoals = snapshot?.goals.filter((goal) => goal.status === 'active') ?? []
  const pausedGoals = snapshot?.goals.filter((goal) => goal.status === 'paused') ?? []
  const completedGoals = snapshot?.goals.filter((goal) => goal.status === 'completed') ?? []
  const buckets = useMemo(() => snapshot ? getTimelineBuckets(snapshot, selectedRange, period) : [], [period, selectedRange, snapshot])
  const maxActivityCount = Math.max(0, ...buckets.map((bucket) => bucket.activities))
  const maxHabitRegistrationCount = Math.max(0, ...buckets.map((bucket) => bucket.habitRegistrations))
  const maxReflectionCount = Math.max(0, ...(snapshot?.pillars.map((pillar) => currentReflections.filter((reflection) => reflection.pillarIds.includes(pillar.id)).length) ?? []))
  const activityDuration = currentActivities.reduce((sum, item) => sum + (item.durationMinutes ?? 0), 0)
  const habitDuration = activeHabits.reduce((sum, item) => sum + item.totalMinutes, 0)
  const currentActivityCount = allCurrentActivities.length
  const priorActivityCount = priorActivities.length
  const pattern = snapshot ? getActivityEnergyPattern(snapshot, selectedRange) : null
  const pillarActivityCounts = snapshot?.pillars.map((pillar) => ({
    pillar,
    count: allCurrentActivities.filter((activity) => activity.pillarIds.includes(pillar.id)).length,
  })) ?? []
  const unlinkedActivities = allCurrentActivities.filter((activity) => activity.pillarIds.length === 0).length
  const reflectionTypes = snapshot ? (['journal', 'daily', 'weekly', 'monthly'] as const).map((type) => ({
    type,
    label: { journal: 'Dagboek', daily: 'Dagelijks', weekly: 'Wekelijks', monthly: 'Maandelijks' }[type],
    count: currentReflections.filter((item) => item.type === type).length,
  })) : []
  const mostActivityPillar = [...pillarActivityCounts].sort((a, b) => b.count - a.count)[0]
  const dateLabel = (date: string) => formatDateDisplay(new Date(`${date}T12:00:00`), { day: 'numeric', month: 'short' })

  if (loading) return <section className="screen-section"><div className="loading-card" role="status">Je lokale inzichten laden…</div></section>
  if (error || !snapshot) return <section className="screen-section"><div className="inline-error" role="alert">Inzichten konden niet uit de lokale database worden geladen{error ? `: ${error}` : '.'}</div></section>

  return (
    <section className="screen-section insights-page">
      <header className="insights-header">
        <div><p className="eyebrow">Een overzicht zonder oordeel</p><h2>Jouw inzichten</h2><p>Bekijk wat je hebt bijgehouden. De gegevens spreken niet voor wat iets voor jou betekent.</p></div>
        <label className="habit-field">Periode<select value={period} onChange={(event) => setPeriod(event.currentTarget.value as InsightsPeriod)}>{periodChoices.map((choice) => <option key={choice} value={choice}>{insightPeriodLabels[choice]}</option>)}</select></label>
      </header>
      <p className="insights-period-note">Periode: {dateLabel(selectedRange.start)} – {dateLabel(selectedRange.end)}{period === 'all' ? ' · alle beschikbare gegevens' : ''}</p>

      <section className="content-card insight-section">
        <div className="section-heading compact"><div><p className="eyebrow">Welzijn</p><h2>Check-ins over tijd</h2></div><span className="insight-count">{currentCheckIns.length} {currentCheckIns.length === 1 ? 'meetmoment' : 'meetmomenten'}</span></div>
        <p className="muted-copy">Alleen ingevulde check-ins tellen mee. Dagen zonder check-in blijven open plekken.</p>
        <CheckInChart snapshot={snapshot} range={selectedRange} />
        <ul className="insight-legend">{insightMeasures.map((measure) => <li key={measure.key}><span style={{ backgroundColor: measure.color }} />{measure.label}</li>)}</ul>
        {currentCheckIns.length ? <div className="insight-average-grid">
          {insightMeasures.map((measure) => {
            const change = getMetricChange(snapshot, measure.key, selectedRange, previousRange)
            const difference = change.currentAverage !== null && change.previousAverage !== null ? change.currentAverage - change.previousAverage : null
            return <article key={measure.key}><span>{measure.label}</span><strong>{change.currentAverage?.toFixed(1) ?? '—'}<small>/10</small></strong>{previousRange ? <small>{change.currentCount} nu · {change.previousCount} ervoor · {difference !== null && change.currentCount >= 2 && change.previousCount >= 2 ? `${formatAbsoluteDifference(difference)} punten` : 'te weinig meetmomenten voor vergelijking'}</small> : <small>{change.currentCount} ingevulde check-ins</small>}</article>
          })}
        </div> : null}
        {previousRange ? <p className="insight-comparison-note">Vergelijking met {dateLabel(previousRange.start)} – {dateLabel(previousRange.end)}. Gemiddelde verschillen zijn beschrijvend en zeggen niets over de oorzaak.</p> : <p className="insight-comparison-note">Voor ‘Alles’ is er geen vorige periode met dezelfde lengte om mee te vergelijken.</p>}
      </section>

      <section className="content-card insight-section">
        <div className="section-heading compact"><div><p className="eyebrow">Gewoontes</p><h2>Registraties in beeld</h2></div><span className="insight-count">{activeHabits.length} actieve gewoontes</span></div>
        {activeHabits.length ? <>
          <div className="insight-stat-grid"><article><span>Uitgevoerd</span><strong>{activeHabits.reduce((sum, item) => sum + item.completed, 0)}</strong></article><article><span>Niet geregistreerd</span><strong>{activeHabits.reduce((sum, item) => sum + item.notRecorded, 0)}</strong></article><article><span>Niet van toepassing</span><strong>{activeHabits.reduce((sum, item) => sum + item.notApplicable, 0)}</strong></article><article><span>Geregistreerde tijd</span><strong>{habitDuration ? `${habitDuration} min` : '—'}</strong></article></div>
          <p className="insight-completion-key"><span className="done-key" />Uitgevoerd <span className="unrecorded-key" />Niet geregistreerd <span className="na-key" />Niet van toepassing <span className="not-done-key" />Expliciet niet uitgevoerd</p>
          <ul className="insight-row-list">{activeHabits.map((item) => <li key={item.habit.id}>
            <button type="button" className="insight-row-main" onClick={() => onExplore({ module: 'habits', pillarId: item.habit.pillarIds[0] })}><strong>{item.habit.name}</strong><span>{item.completed} uitgevoerd · {item.notCompleted} expliciet niet uitgevoerd · {item.notRecorded} niet geregistreerd</span><span>{item.averagePerWeek === null ? 'Geen actieve dagen in deze periode' : `${item.averagePerWeek.toFixed(1)} registraties per actieve week`} · {item.totalMinutes ? `${item.totalMinutes} min` : 'geen tijd geregistreerd'}</span></button>
            <span className="insight-status-strip" aria-label="Registratiestatus"><i className="done-key" style={{ flexGrow: item.completed }} /><i className="not-done-key" style={{ flexGrow: item.notCompleted }} /><i className="unrecorded-key" style={{ flexGrow: item.notRecorded }} /><i className="na-key" style={{ flexGrow: item.notApplicable }} /></span>
          </li>)}</ul>
        </> : <div className="insight-empty-chart"><strong>Geen actieve gewoontes</strong><span>Er zijn geen actieve gewoontes in je lokale gegevens.</span></div>}
        <h3 className="insight-subheading">Registraties over tijd</h3>
        {buckets.some((bucket) => bucket.habitRegistrations > 0) ? <div className="insight-timeline" aria-label="Gewoonteregistraties per tijdvak">{buckets.map((bucket) => <div key={bucket.key} title={`${bucket.label}: ${bucket.habitRegistrations} registraties`}><span><i className="habit-timeline-bar" style={{ height: `${maxHabitRegistrationCount ? Math.max(bucket.habitRegistrations ? 5 : 0, bucket.habitRegistrations / maxHabitRegistrationCount * 100) : 0}%` }} /></span><small>{bucket.label}</small></div>)}</div> : <div className="insight-empty-chart"><strong>Geen registraties in deze periode</strong><span>Alleen expliciet opgeslagen keuzes worden getoond.</span></div>}
        <p className="insight-comparison-note">Niet-geregistreerde en niet-toepasselijke dagen worden niet als gemiste gewoontes of als percentage beoordeeld.</p>
      </section>

      <section className="content-card insight-section">
        <div className="section-heading compact"><div><p className="eyebrow">Activiteiten</p><h2>Wat je hebt ondernomen</h2></div><button type="button" className="text-button" onClick={() => onExplore({ module: 'activities' })}>Activiteiten openen</button></div>
        <div className="insight-stat-grid"><article><span>Activiteiten{activityPillar ? ' bij gekozen pijler' : ''}</span><strong>{currentActivities.length}</strong></article><article><span>Geregistreerde tijd</span><strong>{activityDuration ? `${activityDuration} min` : '—'}</strong></article><article><span>Vorige periode</span><strong>{previousRange ? priorActivityCount : '—'}</strong></article><article><span>Verschil</span><strong>{previousRange ? formatAbsoluteDifference(currentActivities.length - priorActivityCount, ' activiteiten') : '—'}</strong></article></div>
        <label className="habit-field insight-pillar-filter">Activiteitenpijler<select value={activityPillar} onChange={(event) => setActivityPillar(event.currentTarget.value)}><option value="">Alle pijlers</option>{snapshot.pillars.map((pillar) => <option key={pillar.id} value={pillar.id}>{pillar.name}</option>)}</select></label>
        <div className="insight-bars">{pillarActivityCounts.map(({ pillar, count }) => <button type="button" key={pillar.id} className="insight-bar-row" onClick={() => onExplore({ module: 'activities', pillarId: pillar.id })}><span>{pillar.icon} {pillar.name}</span><InsightBar value={count} maximum={Math.max(1, ...pillarActivityCounts.map((item) => item.count))} color={pillar.color} /><strong>{count}</strong></button>)}</div>
        <p className="insight-comparison-note">{unlinkedActivities} {unlinkedActivities === 1 ? 'activiteit is' : 'activiteiten zijn'} niet aan een pijler gekoppeld. Eén activiteit die aan meerdere pijlers is gekoppeld, telt bij elke gekoppelde pijler mee.</p>
        <h3 className="insight-subheading">Historische aantallen</h3>
        {currentActivityCount ? <div className="insight-timeline" aria-label="Activiteiten per tijdvak">{buckets.map((bucket) => <div key={bucket.key} title={`${bucket.label}: ${bucket.activities} activiteiten`}><span><i style={{ height: `${maxActivityCount ? Math.max(bucket.activities ? 5 : 0, bucket.activities / maxActivityCount * 100) : 0}%` }} /></span><small>{bucket.label}</small></div>)}</div> : <div className="insight-empty-chart"><strong>Geen activiteiten in deze periode</strong><span>Er zijn nog geen activiteiten om te verdelen.</span></div>}
      </section>

      <section className="content-card insight-section">
        <div className="section-heading compact"><div><p className="eyebrow">Persoonlijke doelen</p><h2>Waar je aandacht naartoe gaat</h2></div><button type="button" className="text-button" onClick={() => onExplore({ module: 'goals' })}>Doelen openen</button></div>
        <div className="insight-stat-grid"><article><span>Actief</span><strong>{activeGoals.length}</strong></article><article><span>Gepauzeerd</span><strong>{pausedGoals.length}</strong></article><article><span>Afgerond</span><strong>{completedGoals.length}</strong></article><article><span>Ontwikkeldoelen</span><strong>{snapshot.goals.filter((goal) => goal.type === 'development').length}</strong></article></div>
        {activeGoals.length ? <ul className="insight-row-list">{activeGoals.map((goal) => <li key={goal.id}>
          <button type="button" className="insight-row-main" onClick={() => onExplore({ module: 'goals', pillarId: goal.pillarIds[0] })}><strong>{goal.title}<small>{goal.type === 'result' ? 'Resultaatdoel' : 'Ontwikkeldoel'}</small></strong><span className="insight-goal-progress"><i style={{ width: `${goal.progress}%` }} /></span><span>{goal.progress}% voortgang · {goal.stepCount ? `${goal.completedStepCount}/${goal.stepCount} deelstappen` : 'handmatig bijgehouden'}</span></button>
          <span className="insight-row-pillars">{goal.pillarIds.map((id) => snapshot.pillars.find((pillar) => pillar.id === id)).filter((pillar): pillar is InsightsSnapshot['pillars'][number] => Boolean(pillar)).map((pillar) => <PillarChip key={pillar.id} pillar={pillar} />)}</span>
        </li>)}</ul> : <div className="insight-empty-chart"><strong>Geen actieve doelen</strong><span>Er zijn geen actieve doelen in je lokale gegevens.</span></div>}
        <p className="insight-comparison-note">Dit is de huidige status. Historische statuswijzigingen zijn niet opgeslagen; gepauzeerde doelen gelden niet als mislukt.</p>
      </section>

      <section className="content-card insight-section">
        <div className="section-heading compact"><div><p className="eyebrow">De vijf pijlers</p><h2>Wat aan elkaar raakt</h2></div></div>
        <p className="muted-copy">Elk aantal verwijst naar opgeslagen informatie. Er wordt geen samengestelde score berekend.</p>
        <div className="insight-pillars">
          {snapshot.pillars.map((pillar) => {
            const activities = allCurrentActivities.filter((item) => item.pillarIds.includes(pillar.id)).length
            const goals = activeGoals.filter((item) => item.pillarIds.includes(pillar.id)).length
            const habits = activeHabits.filter((item) => item.habit.pillarIds.includes(pillar.id)).length
            const reflections = currentReflections.filter((item) => item.pillarIds.includes(pillar.id))
            return <article key={pillar.id}>
              <h3><span style={{ backgroundColor: pillar.color }}>{pillar.icon}</span>{pillar.name}</h3>
              <button type="button" onClick={() => onExplore({ module: 'activities', pillarId: pillar.id })}><strong>{activities}</strong><span>{activities === 1 ? 'activiteit' : 'activiteiten'}</span></button>
              <button type="button" onClick={() => onExplore({ module: 'goals', pillarId: pillar.id })}><strong>{goals}</strong><span>{goals === 1 ? 'actief doel' : 'actieve doelen'}</span></button>
              <button type="button" onClick={() => onExplore({ module: 'habits', pillarId: pillar.id })}><strong>{habits}</strong><span>{habits === 1 ? 'actieve gewoonte' : 'actieve gewoontes'}</span></button>
              <button type="button" onClick={() => onExplore({ module: 'reflection', pillarId: pillar.id })}><strong>{reflections.length}</strong><span>{reflections.length === 1 ? 'recente reflectie' : 'recente reflecties'}</span></button>
            </article>
          })}
        </div>
      </section>

      <section className="content-card insight-section">
        <div className="section-heading compact"><div><p className="eyebrow">Reflectiehistorie</p><h2>Jouw woorden, op jouw moment</h2></div><button type="button" className="text-button" onClick={() => onExplore({ module: 'reflection' })}>Reflecties openen</button></div>
        <div className="insight-stat-grid"><article><span>Reflecties in periode</span><strong>{currentReflections.length}</strong></article><article><span>Vorige periode</span><strong>{previousRange ? priorReflections.length : '—'}</strong></article><article><span>Verschil</span><strong>{previousRange ? formatAbsoluteDifference(currentReflections.length - priorReflections.length, ' reflecties') : '—'}</strong></article></div>
        <div className="reflection-type-bars">{reflectionTypes.map(({ type, label, count }) => <div key={type}><span>{label}</span><InsightBar value={count} maximum={Math.max(1, ...reflectionTypes.map((item) => item.count))} color="var(--accent)" /><strong>{count}</strong></div>)}</div>
        <h3 className="insight-subheading">Reflecties per pijler</h3>
        <div className="insight-bars">{snapshot.pillars.map((pillar) => {
          const count = currentReflections.filter((reflection) => reflection.pillarIds.includes(pillar.id)).length
          return <button type="button" key={pillar.id} className="insight-bar-row" onClick={() => onExplore({ module: 'reflection', pillarId: pillar.id })}><span>{pillar.icon} {pillar.name}</span><InsightBar value={count} maximum={maxReflectionCount} color={pillar.color} /><strong>{count}</strong></button>
        })}</div>
        {currentReflections.length ? <ul className="insight-recent-reflections">{currentReflections.slice(0, 5).map((reflection) => <li key={reflection.id}><button type="button" onClick={() => onExplore({ module: 'reflection', reflectionId: reflection.id })}><span><strong>{reflection.title || ({ journal: 'Dagboek', daily: 'Dagelijks', weekly: 'Wekelijks', monthly: 'Maandelijks' }[reflection.type])}</strong><small>{{ journal: 'Dagboek', daily: 'Dagelijks', weekly: 'Wekelijks', monthly: 'Maandelijks' }[reflection.type]}</small></span><time>{dateLabel(reflection.date)}</time></button></li>)}</ul> : <div className="insight-empty-chart"><strong>Geen reflecties in deze periode</strong><span>Reflecties zijn optioneel en hun inhoud wordt hier niet geanalyseerd.</span></div>}
      </section>

      <section className="content-card insight-section">
        <div className="section-heading compact"><div><p className="eyebrow">Persoonlijke patronen</p><h2>Feiten om bij stil te staan</h2></div></div>
        <p className="insight-comparison-note">Dit zijn beschrijvende verbanden binnen {insightPeriodLabels[period].toLocaleLowerCase()}. Een samenhang betekent niet dat het ene het andere veroorzaakt.</p>
        <div className="insight-patterns">
          {pattern ? <article><strong>Energie op dagen met een activiteit</strong><p>Op {pattern.withActivity.days} dagen met een activiteit en check-in was de gemiddelde energie {pattern.withActivity.average}/10 ({pattern.withActivity.checkIns} check-ins). Op {pattern.withoutActivity.days} dagen zonder geregistreerde activiteit was dit {pattern.withoutActivity.average}/10 ({pattern.withoutActivity.checkIns} check-ins).</p><button type="button" className="text-button" onClick={() => onExplore({ module: 'activities' })}>Bekijk activiteiten</button></article> : <article><strong>Nog te weinig gegevens voor een activiteit-energieverband</strong><p>Hiervoor zijn minstens drie check-ins nodig op dagen met én zonder geregistreerde activiteit. De huidige aantallen zijn {currentCheckIns.length} check-ins en {currentActivityCount} activiteiten.</p></article>}
          {currentActivityCount >= 3 && mostActivityPillar && mostActivityPillar.count > 0 ? <article><strong>Meest gekoppelde activiteitenpijler: {mostActivityPillar.pillar.name}</strong><p>{mostActivityPillar.count} van {currentActivityCount} activiteiten zijn aan deze pijler gekoppeld. Activiteiten met meerdere pijlers tellen bij meerdere pijlers mee.</p><button type="button" className="text-button" onClick={() => onExplore({ module: 'activities', pillarId: mostActivityPillar.pillar.id })}>Bekijk deze pijler</button></article> : <article><strong>Activiteitenverdeling volgt wanneer er meer is vastgelegd</strong><p>Er zijn minstens drie activiteiten nodig om een meest gekoppelde pijler te benoemen. Nu: {currentActivityCount}.</p></article>}
          {activeHabits.some((item) => item.completed >= 3 && item.averagePerWeek !== null) ? activeHabits.filter((item) => item.completed >= 3 && item.averagePerWeek !== null).map((item) => <article key={item.habit.id}><strong>Registraties bij {item.habit.name}</strong><p>Gemiddeld {item.averagePerWeek?.toFixed(1)} registraties per actieve week in de geselecteerde periode ({item.completed} uitgevoerde registraties, {item.activeDays} actieve dagen).</p><button type="button" className="text-button" onClick={() => onExplore({ module: 'habits', pillarId: item.habit.pillarIds[0] })}>Bekijk gewoontes</button></article>) : <article><strong>Gewoontefrequenties worden niet geraden</strong><p>Voor een gemiddelde wordt per gewoonte minimaal drie uitgevoerde registraties gevraagd. Niet-geregistreerde dagen tellen niet mee als uitvoering.</p></article>}
        </div>
      </section>
      <p className="insights-footer-note">Alles op deze pagina komt uit jouw lokale database. Er worden geen persoonlijke totaalscores, diagnoses of vergelijkingen met anderen gemaakt.</p>
    </section>
  )
}
