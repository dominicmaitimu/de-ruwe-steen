import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite } from '@capacitor-community/sqlite'
import { defineCustomElements } from 'jeep-sqlite/loader'
import { DATABASE_VERSION, databaseMigrations } from '../database/migrations'
import { getErrorMessage } from '../utils/errors'
import { sqliteQuery } from './sqlite'

export const DATABASE_NAME = 'deruwesteen-db'

class DatabaseService {
  private initialized = false
  private initialization: Promise<void> | null = null

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    if (this.initialization) {
      return this.initialization
    }

    this.initialization = this.initializeDatabase()

    try {
      await this.initialization
    } finally {
      this.initialization = null
    }
  }

  public async persist(): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      await CapacitorSQLite.saveToStore({ database: DATABASE_NAME })
    }
  }

  private async initializeDatabase(): Promise<void> {
    try {
      if (Capacitor.getPlatform() === 'web') {
        defineCustomElements(window)
        if (!document.querySelector('jeep-sqlite')) {
          document.body.appendChild(document.createElement('jeep-sqlite'))
        }
        await CapacitorSQLite.initWebStore()
      }

      await CapacitorSQLite.createConnection({
        database: DATABASE_NAME,
        version: DATABASE_VERSION,
        encrypted: false,
        mode: 'openOrCreate',
      })

      await CapacitorSQLite.open({ database: DATABASE_NAME })
      await CapacitorSQLite.execute({ database: DATABASE_NAME, statements: 'PRAGMA foreign_keys = ON;' })

      await CapacitorSQLite.execute({
        database: DATABASE_NAME,
        statements: `
          CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL
          );
        `,
      })

      const versionResult = await sqliteQuery({
        database: DATABASE_NAME,
        statement: 'SELECT MAX(version) AS version FROM schema_migrations',
      })
      const firstRow: unknown = versionResult.values?.[0]
      const rawVersion =
        typeof firstRow === 'object' && firstRow !== null && 'version' in firstRow
          ? firstRow.version
          : 0
      const appliedVersion = Number(rawVersion ?? 0)

      if (!Number.isSafeInteger(appliedVersion) || appliedVersion < 0) {
        throw new Error('Database returned an invalid migration version')
      }

      for (const migration of databaseMigrations) {
        if (migration.version <= appliedVersion) {
          continue
        }

        await CapacitorSQLite.execute({
          database: DATABASE_NAME,
          transaction: true,
          statements: `
            ${migration.statements}
            INSERT INTO schema_migrations (version, applied_at)
            VALUES (${migration.version}, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
          `,
        })
      }

      await this.persist()
      this.initialized = true
    } catch (error) {
      const reason = getErrorMessage(error)
      console.error('Database initialisation failed:', reason)
      throw new Error(`Database initialisation failed: ${reason}`, { cause: error })
    }
  }
}

export const databaseService = new DatabaseService()
