import { DATABASE_NAME, databaseService } from '../services/database.service'
import { sqliteQuery, sqliteRun } from '../services/sqlite'
import type { DateDisplayFormat } from '../utils/format-date'

export type ThemePreference = 'system' | 'light' | 'dark'

export interface AppPreferences {
  theme: ThemePreference
  dateFormat: DateDisplayFormat
}

const defaults: AppPreferences = { theme: 'system', dateFormat: 'localized' }

export const settingsRepository = {
  async load(): Promise<AppPreferences> {
    const result = await sqliteQuery({
      database: DATABASE_NAME,
      statement: 'SELECT setting_key, setting_value FROM app_settings',
    })
    const preferences = { ...defaults }
    for (const value of result.values ?? []) {
      if (value.setting_key === 'theme' && (value.setting_value === 'system' || value.setting_value === 'light' || value.setting_value === 'dark')) {
        preferences.theme = value.setting_value
      }
      if (value.setting_key === 'date_format' && (value.setting_value === 'localized' || value.setting_value === 'iso')) {
        preferences.dateFormat = value.setting_value
      }
    }
    return preferences
  },

  async setTheme(theme: ThemePreference): Promise<void> {
    await this.setValue('theme', theme)
  },

  async setDateFormat(format: DateDisplayFormat): Promise<void> {
    await this.setValue('date_format', format)
  },

  async setValue(key: string, value: string): Promise<void> {
    await sqliteRun({
      database: DATABASE_NAME,
      statement: `INSERT INTO app_settings (setting_key, setting_value, updated_at)
        VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at`,
      values: [key, value],
    })
    await databaseService.persist()
  },
}
