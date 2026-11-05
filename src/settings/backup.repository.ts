import { CapacitorSQLite } from '@capacitor-community/sqlite'
import { DATABASE_VERSION } from '../database/migrations'
import { DATABASE_NAME, databaseService } from '../services/database.service'
import { encryptBackup, validateBackupPayload, type BackupPayload } from './backup.logic'
import { sqliteQuery, sqliteRun } from '../services/sqlite'

const deleteOrder = [
  'reflection_pillars', 'activity_pillars', 'goal_steps', 'goal_pillars',
  'habit_status_periods', 'habit_entries', 'habit_pillars', 'reflections',
  'journey_reflections', 'journey_completed_days', 'journey_answers', 'journey_progress',
  'activities', 'goals', 'habits', 'daily_check_ins', 'app_settings', 'app_meta', 'pillars',
]

const insertOrder = [
  'app_meta', 'pillars', 'daily_check_ins', 'habits', 'habit_pillars', 'habit_entries',
  'habit_status_periods', 'goals', 'goal_steps', 'goal_pillars', 'activities',
  'activity_pillars', 'reflections', 'reflection_pillars', 'app_settings',
  'journey_progress', 'journey_answers', 'journey_completed_days', 'journey_reflections',
]

export interface DatabaseHealth {
  integrity: string
  foreignKeyErrors: number
  schemaVersion: number
  tableCounts: Record<string, number>
}

