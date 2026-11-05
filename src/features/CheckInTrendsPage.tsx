import { useEffect, useMemo, useState } from 'react'
import { createDailySeries, createLineSegments, toDateKey } from '../check-in/check-in.logic'
import { checkInRepository } from '../check-in/check-in.repository'
import type { CheckIn, CheckInScoreField, DailyCheckInPoint } from '../check-in/check-in.types'
import { useLocalDate } from '../hooks/useLocalDate'
import { formatDateDisplay } from '../utils/format-date'

interface CheckInTrendsPageProps {
  refreshKey: number
}

const measures: { field: CheckInScoreField; label: string; color: string }[] = [
  { field: 'mood', label: 'Stemming', color: '#80956c' },
  { field: 'energy', label: 'Energie', color: '#738fa1' },
  { field: 'mentalCalm', label: 'Mentale rust', color: '#b28b5b' },
  { field: 'satisfaction', label: 'Tevredenheid', color: '#a27aa2' },
]

function TrendChart({ points }: { points: DailyCheckInPoint[] }) {
  const hasData = points.some((point) => point.checkIn)
  const dateLabels = useMemo(() => {
    const first = points[0]?.date
    const middle = points[Math.floor((points.length - 1) / 2)]?.date
    const last = points.at(-1)?.date
    return [first, middle, last].filter((value): value is string => value !== undefined)
      .filter((value, index, list) => list.indexOf(value) === index)
      .map((date) => formatDateDisplay(new Date(`${date}T12:00:00`), { day: 'numeric', month: 'short' }))
  }, [points])

  if (!hasData) {
    return (
      <div className="empty-chart">
        <p>Er zijn nog geen check-ins in deze periode.</p>
        <span>Wanneer je er een invult, verschijnt je verloop hier.</span>
      </div>
    )
  }

  return (
    <div className="chart-container">
      <div className="chart-y-labels" aria-hidden="true"><span>10</span><span>5</span><span>1</span></div>
      <svg className="trend-chart" viewBox="0 0 300 130" role="img" aria-label="Scores van 1 tot 10 over de geselecteerde periode">
        {[10, 5, 1].map((score) => {
          const y = 110 - ((score - 1) / 9) * 100
          return <line key={score} x1="10" x2="290" y1={y} y2={y} className="chart-grid-line" />
        })}
        {measures.map(({ field, color, label }) => (
          <g key={field} className="chart-series">
            {createLineSegments(points, field).map((segment, index) => (
              <g key={`${field}-${index}`}>
                {segment.length > 1 ? (
                  <polyline
                    points={segment.map((point) => `${point.x},${point.y}`).join(' ')}
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-label={label}
                  />
                ) : null}
                {segment.map((point) => (
                  <circle key={point.date} cx={point.x} cy={point.y} r="3.5" fill={color}>
                    <title>{`${label}: ${point.value}/10 op ${point.date}`}</title>
                  </circle>
                ))}
              </g>
            ))}
          </g>
        ))}
      </svg>
      <div className="chart-x-labels" aria-hidden="true">
        {dateLabels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
      </div>
    </div>
  )
}

export function CheckInTrendsPage({ refreshKey }: CheckInTrendsPageProps) {
  const now = useLocalDate()
  const [period, setPeriod] = useState<7 | 30>(7)
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loadedRefreshKey, setLoadedRefreshKey] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<{ key: number; message: string } | null>(null)
  const loading = loadedRefreshKey !== refreshKey
  const error = loadError?.key === refreshKey ? loadError.message : null

  useEffect(() => {
    let active = true
    const today = toDateKey(now)
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    start.setDate(start.getDate() - 29)
    const startKey = toDateKey(start)

    void checkInRepository.getBetween(startKey, today).then((items) => {
      if (active) setCheckIns(items)
    }).catch((reason: unknown) => {
      if (active) setLoadError({ key: refreshKey, message: reason instanceof Error ? reason.message : String(reason) })
    }).finally(() => {
      if (active) setLoadedRefreshKey(refreshKey)
    })

    return () => {
      active = false
    }
  }, [now, refreshKey])

  const points = useMemo(() => createDailySeries(now, period, checkIns), [checkIns, now, period])

  return (
    <section className="screen-section">
      <div className="trend-intro">
        <p>Een rustig overzicht van hoe je dagen voor jou voelen. Lege dagen blijven gewoon leeg.</p>
        <div className="period-switch" role="group" aria-label="Grafiekperiode">
          <button type="button" className={period === 7 ? 'selected' : ''} aria-pressed={period === 7} onClick={() => setPeriod(7)}>7 dagen</button>
          <button type="button" className={period === 30 ? 'selected' : ''} aria-pressed={period === 30} onClick={() => setPeriod(30)}>30 dagen</button>
        </div>
      </div>

      <article className="content-card">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Jouw check-ins</p>
            <h2>Over tijd</h2>
          </div>
        </div>
        {loading ? <div className="loading-card" role="status">Gegevens laden…</div> : null}
        {error ? <div className="inline-error" role="alert">Grafiekgegevens konden niet worden geladen: {error}</div> : null}
        {!loading && !error ? <TrendChart points={points} /> : null}
        <ul className="chart-legend">
          {measures.map(({ field, label, color }) => (
            <li key={field}><span style={{ backgroundColor: color }} />{label}</li>
          ))}
        </ul>
      </article>

      {checkIns.length ? (
        <p className="muted-copy chart-count">
          {checkIns.length} {checkIns.length === 1 ? 'check-in' : 'check-ins'} in de afgelopen 30 dagen
        </p>
      ) : null}
    </section>
  )
}
