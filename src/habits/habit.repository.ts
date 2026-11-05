import { CapacitorSQLite } from '@capacitor-community/sqlite'
import { databaseService, DATABASE_NAME } from '../services/database.service'
import { sqliteQuery, sqliteRun } from '../services/sqlite'
import type { Habit, HabitDraft, HabitEntry, HabitEntryDraft, HabitStatus } from './habit.types'
import { isHabitDraftValid, isHabitRelevantOnDate, isValidDateKey } from './habit.logic'
import type { HabitStatusPeriod } from './habit.types'

type DatabaseRow = Record<string, unknown>

function rowFrom(value: unknown): DatabaseRow {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Database returned an invalid habit record')
  }
  return value as DatabaseRow
}

function text(row: DatabaseRow, key: string): string {
  const value = row[key]
  if (typeof value !== 'string') throw new Error(`Database returned an invalid ${key}`)
  return value
}

function number(row: DatabaseRow, key: string): number {
  const value = Number(row[key])
  if (!Number.isFinite(value)) throw new Error(`Database returned an invalid ${key}`)
  return value
}

function mapHabit(value: unknown): Habit {
  const row = rowFrom(value)
  const duration = row.desired_duration_minutes
  const endDate = row.end_date
  const rawWeekdays = text(row, 'weekdays')
  return {
    id: text(row, 'id'),
    name: text(row, 'name'),
    description: text(row, 'description'),
    frequencyType: text(row, 'frequency_type') as Habit['frequencyType'],
    targetCount: number(row, 'target_count'),
    periodDays: number(row, 'period_days'),
    weekdays: rawWeekdays ? rawWeekdays.split(',').map(Number) : [],
    desiredDurationMinutes: duration === null || duration === undefined ? null : number(row, 'desired_duration_minutes'),
    startDate: text(row, 'start_date'),
    endDate: typeof endDate === 'string' ? endDate : null,
    status: text(row, 'status') as HabitStatus,
    pillarIds: [],
    statusPeriods: [],
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
  }
}

function mapEntry(value: unknown): HabitEntry {
  const row = rowFrom(value)
  const duration = row.duration_minutes
  return {
    id: number(row, 'id'),
    habitId: text(row, 'habit_id'),
    date: text(row, 'entry_date'),
    completed: number(row, 'completed') === 1,
    durationMinutes: duration === null || duration === undefined ? null : number(row, 'duration_minutes'),
    note: text(row, 'note'),
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
  }
}

function toValues(draft: HabitDraft) {
  return [
    draft.name.trim(),
    draft.description.trim(),
    draft.frequencyType,
    draft.targetCount,
    draft.periodDays,
    [...draft.weekdays].sort((a, b) => a - b).join(','),
    draft.desiredDurationMinutes,
    draft.startDate,
    draft.endDate || null,
  ]
}

