import { CapacitorSQLite } from '@capacitor-community/sqlite'
import { databaseService, DATABASE_NAME } from '../services/database.service'
import { sqliteQuery, sqliteRun } from '../services/sqlite'
import { calculateGoalProgress, isGoalDateValid, isGoalDraftValid } from './goal.logic'
import type { Goal, GoalDraft, GoalStatus, GoalStep } from './goal.types'

type DatabaseRow = Record<string, unknown>

function rowFrom(value: unknown): DatabaseRow {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Database returned an invalid goal record')
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

function mapStep(value: unknown): GoalStep {
  const row = rowFrom(value)
  return {
    id: number(row, 'id'),
    goalId: text(row, 'goal_id'),
    title: text(row, 'title'),
    sortOrder: number(row, 'sort_order'),
    completed: number(row, 'completed') === 1,
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
  }
}

function dateValid(value: string | null): boolean {
  return value === null || isGoalDateValid(value)
}

function valuesForDraft(draft: GoalDraft) {
  return [
    draft.title.trim(),
    draft.description.trim(),
    draft.type,
    draft.startDate,
    draft.targetDate || null,
    draft.manualProgress,
  ]
}

export const goalRepository = {
  async list(): Promise<Goal[]> {
    const result = await sqliteQuery({
      database: DATABASE_NAME,
      statement: `
        SELECT id, title, description, goal_type, status, start_date, target_date,
          manual_progress, created_at, updated_at
        FROM goals
        ORDER BY created_at DESC
      `,
    })
    const rows = result.values ?? []
    if (!rows.length) return []

    const [pillarResult, stepResult] = await Promise.all([
      sqliteQuery({ database: DATABASE_NAME, statement: 'SELECT goal_id, pillar_id FROM goal_pillars' }),
      sqliteQuery({
        database: DATABASE_NAME,
        statement: 'SELECT id, goal_id, title, sort_order, completed, created_at, updated_at FROM goal_steps ORDER BY goal_id, sort_order',
      }),
    ])
    const pillarsByGoal = new Map<string, string[]>()
    for (const value of pillarResult.values ?? []) {
      const row = rowFrom(value)
      const goalId = text(row, 'goal_id')
      pillarsByGoal.set(goalId, [...(pillarsByGoal.get(goalId) ?? []), text(row, 'pillar_id')])
    }
    const stepsByGoal = new Map<string, GoalStep[]>()
    for (const value of stepResult.values ?? []) {
      const step = mapStep(value)
      stepsByGoal.set(step.goalId, [...(stepsByGoal.get(step.goalId) ?? []), step])
    }
    return rows.map((value) => {
      const row = rowFrom(value)
      const id = text(row, 'id')
      const steps = stepsByGoal.get(id) ?? []
      const manualProgress = number(row, 'manual_progress')
      const target = row.target_date
      const goal: Goal = {
        id,
        title: text(row, 'title'),
        description: text(row, 'description'),
        type: text(row, 'goal_type') as Goal['type'],
        status: text(row, 'status') as GoalStatus,
        startDate: text(row, 'start_date'),
        targetDate: typeof target === 'string' ? target : null,
        manualProgress,
        progress: calculateGoalProgress(manualProgress, steps),
        pillars: pillarsByGoal.get(id) ?? [],
        steps,
        createdAt: text(row, 'created_at'),
        updatedAt: text(row, 'updated_at'),
      }
      if (!dateValid(goal.startDate) || !dateValid(goal.targetDate)) throw new Error('Database returned an invalid goal date')
      return goal
    })
  },

  async getById(id: string): Promise<Goal | null> {
    return (await this.list()).find((goal) => goal.id === id) ?? null
  },

  async save(draft: GoalDraft, existingId?: string): Promise<Goal> {
    if (!isGoalDraftValid(draft)) throw new Error('Controleer de titel, pijlers en datums van dit doel.')
    const id = existingId ?? crypto.randomUUID()
    const values = valuesForDraft(draft)
    if (existingId) {
      const current = await this.getById(existingId)
      if (!current) throw new Error('The goal to update could not be found')
      if (current.steps.length && draft.manualProgress !== current.manualProgress) {
        throw new Error('Voortgang van een doel met deelstappen wordt automatisch berekend.')
      }
    }
    const set = existingId
      ? [
          {
            statement: `
              UPDATE goals SET title = ?, description = ?, goal_type = ?, start_date = ?,
                target_date = ?, manual_progress = ?,
                updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
              WHERE id = ?
            `,
            values: [...values, id],
          },
          { statement: 'DELETE FROM goal_pillars WHERE goal_id = ?', values: [id] },
        ]
      : [{
          statement: `
            INSERT INTO goals (id, title, description, goal_type, status, start_date, target_date, manual_progress)
            VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
          `,
          values: [id, ...values],
        }]
    for (const pillarId of draft.pillarIds) {
      set.push({ statement: 'INSERT INTO goal_pillars (goal_id, pillar_id) VALUES (?, ?)', values: [id, pillarId] })
    }
    if (!existingId) {
      draft.initialSteps.forEach((title, index) => {
        set.push({
          statement: 'INSERT INTO goal_steps (goal_id, title, sort_order) VALUES (?, ?, ?)',
          values: [id, title.trim(), index],
        })
      })
    }
    await CapacitorSQLite.executeSet({ database: DATABASE_NAME, set, transaction: true })
    await databaseService.persist()
    const saved = await this.getById(id)
    if (!saved) throw new Error('Saved goal could not be loaded')
    return saved
  },

  async setStatus(id: string, status: GoalStatus): Promise<Goal> {
    const set = [{
      statement: `
        UPDATE goals SET status = ?,
          manual_progress = CASE WHEN ? = 'completed' AND NOT EXISTS (SELECT 1 FROM goal_steps WHERE goal_id = ?) THEN 100 ELSE manual_progress END,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ?
      `,
      values: [status, status, id, id],
    }]
    if (status === 'completed') {
      set.push({
        statement: "UPDATE goal_steps SET completed = 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE goal_id = ?",
        values: [id],
      })
    }
    await CapacitorSQLite.executeSet({ database: DATABASE_NAME, set, transaction: true })
    await databaseService.persist()
    const saved = await this.getById(id)
    if (!saved) throw new Error('Updated goal could not be loaded')
    return saved
  },

  async delete(id: string): Promise<void> {
    await CapacitorSQLite.executeSet({
      database: DATABASE_NAME,
      transaction: true,
      set: [
        { statement: 'DELETE FROM goal_steps WHERE goal_id = ?', values: [id] },
        { statement: 'DELETE FROM goal_pillars WHERE goal_id = ?', values: [id] },
        { statement: 'DELETE FROM goals WHERE id = ?', values: [id] },
      ],
    })
    await databaseService.persist()
  },

  async setManualProgress(id: string, progress: number): Promise<Goal> {
    if (!Number.isInteger(progress) || progress < 0 || progress > 100) throw new Error('Voortgang moet tussen 0 en 100 liggen.')
    const goal = await this.getById(id)
    if (!goal) throw new Error('Goal could not be found')
    if (goal.steps.length) throw new Error('Voortgang van een doel met deelstappen wordt automatisch berekend.')
    await sqliteRun({
      database: DATABASE_NAME,
      statement: "UPDATE goals SET manual_progress = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
      values: [progress, id],
      transaction: true,
    })
    await databaseService.persist()
    const saved = await this.getById(id)
    if (!saved) throw new Error('Updated goal could not be loaded')
    return saved
  },

  async saveStep(goalId: string, title: string, existingId?: number): Promise<Goal> {
    const trimmed = title.trim()
    if (!trimmed || trimmed.length > 160) throw new Error('Geef de deelstap een naam van maximaal 160 tekens.')
    const goal = await this.getById(goalId)
    if (!goal) throw new Error('Goal could not be found')
    await CapacitorSQLite.executeSet({
      database: DATABASE_NAME,
      transaction: true,
      set: [
        {
          statement: existingId
            ? "UPDATE goal_steps SET title = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND goal_id = ?"
            : 'INSERT INTO goal_steps (goal_id, title, sort_order) VALUES (?, ?, ?)',
          values: existingId ? [trimmed, existingId, goalId] : [goalId, trimmed, goal.steps.length],
        },
        { statement: "UPDATE goals SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?", values: [goalId] },
      ],
    })
    await databaseService.persist()
    const saved = await this.getById(goalId)
    if (!saved) throw new Error('Updated goal could not be loaded')
    return saved
  },

  async toggleStep(goalId: string, stepId: number, completed: boolean): Promise<Goal> {
    await CapacitorSQLite.executeSet({
      database: DATABASE_NAME,
      transaction: true,
      set: [
        { statement: "UPDATE goal_steps SET completed = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND goal_id = ?", values: [completed ? 1 : 0, stepId, goalId] },
        { statement: "UPDATE goals SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?", values: [goalId] },
      ],
    })
    await databaseService.persist()
    const saved = await this.getById(goalId)
    if (!saved) throw new Error('Updated goal could not be loaded')
    return saved
  },

  async removeStep(goalId: string, stepId: number): Promise<Goal> {
    const goal = await this.getById(goalId)
    if (!goal) throw new Error('Goal could not be found')
    const steps = goal.steps.filter((step) => step.id !== stepId)
    const set: { statement: string; values: (string | number | null)[] }[] = [{ statement: 'DELETE FROM goal_steps WHERE id = ? AND goal_id = ?', values: [stepId, goalId] }]
    set.push({ statement: 'UPDATE goal_steps SET sort_order = sort_order + 1000000 WHERE goal_id = ?', values: [goalId] })
    steps.forEach((step, index) => set.push({ statement: 'UPDATE goal_steps SET sort_order = ? WHERE id = ?', values: [index, step.id] }))
    set.push({ statement: "UPDATE goals SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?", values: [goalId] })
    await CapacitorSQLite.executeSet({ database: DATABASE_NAME, set, transaction: true })
    await databaseService.persist()
    const saved = await this.getById(goalId)
    if (!saved) throw new Error('Updated goal could not be loaded')
    return saved
  },

  async reorderSteps(goalId: string, orderedIds: number[]): Promise<Goal> {
    const goal = await this.getById(goalId)
    if (!goal) throw new Error('Goal could not be found')
    if (orderedIds.length !== goal.steps.length || new Set(orderedIds).size !== goal.steps.length || orderedIds.some((id) => !goal.steps.some((step) => step.id === id))) {
      throw new Error('Invalid goal step order')
    }
    const set: { statement: string; values: (string | number | null)[] }[] = [{ statement: 'UPDATE goal_steps SET sort_order = sort_order + 1000000 WHERE goal_id = ?', values: [goalId] }]
    orderedIds.forEach((id, index) => set.push({ statement: 'UPDATE goal_steps SET sort_order = ? WHERE id = ? AND goal_id = ?', values: [index, id, goalId] }))
    set.push({ statement: "UPDATE goals SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?", values: [goalId] })
    await CapacitorSQLite.executeSet({ database: DATABASE_NAME, set, transaction: true })
    await databaseService.persist()
    const saved = await this.getById(goalId)
    if (!saved) throw new Error('Updated goal could not be loaded')
    return saved
  },

  async hasSteps(id: string): Promise<boolean> {
    const result = await sqliteQuery({
      database: DATABASE_NAME,
      statement: 'SELECT 1 AS found FROM goal_steps WHERE goal_id = ? LIMIT 1',
      values: [id],
    })
    return Boolean(result.values?.length)
  },
}
