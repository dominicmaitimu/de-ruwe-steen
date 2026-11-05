import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { checkInRepository } from '../check-in/check-in.repository'
import type { Pillar } from '../check-in/check-in.types'
import { habitRepository } from '../habits/habit.repository'
import type { Habit } from '../habits/habit.types'
import { toDateKey } from '../check-in/check-in.logic'
import { useLocalDate } from '../hooks/useLocalDate'
import {
  createGoalDraft,
  draftFromGoal,
  formatGoalDate,
  getGoalProgress,
  getGoalStatusLabel,
  getGoalTypeLabel,
  isGoalDraftValid,
  reorderGoalSteps,
} from './goal.logic'
import { goalRepository } from './goal.repository'
import type { Goal, GoalDraft, GoalStatus, GoalType } from './goal.types'

type GoalScreen = 'list' | 'form' | 'detail'
type GoalStatusFilter = GoalStatus | 'all'
type GoalSort = 'created' | 'deadline' | 'progress'

const statusFilters: { value: GoalStatusFilter; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'active', label: 'Actief' },
  { value: 'paused', label: 'Gepauzeerd' },
  { value: 'completed', label: 'Afgerond' },
  { value: 'cancelled', label: 'Geannuleerd' },
]

interface GoalsPageProps {
  onShowHabits: () => void
  initialPillarId?: string | null
}

function DevelopmentSwitcher({ active, onShowHabits }: { active: 'goals' | 'habits'; onShowHabits: () => void }) {
  return (
    <div className="development-switcher" role="group" aria-label="Ontwikkeling">
      <button type="button" className={active === 'goals' ? 'selected' : ''} aria-pressed={active === 'goals'}>Doelen</button>
      <button type="button" className={active === 'habits' ? 'selected' : ''} aria-pressed={active === 'habits'} onClick={onShowHabits}>Gewoontes</button>
    </div>
  )
}