export const habitRepository = {
  async list(): Promise<Habit[]> {
    const result = await sqliteQuery({
      database: DATABASE_NAME,
      statement: `
        SELECT id, name, description, frequency_type, target_count, period_days, weekdays,
          desired_duration_minutes, start_date, end_date, status, created_at, updated_at
        FROM habits
        ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END, name COLLATE NOCASE
      `,
    })
    const habits = (result.values ?? []).map(mapHabit)
    if (!habits.length) return habits
    const links = await sqliteQuery({
      database: DATABASE_NAME,
      statement: 'SELECT habit_id, pillar_id FROM habit_pillars',
    })
    const pillarIdsByHabit = new Map<string, string[]>()
    for (const item of links.values ?? []) {
      const link = rowFrom(item)
      const habitId = text(link, 'habit_id')
      pillarIdsByHabit.set(habitId, [...(pillarIdsByHabit.get(habitId) ?? []), text(link, 'pillar_id')])
    }
    const periods = await sqliteQuery({
      database: DATABASE_NAME,
      statement: 'SELECT habit_id, status, starts_on, ends_on FROM habit_status_periods ORDER BY starts_on',
    })
    const periodsByHabit = new Map<string, HabitStatusPeriod[]>()
    for (const item of periods.values ?? []) {
      const period = rowFrom(item)
      const habitId = text(period, 'habit_id')
      periodsByHabit.set(habitId, [...(periodsByHabit.get(habitId) ?? []), {
        status: text(period, 'status') as HabitStatus,
        startDate: text(period, 'starts_on'),
        endDate: typeof period.ends_on === 'string' ? period.ends_on : null,
      }])
    }
    return habits.map((habit) => ({
      ...habit,
      pillarIds: pillarIdsByHabit.get(habit.id) ?? [],
      statusPeriods: periodsByHabit.get(habit.id) ?? [],
    }))
  },

  async getById(id: string): Promise<Habit | null> {
    const habits = await this.list()
    return habits.find((habit) => habit.id === id) ?? null
  },

  async save(draft: HabitDraft, existingId?: string): Promise<Habit> {
    if (!isHabitDraftValid(draft)) throw new Error('Controleer de naam, pijlers, frequentie en datums van deze gewoonte.')
    const values = toValues(draft)
    const id = existingId ?? crypto.randomUUID()
    const set = existingId
      ? [
          {
            statement: `
              UPDATE habits SET name = ?, description = ?, frequency_type = ?, target_count = ?,
                period_days = ?, weekdays = ?, desired_duration_minutes = ?, start_date = ?,
                end_date = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
              WHERE id = ?
            `,
            values: [...values, id],
          },
          { statement: 'DELETE FROM habit_pillars WHERE habit_id = ?', values: [id] },
        ]
      : [{
          statement: `
            INSERT INTO habits (
              id, name, description, frequency_type, target_count, period_days, weekdays,
              desired_duration_minutes, start_date, end_date, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
          `,
          values: [id, ...values],
        }, {
          statement: "INSERT INTO habit_status_periods (habit_id, status, starts_on) VALUES (?, 'active', ?)",
          values: [id, draft.startDate],
        }]
    for (const pillarId of draft.pillarIds) {
      set.push({ statement: 'INSERT INTO habit_pillars (habit_id, pillar_id) VALUES (?, ?)', values: [id, pillarId] })
    }
    await CapacitorSQLite.executeSet({ database: DATABASE_NAME, set, transaction: true })
    await databaseService.persist()
    const saved = await this.getById(id)
    if (!saved) throw new Error('Saved habit could not be loaded')
    return saved
  },

  async setStatus(id: string, status: HabitStatus, today?: string): Promise<void> {
    if (!today || !isValidDateKey(today)) throw new Error('A valid date is required to change a habit status')
    await CapacitorSQLite.executeSet({
      database: DATABASE_NAME,
      transaction: true,
      set: [
        {
          statement: `
            UPDATE habits SET status = ?,
              end_date = CASE WHEN ? = 'ended' THEN MAX(start_date, ?) ELSE end_date END,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            WHERE id = ?
          `,
          values: [status, status, today, id],
        },
        { statement: 'DELETE FROM habit_status_periods WHERE habit_id = ? AND ends_on IS NULL AND starts_on >= ?', values: [id, today] },
        { statement: "UPDATE habit_status_periods SET ends_on = date(?, '-1 day') WHERE habit_id = ? AND ends_on IS NULL AND starts_on < ?", values: [today, id, today] },
        { statement: 'INSERT INTO habit_status_periods (habit_id, status, starts_on) VALUES (?, ?, ?)', values: [id, status, today] },
      ],
    })
    await databaseService.persist()
  },

  async entriesBetween(habitId: string, startDate: string, endDate: string): Promise<HabitEntry[]> {
    if (!isValidDateKey(startDate) || !isValidDateKey(endDate) || startDate > endDate) {
      throw new Error('Invalid habit history date range')
    }
    const result = await sqliteQuery({
      database: DATABASE_NAME,
      statement: `
        SELECT id, habit_id, entry_date, completed, duration_minutes, note, created_at, updated_at
        FROM habit_entries
        WHERE habit_id = ? AND entry_date >= ? AND entry_date <= ?
        ORDER BY entry_date DESC
      `,
      values: [habitId, startDate, endDate],
    })
    return (result.values ?? []).map(mapEntry)
  },

  async entryForDate(habitId: string, date: string): Promise<HabitEntry | null> {
    const result = await sqliteQuery({
      database: DATABASE_NAME,
      statement: 'SELECT * FROM habit_entries WHERE habit_id = ? AND entry_date = ? LIMIT 1',
      values: [habitId, date],
    })
    const value = result.values?.[0]
    return value === undefined ? null : mapEntry(value)
  },

  async entriesForDate(date: string): Promise<HabitEntry[]> {
    const result = await sqliteQuery({
      database: DATABASE_NAME,
      statement: `
        SELECT id, habit_id, entry_date, completed, duration_minutes, note, created_at, updated_at
        FROM habit_entries WHERE entry_date = ?
      `,
      values: [date],
    })
    return (result.values ?? []).map(mapEntry)
  },

  async saveEntry(habitId: string, date: string, draft: HabitEntryDraft): Promise<HabitEntry> {
    if (!isValidDateKey(date) || (draft.durationMinutes !== null && (!Number.isInteger(draft.durationMinutes) || draft.durationMinutes < 1 || draft.durationMinutes > 1440)) || draft.note.length > 1000) {
      throw new Error('Controleer de datum, duur en notitie van deze registratie.')
    }
    const [habit, existingEntry] = await Promise.all([this.getById(habitId), this.entryForDate(habitId, date)])
    if (!habit || (!isHabitRelevantOnDate(habit, date) && !existingEntry)) {
      throw new Error('Deze gewoonte is op die datum niet van toepassing.')
    }
    await sqliteRun({
      database: DATABASE_NAME,
      statement: `
        INSERT INTO habit_entries (habit_id, entry_date, completed, duration_minutes, note)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(habit_id, entry_date) DO UPDATE SET
          completed = excluded.completed,
          duration_minutes = excluded.duration_minutes,
          note = excluded.note,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      `,
      values: [habitId, date, draft.completed ? 1 : 0, draft.durationMinutes, draft.note.trim()],
      transaction: true,
    })
    await databaseService.persist()
    const saved = await this.entryForDate(habitId, date)
    if (!saved) throw new Error('Saved habit entry could not be loaded')
    return saved
  },

  async removeEntry(habitId: string, date: string): Promise<void> {
    await sqliteRun({
      database: DATABASE_NAME,
      statement: 'DELETE FROM habit_entries WHERE habit_id = ? AND entry_date = ?',
      values: [habitId, date],
      transaction: true,
    })
    await databaseService.persist()
  },
}
