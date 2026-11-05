import { CapacitorSQLite } from '@capacitor-community/sqlite'
import { databaseService, DATABASE_NAME } from '../services/database.service'
import { sqliteQuery } from '../services/sqlite'
import { isActivityDateValid, isActivityDraftValid } from './activity.logic'
import type { Activity, ActivityDraft } from './activity.types'

type DatabaseRow = Record<string, unknown>

function rowFrom(value: unknown): DatabaseRow {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Database returned an invalid activity record')
  return value as DatabaseRow
}

function text(row: DatabaseRow, key: string): string {
  const value = row[key]
  if (typeof value !== 'string') throw new Error(`Database returned an invalid ${key}`)
  return value
}

function nullableNumber(row: DatabaseRow, key: string): number | null {
  const value = row[key]
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new Error(`Database returned an invalid ${key}`)
  return parsed
}

function mapActivity(rowValue: unknown, pillars: string[]): Activity {
  const row = rowFrom(rowValue)
  const activity: Activity = {
    id: text(row, 'id'),
    title: text(row, 'title'),
    description: text(row, 'description'),
    date: text(row, 'activity_date'),
    durationMinutes: nullableNumber(row, 'duration_minutes'),
    rating: nullableNumber(row, 'rating'),
    note: text(row, 'note'),
    pillarIds: pillars,
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
  }
  if (!isActivityDateValid(activity.date)) throw new Error('Database returned an invalid activity date')
  return activity
}

export const activityRepository = {
  async list(): Promise<Activity[]> {
    const [activityResult, pillarResult] = await Promise.all([
      sqliteQuery({
        database: DATABASE_NAME,
        statement: `SELECT id, title, description, activity_date, duration_minutes, rating, note, created_at, updated_at
          FROM activities ORDER BY activity_date DESC, created_at DESC`,
      }),
      sqliteQuery({ database: DATABASE_NAME, statement: 'SELECT activity_id, pillar_id FROM activity_pillars' }),
    ])
    const pillarsById = new Map<string, string[]>()
    for (const item of pillarResult.values ?? []) {
      const row = rowFrom(item)
      const id = text(row, 'activity_id')
      pillarsById.set(id, [...(pillarsById.get(id) ?? []), text(row, 'pillar_id')])
    }
    return (activityResult.values ?? []).map((item) => {
      const row = rowFrom(item)
      return mapActivity(item, pillarsById.get(text(row, 'id')) ?? [])
    })
  },

  async getById(id: string): Promise<Activity | null> {
    return (await this.list()).find((activity) => activity.id === id) ?? null
  },

  async save(draft: ActivityDraft, existingId?: string): Promise<Activity> {
    if (!isActivityDraftValid(draft)) throw new Error('Controleer de titel, datum, duur en waardering van de activiteit.')
    const id = existingId ?? crypto.randomUUID()
    const fields = [draft.title.trim(), draft.description.trim(), draft.date, draft.durationMinutes, draft.rating, draft.note.trim()]
    const set: { statement: string; values: (string | number | null)[] }[] = existingId
      ? [
          { statement: `UPDATE activities SET title = ?, description = ?, activity_date = ?, duration_minutes = ?, rating = ?, note = ?,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`, values: [...fields, id] },
          { statement: 'DELETE FROM activity_pillars WHERE activity_id = ?', values: [id] },
        ]
      : [{ statement: 'INSERT INTO activities (id, title, description, activity_date, duration_minutes, rating, note) VALUES (?, ?, ?, ?, ?, ?, ?)', values: [id, ...fields] }]
    for (const pillarId of draft.pillarIds) {
      set.push({ statement: 'INSERT INTO activity_pillars (activity_id, pillar_id) VALUES (?, ?)', values: [id, pillarId] })
    }
    await CapacitorSQLite.executeSet({ database: DATABASE_NAME, set, transaction: true })
    await databaseService.persist()
    const saved = await this.getById(id)
    if (!saved) throw new Error('Saved activity could not be loaded')
    return saved
  },

  async delete(id: string): Promise<void> {
    await CapacitorSQLite.executeSet({
      database: DATABASE_NAME,
      transaction: true,
      set: [
        { statement: 'DELETE FROM activity_pillars WHERE activity_id = ?', values: [id] },
        { statement: 'DELETE FROM activities WHERE id = ?', values: [id] },
      ],
    })
    await databaseService.persist()
  },
}
