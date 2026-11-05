import { CapacitorSQLite } from '@capacitor-community/sqlite'
import { DATABASE_NAME, databaseService } from '../services/database.service'
import { sqliteQuery } from '../services/sqlite'

export interface JourneyReflection {
  id: string
  text: string
  createdAt: string
}

export interface JourneySnapshot {
  answers: Record<number, string>
  completedDays: number[]
  reflections: JourneyReflection[]
  startedAt: string
}

type DatabaseRow = Record<string, unknown>

function rowFrom(value: unknown): DatabaseRow {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Database returned an invalid journey record')
  }
  return value as DatabaseRow
}

function text(row: DatabaseRow, key: string): string {
  const value = row[key]
  if (typeof value !== 'string') throw new Error(`Database returned an invalid ${key}`)
  return value
}

function day(row: DatabaseRow, key: string): number {
  const value = Number(row[key])
  if (!Number.isInteger(value) || value < 1 || value > 365) {
    throw new Error(`Database returned an invalid ${key}`)
  }
  return value
}

function validateDay(value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 365) {
    throw new Error('Kies een geldige reisdag tussen 1 en 365.')
  }
}

export const journeyRepository = {
  async load(): Promise<JourneySnapshot> {
    const [progressResult, answersResult, completedResult, reflectionsResult] = await Promise.all([
      sqliteQuery({
        database: DATABASE_NAME,
        statement: 'SELECT started_at FROM journey_progress WHERE id = 1',
      }),
      sqliteQuery({
        database: DATABASE_NAME,
        statement: 'SELECT journey_day, answer FROM journey_answers ORDER BY journey_day',
      }),
      sqliteQuery({
        database: DATABASE_NAME,
        statement: 'SELECT journey_day FROM journey_completed_days ORDER BY journey_day',
      }),
      sqliteQuery({
        database: DATABASE_NAME,
        statement: 'SELECT id, text, created_at FROM journey_reflections ORDER BY created_at DESC',
      }),
    ])
    const progress = progressResult.values?.[0]
    if (progress === undefined) throw new Error('De startdatum van de reflectiereis ontbreekt.')
    const startedAt = text(rowFrom(progress), 'started_at')
    if (Number.isNaN(new Date(startedAt).getTime())) throw new Error('De startdatum van de reflectiereis is ongeldig.')

    const answers: Record<number, string> = {}
    for (const value of answersResult.values ?? []) {
      const row = rowFrom(value)
      answers[day(row, 'journey_day')] = text(row, 'answer')
    }

    return {
      answers,
      completedDays: (completedResult.values ?? []).map((value) => day(rowFrom(value), 'journey_day')),
      reflections: (reflectionsResult.values ?? []).map((value) => {
        const row = rowFrom(value)
        return {
          id: text(row, 'id'),
          text: text(row, 'text'),
          createdAt: text(row, 'created_at'),
        }
      }),
      startedAt,
    }
  },

  async saveAnswer(journeyDay: number, answer: string): Promise<void> {
    validateDay(journeyDay)
    const normalizedAnswer = answer.trim()
    if (!normalizedAnswer) throw new Error('Schrijf eerst je antwoord voordat je het opslaat.')

    await CapacitorSQLite.executeSet({
      database: DATABASE_NAME,
      transaction: true,
      set: [
        {
          statement: `INSERT INTO journey_answers (journey_day, answer)
            VALUES (?, ?)
            ON CONFLICT(journey_day) DO UPDATE SET
              answer = excluded.answer,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
          values: [journeyDay, normalizedAnswer],
        },
        {
          statement: 'INSERT OR IGNORE INTO journey_completed_days (journey_day) VALUES (?)',
          values: [journeyDay],
        },
      ],
    })
    await databaseService.persist()
  },

  async saveReflection(value: string): Promise<void> {
    const reflectionText = value.trim()
    if (!reflectionText) throw new Error('Schrijf eerst je reflectie voordat je deze opslaat.')
    await CapacitorSQLite.run({
      database: DATABASE_NAME,
      statement: 'INSERT INTO journey_reflections (id, text) VALUES (?, ?)',
      values: [crypto.randomUUID(), reflectionText],
    })
    await databaseService.persist()
  },
}
