import { isCheckInDraftValid } from './check-in.logic'
import { databaseService, DATABASE_NAME } from '../services/database.service'
import { sqliteQuery, sqliteRun } from '../services/sqlite'
import type { CheckIn, CheckInDraft, Pillar } from './check-in.types'

type DatabaseRow = Record<string, unknown>

function asRow(value: unknown): DatabaseRow {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Database returned an invalid row')
  }
  return value as DatabaseRow
}

function readNumber(row: DatabaseRow, key: string): number {
  const value = Number(row[key])
  if (!Number.isFinite(value)) {
    throw new Error(`Database returned an invalid ${key}`)
  }
  return value
}

function readString(row: DatabaseRow, key: string): string {
  const value = row[key]
  if (typeof value !== 'string') {
    throw new Error(`Database returned an invalid ${key}`)
  }
  return value
}

function mapCheckIn(value: unknown): CheckIn {
  const row = asRow(value)
  const reflection = row.reflection

  return {
    id: readNumber(row, 'id'),
    date: readString(row, 'check_in_date'),
    mood: readNumber(row, 'mood') as CheckIn['mood'],
    energy: readNumber(row, 'energy') as CheckIn['energy'],
    mentalCalm: readNumber(row, 'mental_calm') as CheckIn['mentalCalm'],
    satisfaction: readNumber(row, 'satisfaction') as CheckIn['satisfaction'],
    didSomethingForSelf: readNumber(row, 'did_something_for_self') === 1,
    reflection: typeof reflection === 'string' ? reflection : null,
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  }
}

function mapPillar(value: unknown): Pillar {
  const row = asRow(value)
  return {
    id: readString(row, 'id'),
    name: readString(row, 'name'),
    color: readString(row, 'color'),
    icon: readString(row, 'icon'),
    sortOrder: readNumber(row, 'sort_order'),
  }
}

export const checkInRepository = {
  async getPillars(): Promise<Pillar[]> {
    const result = await sqliteQuery({
      database: DATABASE_NAME,
      statement: 'SELECT id, name, color, icon, sort_order FROM pillars ORDER BY sort_order',
    })
    return (result.values ?? []).map(mapPillar)
  },

  async getByDate(date: string): Promise<CheckIn | null> {
    const result = await sqliteQuery({
      database: DATABASE_NAME,
      statement: 'SELECT * FROM daily_check_ins WHERE check_in_date = ? LIMIT 1',
      values: [date],
    })
    const row = result.values?.[0]
    return row === undefined ? null : mapCheckIn(row)
  },

  async save(draft: CheckInDraft): Promise<CheckIn> {
    if (!isCheckInDraftValid(draft)) {
      throw new Error('Check-in bevat ongeldige waarden')
    }

    await sqliteRun({
      database: DATABASE_NAME,
      statement: `
        INSERT INTO daily_check_ins (
          check_in_date, mood, energy, mental_calm, satisfaction,
          did_something_for_self, reflection
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(check_in_date) DO UPDATE SET
          mood = excluded.mood,
          energy = excluded.energy,
          mental_calm = excluded.mental_calm,
          satisfaction = excluded.satisfaction,
          did_something_for_self = excluded.did_something_for_self,
          reflection = excluded.reflection,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      `,
      values: [
        draft.date,
        draft.mood,
        draft.energy,
        draft.mentalCalm,
        draft.satisfaction,
        draft.didSomethingForSelf ? 1 : 0,
        draft.reflection.trim() || null,
      ],
    })
    await databaseService.persist()

    const saved = await this.getByDate(draft.date)
    if (!saved) {
      throw new Error('Saved check-in could not be loaded')
    }
    return saved
  },

  async getBetween(startDate: string, endDate: string): Promise<CheckIn[]> {
    const result = await sqliteQuery({
      database: DATABASE_NAME,
      statement: `
        SELECT * FROM daily_check_ins
        WHERE check_in_date >= ? AND check_in_date <= ?
        ORDER BY check_in_date DESC
      `,
      values: [startDate, endDate],
    })
    return (result.values ?? []).map(mapCheckIn)
  },
}
