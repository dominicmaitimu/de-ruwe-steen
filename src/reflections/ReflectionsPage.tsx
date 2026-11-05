import { useEffect, useMemo, useState } from 'react'
import { checkInRepository } from '../check-in/check-in.repository'
import type { Pillar } from '../check-in/check-in.types'
import { toDateKey } from '../check-in/check-in.logic'
import { useLocalDate } from '../hooks/useLocalDate'
import {
  createReflectionDraft,
  draftFromReflection,
  filterReflections,
  formatReflectionDate,
  getReflectionPreview,
  isReflectionDraftValid,
  reflectionPrompts,
  reflectionTypeDescriptions,
  reflectionTypeLabels,
  reflectionTypeQuestions,
} from './reflection.logic'
import { reflectionRepository } from './reflection.repository'
import type { Reflection, ReflectionDraft, ReflectionPeriod, ReflectionType } from './reflection.types'

type ReflectionScreen = 'list' | 'editor' | 'detail'

interface ReflectionsPageProps {
  initialCreate: boolean
  initialPillarId: string | null
  initialReflectionId: string | null
  onUnsavedChange: (dirty: boolean) => void
  onUpdated: () => void
}

const periods: { value: ReflectionPeriod; label: string }[] = [
  { value: '7', label: 'Laatste 7 dagen' },
  { value: '30', label: 'Laatste 30 dagen' },
  { value: '90', label: 'Laatste 90 dagen' },
  { value: 'all', label: 'Alles' },
]

