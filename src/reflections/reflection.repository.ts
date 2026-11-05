import { CapacitorSQLite } from '@capacitor-community/sqlite'
import { databaseService, DATABASE_NAME } from '../services/database.service'
import { sqliteQuery } from '../services/sqlite'
import { isReflectionDateValid, isReflectionDraftValid } from './reflection.logic'
import type { Reflection, ReflectionDraft, ReflectionType } from './reflection.types'

type DatabaseRow = Record<string, unknown>

function rowFrom(value: unknown): DatabaseRow {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Database returned an invalid reflection record')
  return value as DatabaseRow
}

function text(row: DatabaseRow, key: string): string {
  const value = row[key]
  if (typeof value !== 'string') throw new Error(`Database returned an invalid ${key}`)
  return value
}

function mapReflection(value: unknown, pillars: string[]): Reflection {
  const row = rowFrom(value)
  const reflection: Reflection = {
    id: text(row, 'id'),
    title: text(row, 'title'),
    content: text(row, 'content'),
    date: text(row, 'reflection_date'),
    type: text(row, 'reflection_type') as ReflectionType,
    pillarIds: pillars,
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
  }
  if (!isReflectionDateValid(reflection.date)) throw new Error('Database returned an invalid reflection date')
  return reflection
}

export const reflectionRepository = {
  async list(): Promise<Reflection[]> {
    const [reflectionResult, pillarResult] = await Promise.all([
      sqliteQuery({
        database: DATABASE_NAME,
        statement: `SELECT id, title, content, reflection_date, reflection_type, created_at, updated_at
          FROM reflections ORDER BY reflection_date DESC, created_at DESC`,
      }),
      sqliteQuery({ database: DATABASE_NAME, statement: 'SELECT reflection_id, pillar_id FROM reflection_pillars' }),
    ])
    const pillarsById = new Map<string, string[]>()
    for (const item of pillarResult.values ?? []) {
      const row = rowFrom(item)
      const id = text(row, 'reflection_id')
      pillarsById.set(id, [...(pillarsById.get(id) ?? []), text(row, 'pillar_id')])
    }
    return (reflectionResult.values ?? []).map((item) => {
      const row = rowFrom(item)
      return mapReflection(item, pillarsById.get(text(row, 'id')) ?? [])
    })
  },

  async getById(id: string): Promise<Reflection | null> {
    return (await this.list()).find((reflection) => reflection.id === id) ?? null
  },

  async save(draft: ReflectionDraft, existingId?: string): Promise<Reflection> {
    if (!isReflectionDraftValid(draft)) throw new Error('Controleer de inhoud en datum van je reflectie.')
    const id = existingId ?? crypto.randomUUID()
    const values = [draft.title.trim(), draft.content, draft.date, draft.type]
    const set: { statement: string; values: (string | number | null)[] }[] = existingId
      ? [
          { statement: `UPDATE reflections SET title = ?, content = ?, reflection_date = ?, reflection_type = ?,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`, values: [...values, id] },
          { statement: 'DELETE FROM reflection_pillars WHERE reflection_id = ?', values: [id] },
        ]
      : [{ statement: 'INSERT INTO reflections (id, title, content, reflection_date, reflection_type) VALUES (?, ?, ?, ?, ?)', values: [id, ...values] }]
    for (const pillarId of draft.pillarIds) {
      set.push({ statement: 'INSERT INTO reflection_pillars (reflection_id, pillar_id) VALUES (?, ?)', values: [id, pillarId] })
    }
    await CapacitorSQLite.executeSet({ database: DATABASE_NAME, set, transaction: true })
    await databaseService.persist()
    const saved = await this.getById(id)
    if (!saved) throw new Error('Saved reflection could not be loaded')
    return saved
  },

  async delete(id: string): Promise<void> {
    await CapacitorSQLite.executeSet({
      database: DATABASE_NAME,
      transaction: true,
      set: [
        { statement: 'DELETE FROM reflection_pillars WHERE reflection_id = ?', values: [id] },
        { statement: 'DELETE FROM reflections WHERE id = ?', values: [id] },
      ],
    })
    await databaseService.persist()
  },
}