export const backupRepository = {
  async exportEncrypted(password: string): Promise<string> {
    const result = await CapacitorSQLite.exportToJson({
      database: DATABASE_NAME,
      jsonexportmode: 'full',
      encrypted: false,
    })
    if (!result.export) throw new Error('SQLite heeft geen back-upgegevens teruggegeven.')
    const payload = validateBackupPayload({ database: result.export }, DATABASE_VERSION)
    return encryptBackup(payload, password)
  },

  async exportPlainJson(): Promise<string> {
    const result = await CapacitorSQLite.exportToJson({
      database: DATABASE_NAME,
      jsonexportmode: 'full',
      encrypted: false,
    })
    if (!result.export) throw new Error('SQLite heeft geen exportgegevens teruggegeven.')
    const payload = validateBackupPayload({ database: result.export }, DATABASE_VERSION)
    const contents = JSON.stringify({
      exportVersion: 1,
      appVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      schemaVersion: DATABASE_VERSION,
      database: payload.database,
    }, null, 2)
    if (new TextEncoder().encode(contents).length > 20 * 1024 * 1024) throw new Error('De JSON-export is groter dan 20 MB.')
    return contents
  },

  async restore(payload: BackupPayload, sourceSchemaVersion: number): Promise<void> {
    const valid = validateBackupPayload(payload, sourceSchemaVersion)
    const availableTables = new Set(valid.database.tables.map((table) => table.name))
    const tablesByName = new Map(valid.database.tables.map((table) => [table.name, table]))
    let transactionStarted = false
    try {
      await CapacitorSQLite.beginTransaction({ database: DATABASE_NAME })
      transactionStarted = true
      for (const table of deleteOrder) {
        if (table === 'pillars' && !availableTables.has(table)) continue
        await sqliteRun({ database: DATABASE_NAME, statement: `DELETE FROM "${table}"`, transaction: false })
      }
      for (const tableName of insertOrder) {
        const table = tablesByName.get(tableName)
        if (!table || !table.values.length) continue
        const columns = table.schema.map((column) => column.column)
        const placeholders = columns.map(() => '?').join(', ')
        const statement = `INSERT INTO "${tableName}" (${columns.map((column) => `"${column}"`).join(', ')}) VALUES (${placeholders})`
        for (const row of table.values) {
          await sqliteRun({
            database: DATABASE_NAME,
            statement,
            values: row.map((value) => typeof value === 'boolean' ? Number(value) : value) as (string | number | null)[],
            transaction: false,
          })
        }
      }
      if (!availableTables.has('journey_progress')) {
        await sqliteRun({
          database: DATABASE_NAME,
          statement: `INSERT INTO journey_progress (id, started_at)
            VALUES (1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
          transaction: false,
        })
      }
      if (!availableTables.has('app_settings')) {
        await sqliteRun({
          database: DATABASE_NAME,
          statement: `INSERT OR REPLACE INTO app_settings (setting_key, setting_value) VALUES
            ('theme', 'system'), ('date_format', 'localized')`,
          transaction: false,
        })
      }
      const health = await this.checkIntegrity()
      if (health.integrity !== 'ok' || health.foreignKeyErrors !== 0) {
        throw new Error('De herstelde database voldoet niet aan de integriteitscontrole.')
      }
      await CapacitorSQLite.commitTransaction({ database: DATABASE_NAME })
      transactionStarted = false
      await databaseService.persist()
    } catch (error) {
      if (transactionStarted) {
        try {
          await CapacitorSQLite.rollbackTransaction({ database: DATABASE_NAME })
        } catch (rollbackError) {
          throw new Error('Herstel is mislukt en de database kon niet veilig worden teruggezet.', {
            cause: new AggregateError([error, rollbackError], 'Herstel en terugzetten zijn beide mislukt.'),
          })
        }
      }
      throw error
    }
  },

  async clearPersonalData(): Promise<void> {
    let transactionStarted = false
    try {
      await CapacitorSQLite.beginTransaction({ database: DATABASE_NAME })
      transactionStarted = true
      for (const table of deleteOrder) {
        if (table === 'pillars') continue
        await sqliteRun({ database: DATABASE_NAME, statement: `DELETE FROM "${table}"`, transaction: false })
      }
      await sqliteRun({
        database: DATABASE_NAME,
        statement: `INSERT INTO journey_progress (id, started_at)
          VALUES (1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
        transaction: false,
      })
      const health = await this.checkIntegrity()
      if (health.integrity !== 'ok' || health.foreignKeyErrors !== 0) {
        throw new Error('De database-integriteitscontrole na wissen is niet geslaagd.')
      }
      await CapacitorSQLite.commitTransaction({ database: DATABASE_NAME })
      transactionStarted = false
      await databaseService.persist()
    } catch (error) {
      if (transactionStarted) {
        try {
          await CapacitorSQLite.rollbackTransaction({ database: DATABASE_NAME })
        } catch (rollbackError) {
          throw new Error('Wissen is mislukt en de database kon niet veilig worden teruggezet.', {
            cause: new AggregateError([error, rollbackError], 'Wissen en terugzetten zijn beide mislukt.'),
          })
        }
      }
      throw error
    }
  },

  async checkIntegrity(): Promise<DatabaseHealth> {
    const integrityResult = await sqliteQuery({ database: DATABASE_NAME, statement: 'PRAGMA integrity_check' })
    const integrity = String(integrityResult.values?.[0]?.integrity_check ?? 'unknown')
    const foreignKeys = await sqliteQuery({ database: DATABASE_NAME, statement: 'PRAGMA foreign_key_check' })
    const tableRows = await sqliteQuery({
      database: DATABASE_NAME,
      statement: `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
    })
    const tableCounts: Record<string, number> = {}
    for (const value of tableRows.values ?? []) {
      const name = value.name
      if (typeof name !== 'string' || !/^[a-z_]+$/.test(name)) continue
      const count = await sqliteQuery({ database: DATABASE_NAME, statement: `SELECT COUNT(*) AS count FROM "${name}"` })
      tableCounts[name] = Number(count.values?.[0]?.count ?? 0)
    }
    const versionResult = await sqliteQuery({ database: DATABASE_NAME, statement: 'SELECT MAX(version) AS version FROM schema_migrations' })
    return {
      integrity,
      foreignKeyErrors: foreignKeys.values?.length ?? 0,
      schemaVersion: Number(versionResult.values?.[0]?.version ?? 0),
      tableCounts,
    }
  },
}