export function ReflectionsPage({ initialCreate, initialPillarId, initialReflectionId, onUnsavedChange, onUpdated }: ReflectionsPageProps) {
  const today = toDateKey(useLocalDate())
  const [reflections, setReflections] = useState<Reflection[]>([])
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [screen, setScreen] = useState<ReflectionScreen>(initialCreate ? 'editor' : initialReflectionId ? 'detail' : 'list')
  const [selectedId, setSelectedId] = useState<string | null>(initialReflectionId)
  const [draft, setDraft] = useState<ReflectionDraft>(createReflectionDraft(today))
  const [originalDraft, setOriginalDraft] = useState<ReflectionDraft>(createReflectionDraft(today))
  const [period, setPeriod] = useState<ReflectionPeriod>('all')
  const [typeFilter, setTypeFilter] = useState<ReflectionType | 'all'>('all')
  const [pillarFilter, setPillarFilter] = useState(initialPillarId ?? '')
  const [search, setSearch] = useState('')
  const [promptOpen, setPromptOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const dirty = screen === 'editor' && JSON.stringify(draft) !== JSON.stringify(originalDraft)
  const selectedReflection = reflections.find((reflection) => reflection.id === selectedId) ?? null
  const filtered = useMemo(() => filterReflections(reflections.filter((reflection) => !pillarFilter || reflection.pillarIds.includes(pillarFilter)), { period, today, type: typeFilter, search }), [period, pillarFilter, reflections, search, today, typeFilter])

  useEffect(() => onUnsavedChange(dirty), [dirty, onUnsavedChange])
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])
  useEffect(() => {
    let active = true
    void Promise.all([reflectionRepository.list(), checkInRepository.getPillars()]).then(([nextReflections, nextPillars]) => {
      if (!active) return
      setReflections(nextReflections)
      setPillars(nextPillars)
      setError(null)
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : String(reason))
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const startNew = () => {
    const nextDraft = createReflectionDraft(today)
    setDraft(nextDraft)
    setOriginalDraft(nextDraft)
    setSelectedId(null)
    setPromptOpen(false)
    setScreen('editor')
  }
  const startEdit = (reflection: Reflection) => {
    const nextDraft = draftFromReflection(reflection)
    setDraft(nextDraft)
    setOriginalDraft(nextDraft)
    setPromptOpen(false)
    setScreen('editor')
  }
  const confirmLeave = () => {
    if (dirty && !window.confirm('Je reflectie is nog niet bewaard. Wil je deze wijzigingen verlaten?')) return false
    onUnsavedChange(false)
    return true
  }
  const save = async () => {
    if (!isReflectionDraftValid(draft)) return
    try {
      const saved = await reflectionRepository.save(draft, selectedId ?? undefined)
      setReflections((current) => [saved, ...current.filter((reflection) => reflection.id !== saved.id)].sort((a, b) => b.date.localeCompare(a.date)))
      setOriginalDraft(draft)
      setSelectedId(saved.id)
      setScreen('detail')
      setPromptOpen(false)
      onUnsavedChange(false)
      onUpdated()
      setError(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }
  const remove = async () => {
    if (!selectedReflection || !window.confirm('Wil je deze reflectie permanent van dit apparaat verwijderen?')) return
    try {
      await reflectionRepository.delete(selectedReflection.id)
      setReflections((current) => current.filter((reflection) => reflection.id !== selectedReflection.id))
      setSelectedId(null)
      setScreen('list')
      setError(null)
      onUpdated()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }
  const addPrompt = (question: string) => {
    setDraft((current) => ({ ...current, content: current.content ? `${current.content.trimEnd()}\n\n${question}\n\n` : `${question}\n\n` }))
    setPromptOpen(false)
  }
  const addQuestionSet = () => {
    const questions = reflectionTypeQuestions[draft.type] ?? []
    if (!questions.length) return
    const block = questions.map((question) => `${question}\n`).join('\n')
    setDraft((current) => ({ ...current, content: current.content ? `${current.content.trimEnd()}\n\n${block}` : block }))
  }

  return (
    <section className="screen-section reflections-page">
      {error ? <div className="inline-error" role="alert">Reflecties konden niet worden geladen of bijgewerkt.</div> : null}
      {loading ? <div className="loading-card" role="status">Reflecties laden…</div> : null}
      {!loading && screen === 'list' ? (
        <>
          <header className="reflection-list-header"><div><p className="eyebrow">Een plek voor jouw woorden</p><h2>Reflecties</h2><p>Schrijf vrij, wanneer en hoe het bij je past.</p></div><button type="button" className="primary-button" onClick={startNew}>Iets opschrijven</button></header>
          <div className="reflection-filters">
            <label className="habit-field">Periode<select value={period} onChange={(event) => setPeriod(event.currentTarget.value as ReflectionPeriod)}>{periods.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="habit-field">Type<select value={typeFilter} onChange={(event) => setTypeFilter(event.currentTarget.value as ReflectionType | 'all')}><option value="all">Alle typen</option>{Object.entries(reflectionTypeLabels).map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select></label>
            <label className="habit-field">Pijler<select value={pillarFilter} onChange={(event) => setPillarFilter(event.currentTarget.value)}><option value="">Alle pijlers</option>{pillars.map((pillar) => <option key={pillar.id} value={pillar.id}>{pillar.name}</option>)}</select></label>
            <label className="habit-field reflection-search">Zoeken<input type="search" value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Zoek in titel of tekst" /></label>
          </div>
          {filtered.length ? <ul className="reflection-list">{filtered.map((reflection) => (
            <li key={reflection.id}><button type="button" className="reflection-list-card" onClick={() => { setSelectedId(reflection.id); setScreen('detail') }}>
              <span className="reflection-list-heading"><strong>{reflection.title || reflectionTypeLabels[reflection.type]}</strong><time>{formatReflectionDate(reflection.date)}</time></span>
              <span className="reflection-list-meta">{reflectionTypeLabels[reflection.type]}{reflection.pillarIds.map((id) => pillars.find((pillar) => pillar.id === id)?.name).filter(Boolean).map((name) => ` · ${name}`).join('')}</span>
              <span className="reflection-preview">{getReflectionPreview(reflection.content)}</span>
            </button></li>
          ))}</ul> : <div className="empty-card"><span className="empty-summary-icon" aria-hidden="true">⌁</span><h2>Geen reflecties in deze selectie</h2><p>Je hoeft niet dagelijks te schrijven. Begin wanneer het voor jou goed voelt.</p><button type="button" className="secondary-button" onClick={startNew}>Een reflectie beginnen</button></div>}
        </>
      ) : null}
      {!loading && screen === 'editor' ? (
        <form className="reflection-editor form-card" onSubmit={(event) => { event.preventDefault(); void save() }}>
          <div className="form-intro"><p className="eyebrow">Alleen voor jou</p><h2>{selectedId ? 'Reflectie aanpassen' : 'Neem rustig de ruimte'}</h2><p>Je tekst blijft op dit apparaat. Er zijn geen goede of foute woorden.</p></div>
          <label className="habit-field">Titel <span>Optioneel</span><input maxLength={120} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })} placeholder="Een titel, als je wilt" /></label>
          <div className="habit-number-row">
            <label className="habit-field">Datum<input type="date" required value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.currentTarget.value })} /></label>
            <label className="habit-field">Type<select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.currentTarget.value as ReflectionType })}>{Object.entries(reflectionTypeLabels).map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select></label>
          </div>
          <p className="muted-copy">{reflectionTypeDescriptions[draft.type]}</p>
          <label className="habit-field reflection-content-label">Jouw woorden <span>Verplicht</span><textarea className="reflection-content" required maxLength={100000} value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.currentTarget.value })} placeholder="Begin waar je wilt…" /></label>
          {reflectionTypeQuestions[draft.type] ? <div className="reflection-template">
            <p className="eyebrow">Vragen als inspiratie · helemaal optioneel</p>
            <p>{reflectionTypeQuestions[draft.type]?.join(' · ')}</p>
            <button type="button" className="secondary-button" onClick={addQuestionSet}>Voeg vragen toe aan mijn tekst</button>
          </div> : null}
          <fieldset className="habit-fieldset reflection-pillars">
            <legend>Pijlers <span>Optioneel · meerdere mogelijk</span></legend>
            <div className="habit-pillar-options">{pillars.map((pillar) => (
              <button type="button" key={pillar.id} className={`habit-choice ${draft.pillarIds.includes(pillar.id) ? 'selected' : ''}`} aria-pressed={draft.pillarIds.includes(pillar.id)} onClick={() => setDraft((current) => ({ ...current, pillarIds: current.pillarIds.includes(pillar.id) ? current.pillarIds.filter((id) => id !== pillar.id) : [...current.pillarIds, pillar.id] }))}>
                <span className="pillar-icon" style={{ backgroundColor: pillar.color }} aria-hidden="true">{pillar.icon}</span>{pillar.name}
              </button>
            ))}</div>
          </fieldset>
          <section className="reflection-inspiration">
            <button type="button" className="text-button" aria-expanded={promptOpen} onClick={() => setPromptOpen((open) => !open)}>{promptOpen ? 'Inspiratie verbergen' : 'Een reflectievraag gebruiken (optioneel)'}</button>
            {promptOpen ? <div className="reflection-prompt-groups">{reflectionPrompts.map((group) => (
              <div key={group.title}><h3>{group.title}</h3>{group.questions.map((question) => <button type="button" className="reflection-prompt" key={question} onClick={() => addPrompt(question)}>{question}</button>)}</div>
            ))}</div> : null}
          </section>
          <p className="reflection-privacy-note">Je reflecties blijven lokaal op dit apparaat en worden niet geanalyseerd of gedeeld.</p>
          <div className="form-actions"><button type="button" className="secondary-button" onClick={() => { if (confirmLeave()) setScreen(selectedId ? 'detail' : 'list') }}>Terug</button><button type="submit" className="primary-button" disabled={!isReflectionDraftValid(draft)}>Reflectie bewaren</button></div>
        </form>
      ) : null}
      {!loading && screen === 'detail' && selectedReflection ? (
        <>
          <button type="button" className="text-button habit-back" onClick={() => { setSelectedId(null); setScreen('list') }}>‹ Alle reflecties</button>
          <article className="content-card reflection-detail-card">
            <p className="eyebrow">{reflectionTypeLabels[selectedReflection.type]} · {formatReflectionDate(selectedReflection.date)}</p>
            <h2>{selectedReflection.title || reflectionTypeLabels[selectedReflection.type]}</h2>
            <div className="habit-pill-tags">{selectedReflection.pillarIds.map((id) => pillars.find((pillar) => pillar.id === id)).filter((pillar): pillar is Pillar => Boolean(pillar)).map((pillar) => <span key={pillar.id}>{pillar.icon} {pillar.name}</span>)}</div>
            <p className="reflection-detail-content">{selectedReflection.content}</p>
            <div className="habit-action-row"><button type="button" className="primary-button" onClick={() => startEdit(selectedReflection)}>Aanpassen</button><button type="button" className="text-button" onClick={() => void remove()}>Verwijderen</button></div>
          </article>
        </>
      ) : null}
    </section>
  )
}