function GoalForm({
  initial,
  pillars,
  hasSteps,
  onCancel,
  onSave,
}: {
  initial: GoalDraft
  pillars: Pillar[]
  hasSteps: boolean
  onCancel: () => void
  onSave: (draft: GoalDraft) => Promise<void>
}) {
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const update = <K extends keyof GoalDraft>(key: K, value: GoalDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isGoalDraftValid(draft, hasSteps)) {
      setError('Controleer de titel, gekoppelde pijlers, stappen en datums.')
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
  const updateInitialStep = (index: number, title: string) => update('initialSteps', draft.initialSteps.map((step, stepIndex) => stepIndex === index ? title : step))

  return (
    <form className="goal-form form-card" onSubmit={(event) => void submit(event)}>
      <div className="form-intro"><p className="eyebrow">Jouw richting, jouw tempo</p><h2>{initial.title ? 'Doel aanpassen' : 'Een doel toevoegen'}</h2><p>Een doel mag veranderen. Een einddatum is niet verplicht.</p></div>
      <label className="habit-field">Titel <span>Verplicht</span><input required maxLength={120} value={draft.title} onChange={(event) => update('title', event.currentTarget.value)} /></label>
      <label className="habit-field">Omschrijving <span>Optioneel</span><textarea rows={3} maxLength={2000} value={draft.description} onChange={(event) => update('description', event.currentTarget.value)} placeholder="Wat betekent dit doel voor jou?" /></label>
      <fieldset className="habit-fieldset">
        <legend>Doeltype</legend>
        <div className="goal-type-options">
          {(['result', 'development'] as GoalType[]).map((type) => (
            <button type="button" key={type} className={`goal-type-card ${draft.type === type ? 'selected' : ''}`} aria-pressed={draft.type === type} onClick={() => update('type', type)}>
              <strong>{getGoalTypeLabel(type)}</strong>
              <span>{type === 'result' ? 'Een concreet resultaat dat je wilt bereiken.' : 'Een persoonlijke verandering of ontwikkeling.'}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="habit-fieldset">
        <legend>Pijler(s)</legend>
        <div className="habit-pillar-options">
          {pillars.map((pillar) => (
            <button type="button" key={pillar.id} className={`habit-choice ${draft.pillarIds.includes(pillar.id) ? 'selected' : ''}`} aria-pressed={draft.pillarIds.includes(pillar.id)} onClick={() => togglePillar(pillar.id)}>
              <span className="pillar-icon" style={{ backgroundColor: pillar.color }} aria-hidden="true">{pillar.icon}</span>{pillar.name}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="habit-number-row">
        <label className="habit-field">Startdatum<input type="date" required value={draft.startDate} onChange={(event) => update('startDate', event.currentTarget.value)} /></label>
        <label className="habit-field">Streefdatum <span>Optioneel</span><input type="date" min={draft.startDate} value={draft.targetDate} onChange={(event) => update('targetDate', event.currentTarget.value)} /></label>
      </div>
      {hasSteps ? <p className="muted-copy">Voortgang wordt automatisch bepaald door de deelstappen.</p> : (
        <label className="habit-field">Voortgang · {draft.manualProgress}%<input type="range" min={0} max={100} step={1} value={draft.manualProgress} onChange={(event) => update('manualProgress', Number(event.currentTarget.value))} /></label>
      )}
      {!initial.title ? (
        <fieldset className="habit-fieldset">
          <legend>Eerste deelstappen <span>Optioneel</span></legend>
          <div className="goal-initial-steps">
            {draft.initialSteps.map((step, index) => (
              <div className="goal-step-input-row" key={`step-${index}`}>
                <input aria-label={`Deelstap ${index + 1}`} maxLength={160} value={step} onChange={(event) => updateInitialStep(index, event.currentTarget.value)} />
                <button type="button" className="icon-button" aria-label={`Verwijder deelstap ${index + 1}`} onClick={() => update('initialSteps', draft.initialSteps.filter((_, stepIndex) => stepIndex !== index))}>×</button>
              </div>
            ))}
            <button type="button" className="secondary-button" onClick={() => update('initialSteps', [...draft.initialSteps, ''])}>Deelstap toevoegen</button>
          </div>
        </fieldset>
      ) : null}
      {error ? <div className="inline-error" role="alert">{error}</div> : null}
      <div className="form-actions"><button type="button" className="secondary-button" disabled={saving} onClick={onCancel}>Annuleren</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Bewaren…' : 'Doel bewaren'}</button></div>
    </form>
  )
}

export function GoalsPage({ onShowHabits, initialPillarId = null }: GoalsPageProps) {
  const today = toDateKey(useLocalDate())
  const [goals, setGoals] = useState<Goal[]>([])
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [screen, setScreen] = useState<GoalScreen>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<GoalStatusFilter>('active')
  const [typeFilter, setTypeFilter] = useState<GoalType | 'all'>('all')
  const [pillarFilter, setPillarFilter] = useState(initialPillarId ?? '')
  const [sort, setSort] = useState<GoalSort>('created')
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stepTitle, setStepTitle] = useState('')
  const [editingStepId, setEditingStepId] = useState<number | null>(null)
  const [editingStepTitle, setEditingStepTitle] = useState('')
  const [manualProgress, setManualProgress] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    void Promise.all([goalRepository.list(), checkInRepository.getPillars(), habitRepository.list()]).then(([nextGoals, nextPillars, nextHabits]) => {
      if (!active) return
      setGoals(nextGoals)
      setPillars(nextPillars)
      setHabits(nextHabits)
      setError(null)
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : String(reason))
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refreshKey])

  const selectedGoal = goals.find((goal) => goal.id === selectedId) ?? null
  const editingGoal = goals.find((goal) => goal.id === editingId) ?? null
  const filteredGoals = useMemo(() => {
    const filtered = goals.filter((goal) =>
      (statusFilter === 'all' || goal.status === statusFilter)
      && (typeFilter === 'all' || goal.type === typeFilter)
      && (!pillarFilter || goal.pillars.includes(pillarFilter)))
    return filtered.sort((a, b) => {
      if (sort === 'deadline') return (a.targetDate ?? '9999-12-31').localeCompare(b.targetDate ?? '9999-12-31')
      if (sort === 'progress') return b.progress - a.progress
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [goals, pillarFilter, sort, statusFilter, typeFilter])
  const relatedHabits = selectedGoal ? habits.filter((habit) => habit.status === 'active' && habit.pillarIds.some((id) => selectedGoal.pillars.includes(id))) : []

  const refresh = () => setRefreshKey((key) => key + 1)
  const openNew = () => { setEditingId(null); setScreen('form') }
  const openGoal = (goal: Goal) => { setSelectedId(goal.id); setManualProgress(goal.progress); setScreen('detail') }
  const updateStatus = async (status: GoalStatus) => {
    if (!selectedGoal) return
    try {
      const saved = await goalRepository.setStatus(selectedGoal.id, status)
      setGoals((current) => current.map((goal) => goal.id === saved.id ? saved : goal))
      refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }
  const saveManualProgress = async (value: number) => {
    if (!selectedGoal) return
    try {
      const saved = await goalRepository.setManualProgress(selectedGoal.id, value)
      setGoals((current) => current.map((goal) => goal.id === saved.id ? saved : goal))
      setManualProgress(saved.progress)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }
  const saveStep = async (title: string, id?: number) => {
    if (!selectedGoal) return
    try {
      const saved = await goalRepository.saveStep(selectedGoal.id, title, id)
      setGoals((current) => current.map((goal) => goal.id === saved.id ? saved : goal))
      setStepTitle('')
      setEditingStepId(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }
  const toggleStep = async (id: number, completed: boolean) => {
    if (!selectedGoal) return
    try {
      const saved = await goalRepository.toggleStep(selectedGoal.id, id, completed)
      setGoals((current) => current.map((goal) => goal.id === saved.id ? saved : goal))
      setManualProgress(saved.progress)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }
  const removeStep = async (id: number) => {
    if (!selectedGoal) return
    try {
      const saved = await goalRepository.removeStep(selectedGoal.id, id)
      setGoals((current) => current.map((goal) => goal.id === saved.id ? saved : goal))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }
  const moveStep = async (index: number, delta: number) => {
    if (!selectedGoal) return
    const ordered = reorderGoalSteps(selectedGoal.steps, index, index + delta)
    try {
      const saved = await goalRepository.reorderSteps(selectedGoal.id, ordered.map((step) => step.id))
      setGoals((current) => current.map((goal) => goal.id === saved.id ? saved : goal))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }
  const removeGoal = async () => {
    if (!selectedGoal || !window.confirm('Wil je dit doel en de bijbehorende deelstappen verwijderen?')) return
    try {
      await goalRepository.delete(selectedGoal.id)
      setGoals((current) => current.filter((goal) => goal.id !== selectedGoal.id))
      setScreen('list')
      setSelectedId(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  return (
    <section className="screen-section goals-page">
      <DevelopmentSwitcher active="goals" onShowHabits={onShowHabits} />
      {error ? <div className="inline-error" role="alert">Doelen konden niet worden geladen of bijgewerkt: {error}</div> : null}
      {loading ? <div className="loading-card" role="status">Doelen laden…</div> : null}
      {!loading && !error && screen === 'list' ? (
        <>
          <header className="habit-list-header"><div><p className="eyebrow">Jouw richting</p><h2>Persoonlijke doelen</h2><p>Resultaten en ontwikkeling, op een tempo dat bij jou past.</p></div><button type="button" className="primary-button" onClick={openNew}>Doel toevoegen</button></header>
          <div className="goal-filters">
            <label className="habit-field">Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.currentTarget.value as GoalStatusFilter)}>{statusFilters.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}</select></label>
            <label className="habit-field">Doeltype<select value={typeFilter} onChange={(event) => setTypeFilter(event.currentTarget.value as GoalType | 'all')}><option value="all">Alle typen</option><option value="result">Resultaatdoel</option><option value="development">Ontwikkeldoel</option></select></label>
            <label className="habit-field">Pijler<select value={pillarFilter} onChange={(event) => setPillarFilter(event.currentTarget.value)}><option value="">Alle pijlers</option>{pillars.map((pillar) => <option key={pillar.id} value={pillar.id}>{pillar.name}</option>)}</select></label>
            <label className="habit-field">Sorteren op<select value={sort} onChange={(event) => setSort(event.currentTarget.value as GoalSort)}><option value="created">Aanmaakdatum</option><option value="deadline">Streefdatum</option><option value="progress">Voortgang</option></select></label>
          </div>
          {filteredGoals.length ? (
            <div className="goal-list">
              {filteredGoals.map((goal) => (
                <button type="button" className="goal-card" key={goal.id} onClick={() => openGoal(goal)}>
                  <span className="goal-card-top"><strong>{goal.title}</strong><span>{getGoalStatusLabel(goal.status)}</span></span>
                  <span className="goal-card-description">{goal.description || 'Een doel dat voor jou betekenis heeft.'}</span>
                  <span className="goal-card-meta">{getGoalTypeLabel(goal.type)} · Start {formatGoalDate(goal.startDate)}{goal.targetDate ? ` · Streefdatum ${formatGoalDate(goal.targetDate)}` : ''}</span>
                  <span className="goal-card-meta">{pillars.filter((pillar) => goal.pillars.includes(pillar.id)).map((pillar) => pillar.name).join(' · ')}</span>
                  <span className="goal-progress-track" aria-label={`Voortgang ${goal.progress}%`}><span style={{ width: `${goal.progress}%` }} /></span>
                  <span className="goal-progress-label">{goal.progress}%</span>
                </button>
              ))}
            </div>
          ) : <div className="empty-card"><span className="empty-summary-icon" aria-hidden="true">⌁</span><h2>Geen doelen in dit overzicht</h2><p>Je kunt filters aanpassen of een doel toevoegen wanneer dat goed voelt.</p><button type="button" className="secondary-button" onClick={openNew}>Een doel toevoegen</button></div>}
        </>
      ) : null}
      {!loading && !error && screen === 'form' ? (
        <GoalForm
          key={editingGoal?.id ?? 'new'}
          initial={editingGoal ? draftFromGoal(editingGoal) : createGoalDraft(today)}
          pillars={pillars}
          hasSteps={Boolean(editingGoal?.steps.length)}
          onCancel={() => setScreen(editingGoal ? 'detail' : 'list')}
          onSave={async (draft) => {
            const saved = await goalRepository.save(draft, editingGoal?.id)
            refresh()
            setSelectedId(saved.id)
            setScreen('detail')
          }}
        />
      ) : null}
      {!loading && !error && screen === 'detail' && selectedGoal ? (
        <>
          <button type="button" className="text-button habit-back" onClick={() => setScreen('list')}>‹ Alle doelen</button>
          <article className="content-card goal-detail-card">
            <p className="eyebrow">{getGoalStatusLabel(selectedGoal.status)} · {getGoalTypeLabel(selectedGoal.type)}</p>
            <h2>{selectedGoal.title}</h2>
            <p>{selectedGoal.description || 'Een doel dat voor jou betekenis heeft.'}</p>
            <div className="habit-pill-tags">{pillars.filter((pillar) => selectedGoal.pillars.includes(pillar.id)).map((pillar) => <span key={pillar.id}>{pillar.icon} {pillar.name}</span>)}</div>
            <div className="goal-detail-dates"><span>Start: {formatGoalDate(selectedGoal.startDate)}</span><span>Streefdatum: {formatGoalDate(selectedGoal.targetDate)}</span></div>
            <div className="goal-progress-header"><strong>Voortgang</strong><span>{getGoalProgress(selectedGoal)}%</span></div>
            <div className="goal-progress-track large" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={getGoalProgress(selectedGoal)}><span style={{ width: `${getGoalProgress(selectedGoal)}%` }} /></div>
            {!selectedGoal.steps.length && selectedGoal.status === 'active' ? (
              <div className="goal-progress-control">
                <label className="habit-field">Voortgang aanpassen · {manualProgress ?? selectedGoal.progress}%<input type="range" min={0} max={100} step={1} value={manualProgress ?? selectedGoal.progress} onChange={(event) => setManualProgress(Number(event.currentTarget.value))} /></label>
                <button type="button" className="secondary-button" onClick={() => void saveManualProgress(manualProgress ?? selectedGoal.progress)}>Voortgang bewaren</button>
              </div>
            ) : null}
            <p className="goal-timestamps">Aangemaakt {formatGoalDate(selectedGoal.createdAt.slice(0, 10))} · Laatst gewijzigd {formatGoalDate(selectedGoal.updatedAt.slice(0, 10))}</p>
            <div className="habit-action-row">
              <button type="button" className="secondary-button" onClick={() => { setEditingId(selectedGoal.id); setScreen('form') }}>Aanpassen</button>
              {selectedGoal.status === 'active' ? <button type="button" className="secondary-button" onClick={() => void updateStatus('paused')}>Pauzeren</button> : null}
              {selectedGoal.status === 'paused' ? <button type="button" className="secondary-button" onClick={() => void updateStatus('active')}>Hervatten</button> : null}
              {selectedGoal.status !== 'completed' && selectedGoal.status !== 'cancelled' ? <button type="button" className="secondary-button" onClick={() => void updateStatus('completed')}>Afronden</button> : null}
              {selectedGoal.status !== 'cancelled' && selectedGoal.status !== 'completed' ? <button type="button" className="text-button" onClick={() => void updateStatus('cancelled')}>Annuleren</button> : null}
              <button type="button" className="text-button" onClick={() => void removeGoal()}>Verwijderen</button>
            </div>
          </article>
          <section className="content-card goal-steps-card">
            <div className="section-heading compact"><div><p className="eyebrow">Kleine stappen, als dat helpt</p><h3>Deelstappen</h3></div><span>{selectedGoal.steps.filter((step) => step.completed).length}/{selectedGoal.steps.length}</span></div>
            {selectedGoal.steps.length ? (
              <ol className="goal-steps-list">
                {selectedGoal.steps.map((step, index) => (
                  <li key={step.id} className={step.completed ? 'completed' : ''}>
                    <label><input type="checkbox" checked={step.completed} disabled={selectedGoal.status !== 'active'} onChange={(event) => void toggleStep(step.id, event.currentTarget.checked)} /><span>{step.title}</span></label>
                    <div className="goal-step-actions">
                      <button type="button" className="icon-button" aria-label={`Verplaats ${step.title} omhoog`} disabled={index === 0 || selectedGoal.status !== 'active'} onClick={() => void moveStep(index, -1)}>↑</button>
                      <button type="button" className="icon-button" aria-label={`Verplaats ${step.title} omlaag`} disabled={index === selectedGoal.steps.length - 1 || selectedGoal.status !== 'active'} onClick={() => void moveStep(index, 1)}>↓</button>
                      <button type="button" className="icon-button" aria-label={`Bewerk ${step.title}`} disabled={selectedGoal.status !== 'active'} onClick={() => { setEditingStepId(step.id); setEditingStepTitle(step.title) }}>✎</button>
                      <button type="button" className="icon-button" aria-label={`Verwijder ${step.title}`} disabled={selectedGoal.status !== 'active'} onClick={() => void removeStep(step.id)}>×</button>
                    </div>
                  </li>
                ))}
              </ol>
            ) : <p className="muted-copy">Je kunt deelstappen toevoegen, of de voortgang zelf bijhouden.</p>}
            {selectedGoal.status === 'active' ? (
              <form className="goal-add-step" onSubmit={(event) => { event.preventDefault(); void saveStep(stepTitle); }}>
                <label className="habit-field">Nieuwe deelstap<input maxLength={160} value={stepTitle} onChange={(event) => setStepTitle(event.currentTarget.value)} /></label>
                <button type="submit" className="secondary-button" disabled={!stepTitle.trim()}>Toevoegen</button>
              </form>
            ) : null}
            {editingStepId !== null ? (
              <div className="goal-step-edit">
                <label className="habit-field">Deelstap aanpassen<input maxLength={160} value={editingStepTitle} onChange={(event) => setEditingStepTitle(event.currentTarget.value)} /></label>
                <button type="button" className="primary-button" disabled={!editingStepTitle.trim()} onClick={() => void saveStep(editingStepTitle, editingStepId)}>Bewaren</button>
                <button type="button" className="secondary-button" onClick={() => setEditingStepId(null)}>Annuleren</button>
              </div>
            ) : null}
          </section>
          <section className="content-card">
            <div className="section-heading compact"><div><p className="eyebrow">Gedeelde pijlers</p><h3>Gerelateerde gewoontes</h3></div></div>
            {relatedHabits.length ? <ul className="goal-related-list">{relatedHabits.slice(0, 5).map((habit) => <li key={habit.id}><strong>{habit.name}</strong><span>{habit.description || 'Een actieve gewoonte bij dezelfde pijler.'}</span></li>)}</ul> : <p className="muted-copy">Er zijn nog geen actieve gewoontes bij de gekoppelde pijlers.</p>}
          </section>
        </>
      ) : null}
    </section>
  )
}
