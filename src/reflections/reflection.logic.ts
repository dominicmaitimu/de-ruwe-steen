import { toDateKey } from '../check-in/check-in.logic'
import type { Reflection, ReflectionDraft, ReflectionPeriod, ReflectionType } from './reflection.types'
import { formatDateDisplay } from '../utils/format-date'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export interface ReflectionPromptGroup {
  title: string
  questions: string[]
}

export const reflectionPrompts: ReflectionPromptGroup[] = [
  {
    title: 'Zelfbewustzijn',
    questions: [
      'Wie ben ik wanneer ik niet bezig ben met verwachtingen van anderen?',
      'Wat vind ik op dit moment werkelijk belangrijk?',
      'Waar ben ik tevreden over?',
    ],
  },
  {
    title: 'Mentale balans',
    questions: [
      'Wat houdt mij bezig?',
      'Wat kost mij energie?',
      'Waar ervaar ik rust?',
    ],
  },
  {
    title: 'Persoonlijke ontwikkeling',
    questions: [
      'Wat heb ik vandaag geleerd?',
      'Welke overtuiging heb ik onlangs heroverwogen?',
      'Waar wil ik mezelf verder in ontwikkelen?',
    ],
  },
  {
    title: 'Eigen identiteit',
    questions: [
      'Heb ik vandaag keuzes gemaakt die bij mij passen?',
      'Wat zou ik doen als ik minder rekening hield met verwachtingen van anderen?',
      'Waar wil ik meer ruimte voor maken?',
    ],
  },
]

export const reflectionTypeLabels: Record<ReflectionType, string> = {
  journal: 'Dagboek',
  daily: 'Dagelijks',
  weekly: 'Wekelijks',
  monthly: 'Maandelijks',
}

export const reflectionTypeDescriptions: Record<ReflectionType, string> = {
  journal: 'Een vrije gedachte, op jouw moment.',
  daily: 'Een korte terugblik op de dag.',
  weekly: 'Een terugblik op de afgelopen week.',
  monthly: 'Een bredere blik op je ontwikkeling.',
}

export const reflectionTypeQuestions: Partial<Record<ReflectionType, string[]>> = {
  weekly: [
    'Wat ging goed?',
    'Wat gaf mij energie?',
    'Wat kostte mij energie?',
    'Wat heb ik geleerd?',
    'Wat wil ik volgende week anders doen?',
  ],
  monthly: [
    'Welke veranderingen merk ik?',
    'Wat heb ik geleerd?',
    'Welke doelen zijn nog relevant?',
    'Welke pijler verdient meer aandacht?',
    'Ben ik tevreden met mijn richting?',
  ],
}

export function isReflectionDateValid(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  return !Number.isNaN(date.getTime()) && toDateKey(date) === value
}

export function isReflectionDraftValid(draft: ReflectionDraft): boolean {
  return Boolean(
    draft.title.trim().length <= 120
    && draft.content.trim().length > 0
    && draft.content.length <= 100000
    && isReflectionDateValid(draft.date)
    && ['journal', 'daily', 'weekly', 'monthly'].includes(draft.type)
    && new Set(draft.pillarIds).size === draft.pillarIds.length
  )
}

export function getReflectionDateRange(period: ReflectionPeriod, today: string): { start: string | null; end: string } {
  if (period === 'all') return { start: null, end: today }
  const endDate = new Date(`${today}T12:00:00`)
  endDate.setDate(endDate.getDate() - Number(period) + 1)
  return { start: toDateKey(endDate), end: today }
}

export function filterReflections(
  reflections: Reflection[],
  options: { period: ReflectionPeriod; today: string; type: ReflectionType | 'all'; search: string },
): Reflection[] {
  const range = getReflectionDateRange(options.period, options.today)
  const search = options.search.trim().toLocaleLowerCase()
  return reflections
    .filter((reflection) =>
      (!range.start || reflection.date >= range.start)
      && reflection.date <= range.end
      && (options.type === 'all' || reflection.type === options.type)
      && (!search || `${reflection.title} ${reflection.content}`.toLocaleLowerCase().includes(search)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
}

export function createReflectionDraft(today: string): ReflectionDraft {
  return { title: '', content: '', date: today, type: 'journal', pillarIds: [] }
}

export function draftFromReflection(reflection: Reflection): ReflectionDraft {
  return { ...reflection, pillarIds: [...reflection.pillarIds] }
}

export function getReflectionPreview(content: string, maximumLength = 180): string {
  const normalized = content.replace(/\s+/g, ' ').trim()
  return normalized.length > maximumLength ? `${normalized.slice(0, maximumLength).trimEnd()}…` : normalized
}

export function formatReflectionDate(value: string): string {
  return formatDateDisplay(new Date(`${value}T12:00:00`), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
