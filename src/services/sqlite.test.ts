import { beforeEach, describe, expect, it, vi } from 'vitest'

const sqlite = vi.hoisted(() => ({
  query: vi.fn(async (options: { values?: unknown[] }) => {
    if (!Array.isArray(options.values)) throw new Error('Query: Must provide an Array of Strings')
    return { values: [] }
  }),
  run: vi.fn(async (options: { values?: unknown[] }) => {
    if (!Array.isArray(options.values)) throw new Error('Run: Must provide an Array of values')
    return { changes: { changes: 0 } }
  }),
}))

vi.mock('@capacitor-community/sqlite', () => ({
  CapacitorSQLite: sqlite,
}))

import { sqliteQuery, sqliteRun } from './sqlite'

describe('SQLite native parameter arrays', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends an empty values array for parameterless queries', async () => {
    await expect(sqliteQuery({ database: 'test-db', statement: 'SELECT 1' })).resolves.toEqual({ values: [] })
    expect(sqlite.query).toHaveBeenCalledWith({
      database: 'test-db',
      statement: 'SELECT 1',
      values: [],
    })
  })

  it('sends an empty values array for parameterless run statements', async () => {
    await expect(sqliteRun({ database: 'test-db', statement: 'DELETE FROM test' })).resolves.toEqual({
      changes: { changes: 0 },
    })
    expect(sqlite.run).toHaveBeenCalledWith({
      database: 'test-db',
      statement: 'DELETE FROM test',
      values: [],
    })
  })

  it('preserves supplied query and run parameters', async () => {
    const queryValues = ['record-1']
    const runValues = [7]

    await sqliteQuery({ database: 'test-db', statement: 'SELECT ?', values: queryValues })
    await sqliteRun({ database: 'test-db', statement: 'DELETE FROM test WHERE id = ?', values: runValues })

    expect(sqlite.query).toHaveBeenCalledWith({
      database: 'test-db',
      statement: 'SELECT ?',
      values: queryValues,
    })
    expect(sqlite.run).toHaveBeenCalledWith({
      database: 'test-db',
      statement: 'DELETE FROM test WHERE id = ?',
      values: runValues,
    })
  })
})
