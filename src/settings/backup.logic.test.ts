import { beforeAll, describe, expect, it } from 'vitest'
import {
  BACKUP_KDF_ITERATIONS,
  decryptBackup,
  encryptBackup,
  getBackupSummary,
  validateBackupPayload,
  type BackupPayload,
} from './backup.logic'

const schemaColumns: Record<string, string[]> = {
  app_meta: ['key', 'value'],
  pillars: ['id', 'name', 'color', 'icon', 'sort_order'],
  daily_check_ins: ['id', 'check_in_date', 'mood', 'energy', 'mental_calm', 'satisfaction', 'did_something_for_self', 'reflection', 'created_at', 'updated_at'],
  habits: ['id', 'name', 'description', 'frequency_type', 'target_count', 'period_days', 'weekdays', 'desired_duration_minutes', 'start_date', 'end_date', 'status', 'created_at', 'updated_at'],
  habit_pillars: ['habit_id', 'pillar_id'],
  habit_entries: ['id', 'habit_id', 'entry_date', 'completed', 'duration_minutes', 'note', 'created_at', 'updated_at'],
  habit_status_periods: ['id', 'habit_id', 'status', 'starts_on', 'ends_on'],
  goals: ['id', 'title', 'description', 'goal_type', 'status', 'start_date', 'target_date', 'manual_progress', 'created_at', 'updated_at'],
  goal_steps: ['id', 'goal_id', 'title', 'sort_order', 'completed', 'created_at', 'updated_at'],
  goal_pillars: ['goal_id', 'pillar_id'],
  activities: ['id', 'title', 'description', 'activity_date', 'duration_minutes', 'rating', 'note', 'created_at', 'updated_at'],
  activity_pillars: ['activity_id', 'pillar_id'],
  reflections: ['id', 'title', 'content', 'reflection_date', 'reflection_type', 'created_at', 'updated_at'],
  reflection_pillars: ['reflection_id', 'pillar_id'],
  app_settings: ['setting_key', 'setting_value', 'updated_at'],
  journey_progress: ['id', 'started_at'],
  journey_answers: ['journey_day', 'answer', 'updated_at'],
  journey_completed_days: ['journey_day', 'completed_at'],
  journey_reflections: ['id', 'text', 'created_at'],
}

const payload: BackupPayload = {
  database: {
    database: 'deruwesteen-db',
    version: 9,
    encrypted: false,
    mode: 'full',
    tables: Object.entries(schemaColumns).map(([name, columns]) => ({
      name,
      schema: columns.map((column) => ({ column, value: 'TEXT' })),
      values: name === 'pillars'
        ? [['physical', 'Lichamelijk', '#8A9B78', '◌', 1], ['mental', 'Mentaal', '#8297A8', '◈', 2], ['growth', 'Groei', '#C49A65', '↗', 3], ['creativity', 'Creativiteit', '#A487AA', '✳', 4], ['identity', 'Identiteit', '#C27D67', '◉', 5]]
        : name === 'app_settings' ? [['theme', 'system', null], ['date_format', 'localized', null]]
          : name === 'daily_check_ins' ? [[1, '2026-10-29', 5, 5, 5, 5, 1, null, null, null], [2, '2026-10-30', 5, 5, 5, 5, 1, null, null, null]]
            : [],
    })),
  },
}

describe('backup logic', () => {
  beforeAll(() => {
    if (!globalThis.crypto?.subtle) throw new Error('Tests require the Web Crypto API.')
  })

  it('encrypts the full payload with fresh salt/nonce and decrypts it', async () => {
    const first = await encryptBackup(payload, 'A strong backup password', '2026-10-30T12:00:00.000Z')
    const second = await encryptBackup(payload, 'A strong backup password', '2026-10-30T12:00:00.000Z')
    const decoded = await decryptBackup(first, 'A strong backup password')
    const envelope = JSON.parse(first) as { encryption: { salt: string; nonce: string; iterations: number } }
    const other = JSON.parse(second) as { encryption: { salt: string; nonce: string } }

    expect(decoded.payload).toEqual(payload)
    expect(envelope.encryption.iterations).toBe(BACKUP_KDF_ITERATIONS)
    expect(envelope.encryption.salt).not.toBe(other.encryption.salt)
    expect(envelope.encryption.nonce).not.toBe(other.encryption.nonce)
  })

  it('rejects short passwords, wrong passwords, and tampered ciphertext', async () => {
    await expect(encryptBackup(payload, 'short')).rejects.toThrow('minimaal 12 tekens')
    const contents = await encryptBackup(payload, 'A strong backup password')
    await expect(decryptBackup(contents, 'A different password')).rejects.toThrow('wachtwoord is onjuist')
    const damaged = JSON.parse(contents) as { ciphertext: string }
    damaged.ciphertext = `${damaged.ciphertext.slice(0, -4)}AAAA`
    await expect(decryptBackup(JSON.stringify(damaged), 'A strong backup password')).rejects.toThrow()
  })

  it('validates structure, rejects unknown tables and future schema versions, and counts data', async () => {
    expect(getBackupSummary(payload)).toEqual({
      checkIns: 2,
      habits: 0,
      habitEntries: 0,
      goals: 0,
      activities: 0,
      reflections: 0,
    })
    expect(() => validateBackupPayload({ database: { ...payload.database, tables: [{ name: 'surprise', schema: [], values: [] }] } }, 9))
      .toThrow('onbekende databasetabel')
    const futureEnvelope = JSON.parse(await encryptBackup(payload, 'A strong backup password')) as { schemaVersion: number }
    futureEnvelope.schemaVersion = 10
    await expect(decryptBackup(JSON.stringify(futureEnvelope), 'A strong backup password')).rejects.toThrow('niet-ondersteunde versie')
  })

  it('accepts a legacy schema snapshot without application preferences', () => {
    const legacy = {
      database: {
        ...payload.database,
        version: 7,
        tables: payload.database.tables.filter((table) => table.name !== 'app_settings'),
      },
    }
    expect(() => validateBackupPayload(legacy, 7)).not.toThrow()
    expect(() => validateBackupPayload({ database: { ...legacy.database, version: 8 } }, 8)).toThrow('instellingen')
  })

  it('ignores SQLite constraint entries while requiring every actual column', () => {
    const withConstraints = {
      database: {
        ...payload.database,
        tables: payload.database.tables.map((table) => table.name === 'habits'
          ? { ...table, schema: [...table.schema, { column: 'CHECK', value: '(end_date IS NULL OR end_date >= start_date)' }] }
          : table.name === 'habit_pillars'
            ? { ...table, schema: [...table.schema, { constraint: 'CPK_habit_id_pillar_id', value: 'PRIMARY KEY (habit_id, pillar_id)' }] }
            : table),
      },
    }
    expect(() => validateBackupPayload(withConstraints, 9)).not.toThrow()
    const missingColumn = {
      database: {
        ...payload.database,
        tables: payload.database.tables.map((table) => table.name === 'habits'
          ? { ...table, schema: table.schema.filter((column) => column.column !== 'status') }
          : table),
      },
    }
    expect(() => validateBackupPayload(missingColumn, 9)).toThrow('onvolledige')
  })

  it('accepts empty SQLite tables when the exporter omits their values array', () => {
    const emptyTableWithoutValues = {
      database: {
        ...payload.database,
        tables: payload.database.tables.map((table) => {
          if (table.name !== 'app_meta') return table
          const emptyTable: Record<string, unknown> = { ...table }
          delete emptyTable.values
          return emptyTable
        }),
      },
    }
    expect(() => validateBackupPayload(emptyTableWithoutValues, 9)).not.toThrow()
  })
})
