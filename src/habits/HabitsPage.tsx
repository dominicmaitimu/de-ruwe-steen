import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { checkInRepository } from '../check-in/check-in.repository'
import type { Pillar } from '../check-in/check-in.types'
import { toDateKey } from '../check-in/check-in.logic'
import { useLocalDate } from '../hooks/useLocalDate'
import {
  createEmptyHabitDraft,
  draftFromHabit,
  formatHabitFrequency,
  getDateRange,
  getFrequencyTypeLabel,
  getHabitDayStatus,
  getHabitFrequencyStats,
  isHabitDraftValid,
} from './habit.logic'
import { habitRepository } from './habit.repository'
import type { Habit, HabitDraft, HabitEntry, HabitEntryDraft, HabitFrequencyType, HabitStatus } from './habit.types'
import { formatDateDisplay } from '../utils/format-date'

type HabitScreen = 'list' | 'form' | 'detail'
type HabitStatusFilter = 'active' | 'paused' | 'ended'
type HistoryFilter = '7' | '30' | '90' | 'all'

const statusLabels: Record<HabitStatusFilter, string> = {
  active: 'Actief',
  paused: 'Gepauzeerd',
  ended: 'Beëindigd',
}

const weekdayOptions = [
  { value: 1, label: 'Ma' },
  { value: 2, label: 'Di' },
  { value: 3, label: 'Wo' },
  { value: 4, label: 'Do' },
  { value: 5, label: 'Vr' },
  { value: 6, label: 'Za' },
  { value: 0, label: 'Zo' },
]

interface HabitsPageProps {
  initialPillarId: string | null
  onClearPillar: () => void
  onShowGoals: () => void
}

function DevelopmentSwitcher({ active, onShowGoals }: { active: 'goals' | 'habits'; onShowGoals: () => void }) {
  return (
    <div className="development-switcher" role="group" aria-label="Ontwikkeling">
      <button type="button" className={active === 'goals' ? 'selected' : ''} aria-pressed={active === 'goals'} onClick={onShowGoals}>Doelen</button>
      <button type="button" className={active === 'habits' ? 'selected' : ''} aria-pressed={active === 'habits'}>Gewoontes</button>
    </div>
  )
}

