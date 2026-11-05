export interface DatabaseMigration {
  version: number
  statements: string
}

export const DATABASE_VERSION = 9

export const databaseMigrations: DatabaseMigration[] = [
  {
    version: 1,
    statements: `
      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `,
  },
  {
    version: 2,
    statements: `
      CREATE TABLE IF NOT EXISTS pillars (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        icon TEXT NOT NULL,
        sort_order INTEGER NOT NULL UNIQUE
      );

      INSERT OR IGNORE INTO pillars (id, name, color, icon, sort_order) VALUES
        ('physical', 'Lichamelijk', '#8A9B78', '◌', 1),
        ('mental', 'Mentaal', '#8297A8', '◈', 2),
        ('growth', 'Persoonlijke ontwikkeling', '#C49A65', '↗', 3),
        ('creativity', 'Creativiteit', '#A487AA', '✳', 4),
        ('identity', 'Eigen identiteit', '#C27D67', '◉', 5);

      CREATE TABLE IF NOT EXISTS daily_check_ins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        check_in_date TEXT NOT NULL UNIQUE,
        mood INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 10),
        energy INTEGER NOT NULL CHECK (energy BETWEEN 1 AND 10),
        mental_calm INTEGER NOT NULL CHECK (mental_calm BETWEEN 1 AND 10),
        satisfaction INTEGER NOT NULL CHECK (satisfaction BETWEEN 1 AND 10),
        did_something_for_self INTEGER NOT NULL CHECK (did_something_for_self IN (0, 1)),
        reflection TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE INDEX IF NOT EXISTS idx_daily_check_ins_date
        ON daily_check_ins (check_in_date DESC);
    `,
  },
  {
    version: 3,
    statements: `
      CREATE TABLE IF NOT EXISTS habits (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        frequency_type TEXT NOT NULL CHECK (frequency_type IN ('daily', 'weekly', 'weekdays', 'period')),
        target_count INTEGER NOT NULL CHECK (target_count BETWEEN 1 AND 31),
        period_days INTEGER NOT NULL CHECK (period_days BETWEEN 1 AND 90),
        weekdays TEXT NOT NULL DEFAULT '',
        desired_duration_minutes INTEGER CHECK (desired_duration_minutes BETWEEN 1 AND 1440),
        start_date TEXT NOT NULL,
        end_date TEXT,
        status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'ended')),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        CHECK (end_date IS NULL OR end_date >= start_date)
      );

      CREATE TABLE IF NOT EXISTS habit_pillars (
        habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
        pillar_id TEXT NOT NULL REFERENCES pillars(id) ON DELETE CASCADE,
        PRIMARY KEY (habit_id, pillar_id)
      );

      CREATE TABLE IF NOT EXISTS habit_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
        entry_date TEXT NOT NULL,
        completed INTEGER NOT NULL CHECK (completed IN (0, 1)),
        duration_minutes INTEGER CHECK (duration_minutes BETWEEN 1 AND 1440),
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        UNIQUE (habit_id, entry_date)
      );

      CREATE INDEX IF NOT EXISTS idx_habits_status ON habits (status, start_date);
      CREATE INDEX IF NOT EXISTS idx_habit_entries_date ON habit_entries (entry_date DESC);
      CREATE INDEX IF NOT EXISTS idx_habit_entries_habit_date ON habit_entries (habit_id, entry_date DESC);
    `,
  },
  {
    version: 4,
    statements: `
      CREATE TABLE IF NOT EXISTS habit_status_periods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'ended')),
        starts_on TEXT NOT NULL,
        ends_on TEXT,
        CHECK (ends_on IS NULL OR ends_on >= starts_on)
      );

      CREATE INDEX IF NOT EXISTS idx_habit_status_periods_dates
        ON habit_status_periods (habit_id, starts_on, ends_on);

      INSERT INTO habit_status_periods (habit_id, status, starts_on, ends_on)
      SELECT id, 'active', start_date, NULL FROM habits WHERE status = 'active';

      INSERT INTO habit_status_periods (habit_id, status, starts_on, ends_on)
      SELECT id, 'active', start_date, date(updated_at, '-1 day')
      FROM habits
      WHERE status = 'paused' AND date(updated_at) > start_date;

      INSERT INTO habit_status_periods (habit_id, status, starts_on, ends_on)
      SELECT id, 'paused', MAX(start_date, date(updated_at)), NULL
      FROM habits WHERE status = 'paused';

      INSERT INTO habit_status_periods (habit_id, status, starts_on, ends_on)
      SELECT id, 'active', start_date, date(end_date, '-1 day')
      FROM habits
      WHERE status = 'ended' AND end_date > start_date;

      INSERT INTO habit_status_periods (habit_id, status, starts_on, ends_on)
      SELECT id, 'ended', COALESCE(end_date, date(updated_at)), NULL
      FROM habits WHERE status = 'ended';

    `,
  },
  {
    version: 5,
    statements: `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_status_one_open_period
        ON habit_status_periods (habit_id) WHERE ends_on IS NULL;
    `,
  },
  {
    version: 6,
    statements: `
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        goal_type TEXT NOT NULL CHECK (goal_type IN ('result', 'development')),
        status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
        start_date TEXT NOT NULL,
        target_date TEXT,
        manual_progress INTEGER NOT NULL DEFAULT 0 CHECK (manual_progress BETWEEN 0 AND 100),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        CHECK (target_date IS NULL OR target_date >= start_date)
      );

      CREATE TABLE IF NOT EXISTS goal_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        UNIQUE (goal_id, sort_order)
      );

      CREATE TABLE IF NOT EXISTS goal_pillars (
        goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
        pillar_id TEXT NOT NULL REFERENCES pillars(id) ON DELETE CASCADE,
        PRIMARY KEY (goal_id, pillar_id)
      );

      CREATE INDEX IF NOT EXISTS idx_goals_status ON goals (status, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_goals_target_date ON goals (target_date);
      CREATE INDEX IF NOT EXISTS idx_goal_steps_goal_order ON goal_steps (goal_id, sort_order);
    `,
  },
  {
    version: 7,
    statements: `
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        activity_date TEXT NOT NULL,
        duration_minutes INTEGER CHECK (duration_minutes BETWEEN 1 AND 1440),
        rating INTEGER CHECK (rating BETWEEN 1 AND 5),
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE IF NOT EXISTS activity_pillars (
        activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
        pillar_id TEXT NOT NULL REFERENCES pillars(id) ON DELETE CASCADE,
        PRIMARY KEY (activity_id, pillar_id)
      );

      CREATE TABLE IF NOT EXISTS reflections (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL,
        reflection_date TEXT NOT NULL,
        reflection_type TEXT NOT NULL CHECK (reflection_type IN ('journal', 'daily', 'weekly', 'monthly')),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE IF NOT EXISTS reflection_pillars (
        reflection_id TEXT NOT NULL REFERENCES reflections(id) ON DELETE CASCADE,
        pillar_id TEXT NOT NULL REFERENCES pillars(id) ON DELETE CASCADE,
        PRIMARY KEY (reflection_id, pillar_id)
      );

      CREATE INDEX IF NOT EXISTS idx_activities_date ON activities (activity_date DESC);
      CREATE INDEX IF NOT EXISTS idx_activity_pillars_pillar ON activity_pillars (pillar_id, activity_id);
      CREATE INDEX IF NOT EXISTS idx_reflections_date ON reflections (reflection_date DESC);
      CREATE INDEX IF NOT EXISTS idx_reflections_type_date ON reflections (reflection_type, reflection_date DESC);
      CREATE INDEX IF NOT EXISTS idx_reflection_pillars_pillar ON reflection_pillars (pillar_id, reflection_id);
    `,
  },
  {
    version: 8,
    statements: `
      CREATE TABLE IF NOT EXISTS app_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES
        ('theme', 'system'),
        ('date_format', 'localized');
    `,
  },
  {
    version: 9,
    statements: `
      CREATE TABLE IF NOT EXISTS journey_progress (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        started_at TEXT NOT NULL
      );

      INSERT OR IGNORE INTO journey_progress (id, started_at)
      VALUES (1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

      CREATE TABLE IF NOT EXISTS journey_answers (
        journey_day INTEGER PRIMARY KEY CHECK (journey_day BETWEEN 1 AND 365),
        answer TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE IF NOT EXISTS journey_completed_days (
        journey_day INTEGER PRIMARY KEY CHECK (journey_day BETWEEN 1 AND 365),
        completed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE IF NOT EXISTS journey_reflections (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL CHECK (length(trim(text)) > 0),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE INDEX IF NOT EXISTS idx_journey_reflections_date
        ON journey_reflections (created_at DESC);
    `,
  },
]
