import { DATABASE_VERSION } from '../database/migrations'

export const BACKUP_VERSION = 1
export const BACKUP_KDF_ITERATIONS = 600_000
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024
export const APP_VERSION = '1.0.0'

const saltLength = 16
const nonceLength = 12
const allowedTables: Record<string, readonly string[]> = {
  schema_migrations: ['version', 'applied_at'],
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
const requiredTablesBySchema: Record<number, readonly string[]> = {
  1: ['app_meta'],
  2: ['app_meta', 'pillars', 'daily_check_ins'],
  3: ['app_meta', 'pillars', 'daily_check_ins', 'habits', 'habit_pillars', 'habit_entries'],
  4: ['app_meta', 'pillars', 'daily_check_ins', 'habits', 'habit_pillars', 'habit_entries', 'habit_status_periods'],
  5: ['app_meta', 'pillars', 'daily_check_ins', 'habits', 'habit_pillars', 'habit_entries', 'habit_status_periods'],
  6: ['app_meta', 'pillars', 'daily_check_ins', 'habits', 'habit_pillars', 'habit_entries', 'habit_status_periods', 'goals', 'goal_steps', 'goal_pillars'],
  7: ['app_meta', 'pillars', 'daily_check_ins', 'habits', 'habit_pillars', 'habit_entries', 'habit_status_periods', 'goals', 'goal_steps', 'goal_pillars', 'activities', 'activity_pillars', 'reflections', 'reflection_pillars'],
  8: ['app_meta', 'pillars', 'daily_check_ins', 'habits', 'habit_pillars', 'habit_entries', 'habit_status_periods', 'goals', 'goal_steps', 'goal_pillars', 'activities', 'activity_pillars', 'reflections', 'reflection_pillars', 'app_settings'],
  9: ['app_meta', 'pillars', 'daily_check_ins', 'habits', 'habit_pillars', 'habit_entries', 'habit_status_periods', 'goals', 'goal_steps', 'goal_pillars', 'activities', 'activity_pillars', 'reflections', 'reflection_pillars', 'app_settings', 'journey_progress', 'journey_answers', 'journey_completed_days', 'journey_reflections'],
}
const defaultPillarIds = ['physical', 'mental', 'growth', 'creativity', 'identity']

export interface BackupEnvelope {
  backupVersion: number
  appVersion: string
  exportedAt: string
  schemaVersion: number
  encryption: {
    algorithm: 'AES-GCM'
    kdf: 'PBKDF2'
    hash: 'SHA-256'
    iterations: number
    salt: string
    nonce: string
  }
  ciphertext: string
}

export interface BackupDatabase {
  database: string
  version: number
  encrypted: boolean
  mode: string
  tables: Array<{
    name: string
    schema: Array<{ column?: string; value: string; constraint?: string }>
    values: unknown[][]
  }>
}

export interface BackupPayload {
  database: BackupDatabase
}

export interface BackupSummary {
  checkIns: number
  habits: number
  habitEntries: number
  goals: number
  activities: number
  reflections: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.length)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)))
  }
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  let binary: string
  try {
    binary = atob(value)
  } catch (error) {
    throw new Error('Het back-upbestand bevat ongeldige versleutelde gegevens.', { cause: error })
  }
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function validateEnvelope(value: unknown): BackupEnvelope {
  if (!isRecord(value) || value.backupVersion !== BACKUP_VERSION || typeof value.appVersion !== 'string'
    || typeof value.exportedAt !== 'string' || typeof value.schemaVersion !== 'number'
    || !Number.isSafeInteger(value.schemaVersion)
    || value.schemaVersion < 1 || value.schemaVersion > DATABASE_VERSION
    || typeof value.ciphertext !== 'string' || !isRecord(value.encryption)) {
    throw new Error('Dit back-upbestand heeft een ongeldige structuur of een niet-ondersteunde versie.')
  }
  const encryption = value.encryption
  if (encryption.algorithm !== 'AES-GCM' || encryption.kdf !== 'PBKDF2' || encryption.hash !== 'SHA-256'
    || encryption.iterations !== BACKUP_KDF_ITERATIONS || typeof encryption.salt !== 'string'
    || typeof encryption.nonce !== 'string') {
    throw new Error('De versleutelingsinstellingen van deze back-up worden niet ondersteund.')
  }
  const salt = base64ToBytes(encryption.salt)
  const nonce = base64ToBytes(encryption.nonce)
  const ciphertext = base64ToBytes(value.ciphertext)
  if (salt.length !== saltLength || nonce.length !== nonceLength || ciphertext.length < 16
    || ciphertext.length > MAX_BACKUP_BYTES || new Date(value.exportedAt).toString() === 'Invalid Date') {
    throw new Error('Het back-upbestand is beschadigd of te groot.')
  }
  return {
    backupVersion: value.backupVersion,
    appVersion: value.appVersion,
    exportedAt: value.exportedAt,
    schemaVersion: value.schemaVersion,
    encryption: {
      algorithm: 'AES-GCM',
      kdf: 'PBKDF2',
      hash: 'SHA-256',
      iterations: BACKUP_KDF_ITERATIONS,
      salt: encryption.salt,
      nonce: encryption.nonce,
    },
    ciphertext: value.ciphertext,
  }
}

