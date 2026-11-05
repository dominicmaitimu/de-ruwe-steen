import { describe, expect, it } from 'vitest'
import {
  createReflectionDraft,
  filterReflections,
  getReflectionDateRange,
  getReflectionPreview,
  isReflectionDateValid,
  isReflectionDraftValid,
  reflectionPrompts,
  reflectionTypeQuestions,
} from './reflection.logic'
import type { Reflection, ReflectionDraft } from './reflection.types'

function draft(): ReflectionDraft {
  return { ...createReflectionDraft('2026-10-30'), content: 'Vandaag nam ik tijd om stil te staan.', type: 'daily', pillarIds: ['mental', 'identity'] }
}

function reflection(overrides: Partial<Reflection> = {}): Reflection {
  return {
    id: 'note',
    title: '',
    content: 'Een persoonlijke gedachte.',
    date: '2026-10-30',
    type: 'journal',
    pillarIds: [],
    createdAt: '2026-10-30T10:00:00Z',
    updatedAt: '2026-10-30T10:00:00Z',
    ...overrides,
  }
}

describe('reflection logic', () => {
  it('allows optional titles and pillars while requiring valid non-empty content', () => {
    expect(isReflectionDraftValid(draft())).toBe(true)
    expect(isReflectionDraftValid({ ...draft(), content: ' \n ' })).toBe(false)
    expect(isReflectionDraftValid({ ...draft(), title: 'x'.repeat(121) })).toBe(false)
    expect(isReflectionDateValid('2026-11-31')).toBe(false)
  })

  it('accepts and preserves long reflection text within the supported size', () => {
    const longContent = 'Een lange persoonlijke reflectie. '.repeat(2000)
    const longDraft = { ...draft(), content: longContent }
    expect(longContent.length).toBeGreaterThan(50000)
    expect(isReflectionDraftValid(longDraft)).toBe(true)
    expect(longDraft.content).toBe(longContent)
  })

  it('filters reflections by period, type, and search with newest dates first', () => {
    const items = [
      reflection({ id: 'old', date: '2026-09-01', type: 'weekly' }),
      reflection({ id: 'monthly', date: '2026-10-25', type: 'monthly', title: 'Terugblik' }),
      reflection({ id: 'daily', date: '2026-10-30', type: 'daily', content: 'Rust in het park.' }),
    ]
    expect(filterReflections(items, { period: '7', today: '2026-10-30', type: 'all', search: '' }).map((item) => item.id)).toEqual(['daily', 'monthly'])
    expect(filterReflections(items, { period: 'all', today: '2026-10-30', type: 'daily', search: 'park' }).map((item) => item.id)).toEqual(['daily'])
    expect(getReflectionDateRange('7', '2026-10-30')).toEqual({ start: '2026-10-24', end: '2026-10-30' })
  })

  it('provides optional prompts and truncates previews without mutating content', () => {
    expect(reflectionPrompts.length).toBeGreaterThan(0)
    expect(reflectionTypeQuestions.weekly).toContain('Wat gaf mij energie?')
    expect(getReflectionPreview('Eerste regel\n  Tweede regel', 10)).toBe('Eerste reg…')
  })
})