function HabitForm({
  initial,
  pillars,
  today,
  onCancel,
  onSave,
}: {
  initial: HabitDraft
  pillars: Pillar[]
  today: string
  onCancel: () => void
  onSave: (draft: HabitDraft) => Promise<void>
}) {
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const update = <K extends keyof HabitDraft>(key: K, value: HabitDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const setFrequency = (frequencyType: HabitFrequencyType) => {
    setDraft((current) => ({
      ...current,
      frequencyType,
      targetCount: frequencyType === 'daily' ? 1 : frequencyType === 'weekly' ? 3 : current.targetCount,
      periodDays: frequencyType === 'daily' ? 1 : 7,
      weekdays: frequencyType === 'weekdays' ? current.weekdays : [],
    }))
  }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isHabitDraftValid(draft)) {
      setError('Vul een naam, ten minste één pijler en een geldige frequentie en periode in.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(draft)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
      setSaving(false)
    }
  }
  const togglePillar = (id: string) => update('pillarIds', draft.pillarIds.includes(id)
    ? draft.pillarIds.filter((pillarId) => pillarId !== id)
    : [...draft.pillarIds, id])

  return (
    <form className="habit-form form-card" onSubmit={(event) => void submit(event)}>
      <div className="form-intro">
        <p className="eyebrow">Een keuze voor jezelf</p>
        <h2>{initial.name ? 'Gewoonte aanpassen' : 'Nieuwe gewoonte'}</h2>
        <p>Je kiest zelf wat bij je past. Dit is een hulpmiddel, geen verplichting.</p>
      </div>
      <label className="habit-field">
        Naam <span>Verplicht</span>
        <input required maxLength={100} value={draft.name} onChange={(event) => update('name', event.currentTarget.value)} />
      </label>
      <label className="habit-field">
        Omschrijving <span>Optioneel</span>
        <textarea rows={3} maxLength={1000} value={draft.description} onChange={(event) => update('description', event.currentTarget.value)} />
      </label>
      <fieldset className="habit-fieldset">
        <legend>Pijler(s)</legend>
        <div className="habit-pillar-options">
          {pillars.map((pillar) => (
            <button type="button" className={`habit-choice ${draft.pillarIds.includes(pillar.id) ? 'selected' : ''}`} aria-pressed={draft.pillarIds.includes(pillar.id)} key={pillar.id} onClick={() => togglePillar(pillar.id)}>
              <span className="pillar-icon" style={{ backgroundColor: pillar.color }} aria-hidden="true">{pillar.icon}</span>
              {pillar.name}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="habit-field">
        Frequentie
        <select value={draft.frequencyType} onChange={(event) => setFrequency(event.currentTarget.value as HabitFrequencyType)}>
          {(['daily', 'weekly', 'weekdays', 'period'] as HabitFrequencyType[]).map((type) => (
            <option key={type} value={type}>{getFrequencyTypeLabel(type)}</option>
          ))}
        </select>
      </label>
      {draft.frequencyType === 'weekly' || draft.frequencyType === 'period' ? (
        <div className="habit-number-row">
          <label className="habit-field">
            Gewenste keren
            <input type="number" min={1} max={draft.frequencyType === 'weekly' ? 7 : draft.periodDays} value={draft.targetCount} onChange={(event) => update('targetCount', Number(event.currentTarget.value))} />
          </label>
          {draft.frequencyType === 'period' ? (
            <label className="habit-field">
              Per aantal dagen
              <input type="number" min={1} max={90} value={draft.periodDays} onChange={(event) => update('periodDays', Number(event.currentTarget.value))} />
            </label>
          ) : <p className="habit-field-hint">Over de week verdeeld; alleen op een passend moment getoond.</p>}
        </div>
      ) : null}
      {draft.frequencyType === 'weekdays' ? (
        <fieldset className="habit-fieldset">
          <legend>Kies weekdagen</legend>
          <div className="weekday-options">
            {weekdayOptions.map(({ value, label }) => {
              const storedValue = value || 7
              const selected = draft.weekdays.includes(storedValue)
              return <button type="button" key={label} aria-pressed={selected} className={`weekday-chip ${selected ? 'selected' : ''}`} onClick={() => update('weekdays', selected ? draft.weekdays.filter((day) => day !== storedValue) : [...draft.weekdays, storedValue])}>{label}</button>
            })}
          </div>
        </fieldset>
      ) : null}
      <div className="habit-number-row">
        <label className="habit-field">
          Gewenste duur in minuten <span>Optioneel</span>
          <input type="number" min={1} max={1440} placeholder="Bijv. 20" value={draft.desiredDurationMinutes ?? ''} onChange={(event) => update('desiredDurationMinutes', event.currentTarget.value ? Number(event.currentTarget.value) : null)} />
        </label>
        <span />
      </div>
      <div className="habit-number-row">
        <label className="habit-field">
          Startdatum
          <input type="date" required value={draft.startDate} onChange={(event) => update('startDate', event.currentTarget.value)} />
        </label>
        <label className="habit-field">
          Einddatum <span>Optioneel</span>
          <input type="date" min={draft.startDate || today} value={draft.endDate} onChange={(event) => update('endDate', event.currentTarget.value)} />
        </label>
      </div>
      {error ? <div className="inline-error" role="alert">{error}</div> : null}
      <div className="form-actions">
        <button type="button" className="secondary-button" disabled={saving} onClick={onCancel}>Annuleren</button>
        <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Bewaren…' : 'Gewoonte bewaren'}</button>
      </div>
    </form>
  )
}

function EntryEditor({
  habit,
  date,
  entry,
  onSave,
  onRemove,
}: {
  habit: Habit
  date: string
  entry: HabitEntry | null
  onSave: (draft: HabitEntryDraft) => Promise<void>
  onRemove: () => Promise<void>
}) {
  const [completed, setCompleted] = useState(entry?.completed ?? true)
  const [duration, setDuration] = useState(entry?.durationMinutes?.toString() ?? '')
  const [note, setNote] = useState(entry?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const save = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await onSave({ completed, durationMinutes: duration ? Number(duration) : null, note })
      setSaved(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setSaving(false)
    }
  }
  const remove = async () => {
    setSaving(true)
    setError(null)
    try {
      await onRemove()
      setSaved(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setSaving(false)
    }
  }
  return (
    <article className="content-card entry-editor">
      <div className="section-heading compact">
        <div><p className="eyebrow">Registratie</p><h3>{formatDateDisplay(new Date(`${date}T12:00:00`), { day: 'numeric', month: 'long', year: 'numeric' })}</h3></div>
      </div>
      <p className="muted-copy">{habit.name}</p>
      <div className="choice-row">
        <button type="button" className={`choice-button ${completed ? 'selected' : ''}`} aria-pressed={completed} onClick={() => setCompleted(true)}>Uitgevoerd</button>
        <button type="button" className={`choice-button ${!completed ? 'selected' : ''}`} aria-pressed={!completed} onClick={() => setCompleted(false)}>Niet uitgevoerd</button>
      </div>
      <label className="habit-field">Duur in minuten <span>Optioneel</span><input type="number" min={1} max={1440} value={duration} onChange={(event) => setDuration(event.currentTarget.value)} /></label>
      <label className="habit-field">Notitie <span>Optioneel</span><textarea rows={2} maxLength={1000} value={note} onChange={(event) => setNote(event.currentTarget.value)} /></label>
      {error ? <div className="inline-error" role="alert">{error}</div> : null}
      {saved ? <p className="habit-saved" role="status">Registratie bewaard.</p> : null}
      <div className="form-actions">
        {entry ? <button type="button" className="secondary-button" disabled={saving} onClick={() => void remove()}>Registratie ongedaan maken</button> : null}
        <button type="button" className="primary-button" disabled={saving} onClick={() => void save()}>{saving ? 'Bewaren…' : 'Registratie bewaren'}</button>
      </div>
    </article>
  )
}

export function HabitsPage({ initialPillarId, onClearPillar, onShowGoals }: HabitsPageProps) {
  const now = useLocalDate()
  const today = toDateKey(now)
  const [habits, setHabits] = useState<Habit[]>([])
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [entries, setEntries] = useState<HabitEntry[]>([])
  const [allEntries, setAllEntries] = useState<HabitEntry[]>([])
  const [screen, setScreen] = useState<HabitScreen>('list')
  const [statusFilter, setStatusFilter] = useState<HabitStatusFilter>('active')
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('30')
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null)
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null)
  const [pillarFilter, setPillarFilter] = useState(initialPillarId ?? '')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void Promise.all([habitRepository.list(), checkInRepository.getPillars()]).then(([nextHabits, nextPillars]) => {
      if (!active) return
      setHabits(nextHabits)
      setPillars(nextPillars)
      setLoadError(null)
    }).catch((reason: unknown) => {
      if (active) setLoadError(reason instanceof Error ? reason.message : String(reason))
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refreshKey])

  const selectedHabit = habits.find((habit) => habit.id === selectedHabitId) ?? null
  const selectedHabitIdForQuery = selectedHabit?.id
  const selectedHabitStartDate = selectedHabit?.startDate
  const editingHabit = habits.find((habit) => habit.id === editingHabitId) ?? null
  const visibleHabits = useMemo(() => habits.filter((habit) => habit.status === statusFilter && (!pillarFilter || habit.pillarIds.includes(pillarFilter))), [habits, pillarFilter, statusFilter])

  useEffect(() => {
    if (!selectedHabitIdForQuery || !selectedHabitStartDate) return
    const range = getDateRange(today, historyFilter, selectedHabitStartDate)
    let active = true
    void Promise.all([
      habitRepository.entriesBetween(selectedHabitIdForQuery, selectedHabitStartDate > today ? today : selectedHabitStartDate, today),
      habitRepository.entriesBetween(selectedHabitIdForQuery, range.start, range.end),
    ]).then(([allNextEntries, visibleNextEntries]) => {
      if (active) {
        setAllEntries(allNextEntries)
        setEntries(visibleNextEntries)
      }
    }).catch((reason: unknown) => {
      if (active) setLoadError(reason instanceof Error ? reason.message : String(reason))
    })
    return () => { active = false }
  }, [historyFilter, refreshKey, selectedHabitIdForQuery, selectedHabitStartDate, today])

  const openNew = () => {
    setEditingHabitId(null)
    setScreen('form')
  }
  const openHabit = (habit: Habit) => {
    setSelectedHabitId(habit.id)
    setHistoryFilter('30')
    setSelectedDate(today)
    setScreen('detail')
  }
  const changeStatus = async (habit: Habit, status: HabitStatus) => {
    try {
      await habitRepository.setStatus(habit.id, status, today)
      setRefreshKey((key) => key + 1)
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : String(reason))
    }
  }
  const entryMap = new Map(entries.map((entry) => [entry.date, entry]))
  const detailRange = selectedHabit ? getDateRange(today, historyFilter, selectedHabit.startDate) : { start: today, end: today }
  const calendarDays: string[] = []
  for (let cursor = new Date(`${detailRange.start}T12:00:00`); toDateKey(cursor) <= detailRange.end; cursor.setDate(cursor.getDate() + 1)) calendarDays.push(toDateKey(cursor))
  const stats = getHabitFrequencyStats(allEntries, today, selectedHabit?.startDate, selectedHabit?.statusPeriods)
  const selectedEntry = entryMap.get(selectedDate) ?? null

  return (
    <section className="screen-section habits-page">
      <DevelopmentSwitcher active="habits" onShowGoals={onShowGoals} />
      {loadError ? <div className="inline-error" role="alert">Gewoontes konden niet worden geladen: {loadError}</div> : null}
      {loading ? <div className="loading-card" role="status">Gewoontes laden…</div> : null}
      {!loading && !loadError && screen === 'list' ? (
        <>
          <header className="habit-list-header">
            <div><p className="eyebrow">Op jouw manier</p><h2>Gewoontes</h2><p>Kleine activiteiten die jij belangrijk vindt. Zonder moeten.</p></div>
            <button type="button" className="primary-button" onClick={openNew}>Nieuwe gewoonte</button>
          </header>
          {initialPillarId ? <button type="button" className="text-button" onClick={onClearPillar}>Filter wissen · {pillars.find((pillar) => pillar.id === initialPillarId)?.name}</button> : null}
          <div className="habit-status-tabs" role="group" aria-label="Gewoonte status">
            {(Object.keys(statusLabels) as HabitStatusFilter[]).map((status) => (
              <button type="button" key={status} aria-pressed={statusFilter === status} className={statusFilter === status ? 'selected' : ''} onClick={() => setStatusFilter(status)}>{statusLabels[status]} <span>{habits.filter((habit) => habit.status === status).length}</span></button>
            ))}
          </div>
          <label className="habit-field">
            Filter op pijler
            <select value={pillarFilter} onChange={(event) => setPillarFilter(event.currentTarget.value)}>
              <option value="">Alle pijlers</option>
              {pillars.map((pillar) => <option value={pillar.id} key={pillar.id}>{pillar.name}</option>)}
            </select>
          </label>
          {visibleHabits.length ? (
            <div className="habit-list">
              {visibleHabits.map((habit) => (
                <article className="habit-card" key={habit.id}>
                  <button type="button" className="habit-card-open" onClick={() => openHabit(habit)}>
                    <span className="habit-card-title">{habit.name}</span>
                    <span className="habit-card-description">{habit.description || 'Een activiteit die jij hebt gekozen.'}</span>
                    <span className="habit-card-meta">{formatHabitFrequency(habit)}{habit.desiredDurationMinutes ? ` · ${habit.desiredDurationMinutes} min` : ''}</span>
                    <span className="habit-card-pillars">{pillars.filter((pillar) => habit.pillarIds.includes(pillar.id)).map((pillar) => pillar.name).join(' · ')}</span>
                  </button>
                  <button type="button" className="text-button" onClick={() => { setEditingHabitId(habit.id); setScreen('form') }}>Aanpassen</button>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-card"><span className="empty-summary-icon" aria-hidden="true">○</span><h2>{pillarFilter ? 'Geen gewoontes bij deze pijler' : `Nog geen ${statusLabels[statusFilter].toLowerCase()} gewoontes`}</h2><p>Je bepaalt zelf of en wanneer je een gewoonte toevoegt.</p>{statusFilter === 'active' ? <button type="button" className="secondary-button" onClick={openNew}>Een gewoonte toevoegen</button> : null}</div>
          )}
        </>
      ) : null}
      {!loading && !loadError && screen === 'form' ? (
        <HabitForm
          key={editingHabit?.id ?? 'new'}
          initial={editingHabit ? draftFromHabit(editingHabit) : createEmptyHabitDraft(today)}
          pillars={pillars}
          today={today}
          onCancel={() => setScreen('list')}
          onSave={async (draft) => {
            const saved = await habitRepository.save(draft, editingHabit?.id)
            setSelectedHabitId(saved.id)
            setRefreshKey((key) => key + 1)
            setScreen('detail')
          }}
        />
      ) : null}
      {!loading && !loadError && screen === 'detail' && selectedHabit ? (
        <>
          <button type="button" className="text-button habit-back" onClick={() => setScreen('list')}>‹ Alle gewoontes</button>
          <article className="content-card habit-detail-card">
            <p className="eyebrow">{statusLabels[selectedHabit.status]}</p>
            <h2>{selectedHabit.name}</h2>
            <p>{selectedHabit.description || 'Een activiteit die jij hebt gekozen.'}</p>
            <div className="habit-detail-meta"><span>{formatHabitFrequency(selectedHabit)}</span>{selectedHabit.desiredDurationMinutes ? <span>Gewenst: {selectedHabit.desiredDurationMinutes} min</span> : null}</div>
            <div className="habit-pill-tags">{pillars.filter((pillar) => selectedHabit.pillarIds.includes(pillar.id)).map((pillar) => <span key={pillar.id}>{pillar.icon} {pillar.name}</span>)}</div>
            <div className="habit-action-row">
              <button type="button" className="secondary-button" onClick={() => { setEditingHabitId(selectedHabit.id); setScreen('form') }}>Aanpassen</button>
              {selectedHabit.status === 'active' ? <button type="button" className="secondary-button" onClick={() => void changeStatus(selectedHabit, 'paused')}>Pauzeren</button> : null}
              {selectedHabit.status === 'paused' ? <button type="button" className="secondary-button" onClick={() => void changeStatus(selectedHabit, 'active')}>Hervatten</button> : null}
              {selectedHabit.status !== 'ended' ? <button type="button" className="text-button" onClick={() => void changeStatus(selectedHabit, 'ended')}>Beëindigen</button> : null}
            </div>
          </article>
          <section className="content-card">
            <div className="section-heading compact"><div><p className="eyebrow">Inzichten</p><h3>Een rustig overzicht</h3></div></div>
            <div className="habit-stats-grid">
              <div><span>Deze week</span><strong>{stats.thisWeek}</strong><small>registraties</small></div>
              <div><span>Deze maand</span><strong>{stats.thisMonth}</strong><small>registraties</small></div>
              <div><span>Gemiddeld</span><strong>{stats.averagePerWeek}</strong><small>per week</small></div>
              <div><span>Tijd</span><strong>{stats.totalMinutes}</strong><small>geregistreerde min</small></div>
            </div>
            <div className="habit-week-chart" aria-label="Registraties per week">
              {Array.from({ length: 7 }, (_, index) => {
                const weekStart = new Date(`${today}T12:00:00`)
                weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7) - (6 - index) * 7)
                const start = toDateKey(weekStart)
                const end = new Date(weekStart)
                end.setDate(end.getDate() + 6)
                const count = allEntries.filter((entry) => entry.completed && entry.date >= start && entry.date <= toDateKey(end)).length
                const highest = Math.max(1, ...Array.from({ length: 7 }, (_, weekIndex) => {
                  const week = new Date(`${today}T12:00:00`)
                  week.setDate(week.getDate() - ((week.getDay() + 6) % 7) - (6 - weekIndex) * 7)
                  const weekEnd = new Date(week)
                  weekEnd.setDate(weekEnd.getDate() + 6)
                  return allEntries.filter((entry) => entry.completed && entry.date >= toDateKey(week) && entry.date <= toDateKey(weekEnd)).length
                }))
                return <div key={start} title={`${count} registraties`}><span style={{ height: `${Math.max(4, (count / highest) * 100)}%` }} /><small>{formatDateDisplay(weekStart, { day: 'numeric', month: 'short' })}</small></div>
              })}
            </div>
          </section>
          <section className="content-card habit-history-card">
            <div className="section-heading compact"><div><p className="eyebrow">Historie</p><h3>Jouw dagen</h3></div></div>
            <div className="habit-history-filters">
              {(['7', '30', '90', 'all'] as HistoryFilter[]).map((filter) => <button type="button" key={filter} aria-pressed={historyFilter === filter} className={historyFilter === filter ? 'selected' : ''} onClick={() => setHistoryFilter(filter)}>{filter === 'all' ? 'Alles' : `Laatste ${filter} dagen`}</button>)}
            </div>
            <p className="habit-history-key"><span className="day-dot completed" /> Uitgevoerd <span className="day-dot not-completed" /> Niet uitgevoerd <span className="day-dot not-recorded" /> Niet geregistreerd <span className="day-dot not-applicable" /> Niet van toepassing</p>
            <div className="habit-weekday-labels" aria-hidden="true"><span>Ma</span><span>Di</span><span>Wo</span><span>Do</span><span>Vr</span><span>Za</span><span>Zo</span></div>
            <div className="habit-calendar">
              {Array.from({ length: (() => {
                const day = new Date(`${detailRange.start}T12:00:00`).getDay()
                return (day + 6) % 7
              })() }, (_, index) => <span className="habit-calendar-spacer" aria-hidden="true" key={`spacer-${index}`} />)}
              {calendarDays.map((date) => {
                const status = getHabitDayStatus(selectedHabit, date, entryMap.get(date) ?? null)
                return <button type="button" key={date} className={`habit-calendar-day ${status} ${selectedDate === date ? 'chosen' : ''}`} aria-label={`${date}: ${status === 'completed' ? 'uitgevoerd' : status === 'not-completed' ? 'niet uitgevoerd' : status === 'not-recorded' ? 'niet geregistreerd' : 'niet van toepassing'}`} onClick={() => setSelectedDate(date)}><span>{Number(date.slice(8))}</span></button>
              })}
            </div>
            <div className="habit-history-list">
              {entries.map((entry) => <button type="button" className="habit-history-row" key={entry.id} onClick={() => setSelectedDate(entry.date)}><span>{formatDateDisplay(new Date(`${entry.date}T12:00:00`), { weekday: 'short', day: 'numeric', month: 'short' })}</span><strong>{entry.completed ? 'Uitgevoerd' : 'Niet uitgevoerd'}</strong><span>{entry.durationMinutes ? `${entry.durationMinutes} min` : ''}</span></button>)}
            </div>
          </section>
          {selectedDate <= today && getHabitDayStatus(selectedHabit, selectedDate, selectedEntry) !== 'not-applicable' ? (
            <EntryEditor
              key={`${selectedHabit.id}:${selectedDate}:${selectedEntry?.updatedAt ?? 'new'}`}
              habit={selectedHabit}
              date={selectedDate}
              entry={selectedEntry}
              onSave={async (draft) => { await habitRepository.saveEntry(selectedHabit.id, selectedDate, draft); setRefreshKey((key) => key + 1) }}
              onRemove={async () => { await habitRepository.removeEntry(selectedHabit.id, selectedDate); setRefreshKey((key) => key + 1) }}
            />
          ) : <p className="muted-copy">Deze dag valt buiten de gekozen periode van deze gewoonte.</p>}
        </>
      ) : null}
    </section>
  )
}