export function validateBackupPayload(value: unknown, schemaVersion: number): BackupPayload {
  if (!isRecord(value) || !isRecord(value.database)
    || typeof value.database.version !== 'number' || !Number.isSafeInteger(value.database.version) || value.database.mode !== 'full'
    || !Number.isSafeInteger(schemaVersion) || schemaVersion < 1 || schemaVersion > DATABASE_VERSION) {
    throw new Error('De gegevens in deze back-up hebben geen geldig formaat.')
  }
  const database = value.database
  if (database.version !== schemaVersion) throw new Error('De back-upversie en databaseschemaversie komen niet overeen.')
  if (!isUnknownArray(database.tables)) throw new Error('De back-up mist de databasetabellen.')
  const rawTables = database.tables
  const tables = new Map<string, BackupDatabase['tables'][number]>()
  for (const entry of rawTables) {
    if (!isRecord(entry)) throw new Error('De back-up bevat een ongeldig tabelrecord.')
    if (typeof entry.name !== 'string' || !Object.hasOwn(allowedTables, entry.name)) {
      throw new Error('De back-up bevat een onbekende databasetabel.')
    }
    if (!Array.isArray(entry.schema)) throw new Error('De back-up bevat een ongeldige tabeldefinitie.')
    if (entry.values !== undefined && !Array.isArray(entry.values)) {
      throw new Error('De back-up bevat een ongeldige rijverzameling.')
    }
    if (tables.has(entry.name)) throw new Error('De back-up bevat een dubbele databasetabel.')
    const allowedColumns = allowedTables[entry.name]
    const columns = entry.schema.flatMap((column) => {
      if (!isRecord(column) || typeof column.value !== 'string') {
        throw new Error('De back-up bevat onbekende databasekolommen.')
      }
      if ((column.column === undefined && typeof column.constraint === 'string')
        || column.column === 'CHECK') return []
      if (typeof column.column !== 'string' || !allowedColumns.includes(column.column)) {
        throw new Error('De back-up bevat onbekende databasekolommen.')
      }
      return [{ column: column.column, value: column.value }]
    })
    if (new Set(columns.map((column) => column.column)).size !== columns.length
      || columns.length !== allowedColumns.length
      || allowedColumns.some((column) => !columns.some((entry) => entry.column === column))) {
      throw new Error('De back-up bevat een onvolledige of dubbele tabeldefinitie.')
    }
    const rows = (entry.values ?? []) as unknown[][]
    if (!columns.length && rows.length) throw new Error('De back-up bevat rijen zonder kolomdefinities.')
    if (rows.some((row) => !Array.isArray(row) || row.length !== columns.length
      || row.some((item) => item !== null && typeof item !== 'string'
        && (typeof item !== 'number' || !Number.isFinite(item)) && typeof item !== 'boolean'))) {
      throw new Error('De back-up bevat een ongeldige databaseregel.')
    }
    tables.set(entry.name, { name: entry.name, schema: columns, values: rows })
  }
  if (schemaVersion >= 2) {
    const pillarIds = tables.get('pillars')?.values.map((row) => row[0])
    if (!pillarIds || defaultPillarIds.some((id) => !pillarIds.includes(id)) || pillarIds.length !== defaultPillarIds.length) {
      throw new Error('De back-up bevat geen geldige standaardpijlers.')
    }
  }
  if (schemaVersion >= 8 && !tables.has('app_settings')) throw new Error('De back-up mist de instellingen.')
  if (schemaVersion >= 9 && ['journey_progress', 'journey_answers', 'journey_completed_days', 'journey_reflections'].some((name) => !tables.has(name))) {
    throw new Error('De back-up mist reisgegevens.')
  }
  if (requiredTablesBySchema[schemaVersion]?.some((name) => !tables.has(name))) {
    throw new Error('De back-up mist een of meer databasetabellen.')
  }
  return { database: { ...database, tables: [...tables.values()] } as BackupDatabase }
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const passwordBytes = new TextEncoder().encode(password)
  const material = await crypto.subtle.importKey('raw', passwordBytes, 'PBKDF2', false, ['deriveKey'])
  passwordBytes.fill(0)
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: toArrayBuffer(salt), iterations: BACKUP_KDF_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

function envelopeAdditionalData(envelope: Pick<BackupEnvelope, 'backupVersion' | 'appVersion' | 'exportedAt' | 'schemaVersion'>): ArrayBuffer {
  return toArrayBuffer(new TextEncoder().encode(JSON.stringify({
    backupVersion: envelope.backupVersion,
    appVersion: envelope.appVersion,
    exportedAt: envelope.exportedAt,
    schemaVersion: envelope.schemaVersion,
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2',
    hash: 'SHA-256',
    iterations: BACKUP_KDF_ITERATIONS,
  })))
}

export async function encryptBackup(payload: BackupPayload, password: string, exportedAt = new Date().toISOString()): Promise<string> {
  if (password.length < 12) throw new Error('Gebruik voor een back-upwachtwoord minimaal 12 tekens.')
  const salt = crypto.getRandomValues(new Uint8Array(saltLength))
  const nonce = crypto.getRandomValues(new Uint8Array(nonceLength))
  const key = await deriveKey(password, salt)
  const plaintext = new TextEncoder().encode(JSON.stringify(payload))
  if (plaintext.length > MAX_BACKUP_BYTES - 4096) {
    plaintext.fill(0)
    throw new Error('De back-upgegevens zijn groter dan 20 MB.')
  }
  const envelope: BackupEnvelope = {
    backupVersion: BACKUP_VERSION,
    appVersion: APP_VERSION,
    exportedAt,
    schemaVersion: DATABASE_VERSION,
    encryption: {
      algorithm: 'AES-GCM',
      kdf: 'PBKDF2',
      hash: 'SHA-256',
      iterations: BACKUP_KDF_ITERATIONS,
      salt: bytesToBase64(salt),
      nonce: bytesToBase64(nonce),
    },
    ciphertext: '',
  }
  const ciphertext = await crypto.subtle.encrypt({
    name: 'AES-GCM',
    iv: toArrayBuffer(nonce),
    additionalData: envelopeAdditionalData(envelope),
    tagLength: 128,
  }, key, toArrayBuffer(plaintext))
  plaintext.fill(0)
  envelope.ciphertext = bytesToBase64(new Uint8Array(ciphertext))
  const contents = JSON.stringify(envelope)
  if (new TextEncoder().encode(contents).length > MAX_BACKUP_BYTES) throw new Error('De versleutelde back-up is groter dan 20 MB.')
  return contents
}

export async function decryptBackup(fileContents: string, password: string): Promise<{ envelope: BackupEnvelope; payload: BackupPayload }> {
  if (new TextEncoder().encode(fileContents).length > MAX_BACKUP_BYTES) throw new Error('Het back-upbestand is groter dan 20 MB.')
  let parsed: unknown
  try {
    parsed = JSON.parse(fileContents)
  } catch (error) {
    throw new Error('Het gekozen bestand is geen geldige De Ruwe Steen-back-up.', { cause: error })
  }
  const envelope = validateEnvelope(parsed)
  const salt = base64ToBytes(envelope.encryption.salt)
  const nonce = base64ToBytes(envelope.encryption.nonce)
  const ciphertext = base64ToBytes(envelope.ciphertext)
  const key = await deriveKey(password, salt)
  let plaintext: ArrayBuffer
  try {
    plaintext = await crypto.subtle.decrypt({
      name: 'AES-GCM',
      iv: toArrayBuffer(nonce),
      additionalData: envelopeAdditionalData(envelope),
      tagLength: 128,
    }, key, toArrayBuffer(ciphertext))
  } catch (error) {
    throw new Error('Het wachtwoord is onjuist of het back-upbestand is beschadigd.', { cause: error })
  }
  let decoded: unknown
  try {
    decoded = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plaintext))
  } catch (error) {
    throw new Error('De ontsleutelde back-up bevat ongeldige gegevens.', { cause: error })
  } finally {
    new Uint8Array(plaintext).fill(0)
  }
  return { envelope, payload: validateBackupPayload(decoded, envelope.schemaVersion) }
}

export function getBackupSummary(payload: BackupPayload): BackupSummary {
  const count = (name: string) => payload.database.tables.find((table) => table.name === name)?.values.length ?? 0
  return {
    checkIns: count('daily_check_ins'),
    habits: count('habits'),
    habitEntries: count('habit_entries'),
    goals: count('goals'),
    activities: count('activities'),
    reflections: count('reflections') + count('journey_reflections'),
  }
}

export function toBase64(value: string): string {
  return bytesToBase64(new TextEncoder().encode(value))
}

export function fromBase64(value: string): string {
  return new TextDecoder('utf-8', { fatal: true }).decode(base64ToBytes(value))
}
