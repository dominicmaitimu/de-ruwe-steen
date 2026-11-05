import { CapacitorSQLite } from '@capacitor-community/sqlite'
import type { capSQLiteQueryOptions, capSQLiteRunOptions } from '@capacitor-community/sqlite'

export function sqliteQuery(options: capSQLiteQueryOptions) {
  return CapacitorSQLite.query({ ...options, values: options.values ?? [] })
}

export function sqliteRun(options: capSQLiteRunOptions) {
  return CapacitorSQLite.run({ ...options, values: options.values ?? [] })
}
