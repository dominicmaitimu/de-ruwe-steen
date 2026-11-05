import { useEffect, useState } from 'react'
import { ScoreSummary } from '../check-in/check-in.components'
import { checkInRepository } from '../check-in/check-in.repository'
import { toDateKey } from '../check-in/check-in.logic'
import type { CheckIn } from '../check-in/check-in.types'
import { useLocalDate } from '../hooks/useLocalDate'
import { formatDateDisplay } from '../utils/format-date'

interface CheckInHistoryPageProps {
  onOpenCheckIn: (date: string) => void
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthRange(month: string): { start: string; end: string } {
  const [year, monthNumber] = month.split('-').map(Number)
  const start = new Date(year, monthNumber - 1, 1)
  const end = new Date(year, monthNumber, 0)
  return { start: toDateKey(start), end: toDateKey(end) }
}

function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  return monthKey(new Date(year, monthNumber - 1 + delta, 1))
}

export function CheckInHistoryPage({ onOpenCheckIn }: CheckInHistoryPageProps) {
  const now = useLocalDate()
  const [month, setMonth] = useState(() => monthKey(new Date()))
  const [records, setRecords] = useState<CheckIn[]>([])
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<{ month: string; message: string } | null>(null)
  const range = monthRange(month)
  const loading = loadedMonth !== month
  const error = loadError?.month === month ? loadError.message : null
  const todayMonth = monthKey(now)

  useEffect(() => {
    let active = true
    void checkInRepository.getBetween(range.start, range.end).then((items) => {
      if (active) setRecords(items)
    }).catch((reason: unknown) => {
      if (active) setLoadError({ month, message: reason instanceof Error ? reason.message : String(reason) })
    }).finally(() => {
      if (active) setLoadedMonth(month)
    })

    return () => {
      active = false
    }
  }, [month, range.end, range.start])

  const monthLabel = formatDateDisplay(new Date(`${month}-15T12:00:00`), { month: 'long', year: 'numeric' })

  return (
    <section className="screen-section">
      <div className="month-navigation">
        <button type="button" className="icon-button" aria-label="Vorige maand" onClick={() => setMonth((value) => shiftMonth(value, -1))}>‹</button>
        <h2>{monthLabel}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Volgende maand"
          disabled={month >= todayMonth}
          onClick={() => setMonth((value) => shiftMonth(value, 1))}
        >
          ›
        </button>
      </div>

      {loading ? <div className="loading-card" role="status">Historie laden…</div> : null}
      {error ? <div className="inline-error" role="alert">Historie kon niet worden geladen: {error}</div> : null}
      {!loading && !error && !records.length ? (
        <div className="empty-card">
          <span className="empty-summary-icon" aria-hidden="true">○</span>
          <h2>Er zijn deze maand nog geen check-ins</h2>
          <p>Je kunt op elk moment beginnen. Er is geen verwachting om dagelijks in te vullen.</p>
        </div>
      ) : null}
      {!loading && !error && records.length ? (
        <div className="history-list">
          {records.map((record) => (
            <article className="history-card" key={record.id}>
              <div className="history-card-header">
                <div>
                  <p className="eyebrow">
                    {formatDateDisplay(new Date(`${record.date}T12:00:00`), { weekday: 'long' })}
                  </p>
                  <h3>
                    {formatDateDisplay(new Date(`${record.date}T12:00:00`), { day: 'numeric', month: 'long' })}
                  </h3>
                </div>
                <button type="button" className="text-button" onClick={() => onOpenCheckIn(record.date)}>Openen</button>
              </div>
              <ScoreSummary values={record} />
              {record.reflection ? <p className="history-reflection">{record.reflection}</p> : null}
              <p className="self-care-summary">
                {record.didSomethingForSelf ? 'Je hebt iets voor jezelf gedaan.' : 'Je gaf aan vandaag niets voor jezelf te hebben gedaan.'}
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}
