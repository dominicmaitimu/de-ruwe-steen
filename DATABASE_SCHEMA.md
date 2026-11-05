# Database schema

De Ruwe Steen uses `@capacitor-community/sqlite` with a local database named `deruwesteen-db`. The same repository API is used on Android and in browser development. Schema changes are applied in ascending order through `src/database/migrations.ts`.

The project initially had only the version-1 `app_meta` table. Version 2 adds the dashboard pillars and daily check-ins; no previous pillar records or product schema documents were present to reuse.

## Migration history

| Version | Tables and changes |
|---|---|
| 1 | `app_meta` key/value metadata table |
| 2 | `pillars` seed data; `daily_check_ins` and a date index |
| 3 | `habits`, `habit_pillars`, `habit_entries`, and date/status indexes |
| 4 | `habit_status_periods` with status-history backfill |
| 5 | Unique index to enforce one open status period per habit |
| 6 | `goals`, `goal_steps`, `goal_pillars`, and goal query indexes |
| 7 | `activities`, `activity_pillars`, `reflections`, `reflection_pillars`, and date/type indexes |
| 8 | `app_settings` for theme and date-display preferences, seeded with defaults |
| 9 | `journey_progress`, `journey_answers`, `journey_completed_days`, and `journey_reflections` for the local 365-day learner journey |

`schema_migrations` stores each applied migration version and UTC application time.

The insights feature does not add tables or change the schema. It reads existing feature tables through date-bounded queries; reflection content is deliberately excluded from its queries.

## Migration 8: `app_settings`

| Column | Type | Constraints | Meaning |
|---|---|---|---|
| `setting_key` | TEXT | Primary key | Preference identifier (`theme` or `date_format`) |
| `setting_value` | TEXT | Not null | Preference value |
| `updated_at` | TEXT | Not null, UTC default | Last local update time |

Migration 8 seeds the `theme=system` and `date_format=localized` preferences. The settings repository validates known values and falls back to these defaults if a stored value is unsupported. Preference values are included in database backups.

## Migration 9: learner journey

| Table | Columns | Purpose |
|---|---|---|
| `journey_progress` | `id` (fixed primary key `1`), `started_at` | Stores the start timestamp for the 365-day journey. The migration seeds one row. |
| `journey_answers` | `journey_day` (primary key, 1–365), `answer`, `updated_at` | Stores the latest answer for each journey day. Saving again updates the existing day. |
| `journey_completed_days` | `journey_day` (primary key, 1–365), `completed_at` | Tracks days completed by saving an answer, independently of the answer text. |
| `journey_reflections` | `id`, `text`, `created_at` | Stores private free-form reflections for the journey, separately from App A's reflection records. |

The journey repository is the UI's only path to these tables. Answers, completions, and reflections are included in encrypted and plain database exports. Deleting personal data clears the journey records and starts a fresh journey.

## `pillars`

| Column | Type | Constraints | Meaning |
|---|---|---|---|
| `id` | TEXT | Primary key | Stable internal key |
| `name` | TEXT | Not null | Dutch display name |
| `color` | TEXT | Not null | Hex color used by the dashboard |
| `icon` | TEXT | Not null | Display glyph |
| `sort_order` | INTEGER | Unique, not null | Dashboard order |

The migration seeds the five foundational pillars: Lichamelijk, Mentaal, Persoonlijke ontwikkeling, Creativiteit, and Eigen identiteit.

## `daily_check_ins`

| Column | Type | Constraints | Meaning |
|---|---|---|---|
| `id` | INTEGER | Primary key, autoincrement | Record identifier |
| `check_in_date` | TEXT | Not null, unique | Local calendar date in `YYYY-MM-DD` |
| `mood` | INTEGER | Not null, 1–10 | Today's mood |
| `energy` | INTEGER | Not null, 1–10 | Today's energy |
| `mental_calm` | INTEGER | Not null, 1–10 | Today's mental calm |
| `satisfaction` | INTEGER | Not null, 1–10 | Today's satisfaction |
| `did_something_for_self` | INTEGER | Not null, 0 or 1 | Whether the person did something for themself |
| `reflection` | TEXT | Nullable | Optional free reflection, max 2,000 characters in app validation |
| `created_at` | TEXT | Not null | UTC creation timestamp |
| `updated_at` | TEXT | Not null | UTC update timestamp |

The unique date constraint makes the daily check-in an upsert: saving the same day again edits that day's record instead of creating a duplicate. The index on `check_in_date` supports date-range reads for history and charts.

## Migration 3: habits

The original database did not contain a `HabitEntries` table, habit entities, or pillar-link table. Migration 3 creates their SQLite equivalents (`habit_entries`, `habits`, and `habit_pillars`) while preserving all version-1 and version-2 data.

### `habits`

Stores the user's chosen habit name, optional description, frequency configuration, optional preferred duration, active date range, status (`active`, `paused`, or `ended`), and timestamps. Frequency type is one of `daily`, `weekly`, `weekdays`, or `period`. Weekly/custom frequencies store the target count and period length; weekday schedules store ISO weekday numbers in a comma-separated field.

| Column | Type | Constraints | Meaning |
|---|---|---|---|
| `id` | TEXT | Primary key | Stable app-generated ID |
| `name` | TEXT | Not null | Habit name |
| `description` | TEXT | Not null, defaults empty | Optional description |
| `frequency_type` | TEXT | Not null, constrained | Daily, weekly, selected weekdays, or custom period |
| `target_count` | INTEGER | Not null, 1–31 | Desired number per period |
| `period_days` | INTEGER | Not null, 1–90 | Frequency interval length |
| `weekdays` | TEXT | Not null, defaults empty | Selected ISO weekdays, comma-separated |
| `desired_duration_minutes` | INTEGER | Nullable, 1–1,440 | Optional intended duration |
| `start_date` | TEXT | Not null | First applicable date |
| `end_date` | TEXT | Nullable, not before start | Last applicable date |
| `status` | TEXT | Not null, constrained | Active, paused, or ended |
| `created_at`, `updated_at` | TEXT | Not null | UTC timestamps |

### `habit_pillars`

Links habits to one or more rows in `pillars`. The composite primary key prevents duplicate links.

| Column | Type | Constraints | Meaning |
|---|---|---|---|
| `habit_id` | TEXT | Primary-key component, references `habits.id` | Linked habit |
| `pillar_id` | TEXT | Primary-key component, references `pillars.id` | Linked pillar |

### `habit_entries`

| Column | Type | Constraints | Meaning |
|---|---|---|---|
| `id` | INTEGER | Primary key, autoincrement | Entry identifier |
| `habit_id` | TEXT | Not null, references `habits.id` | Habit being recorded |
| `entry_date` | TEXT | Not null, `YYYY-MM-DD` | Local calendar date |
| `completed` | INTEGER | Not null, 0 or 1 | Explicitly performed or not performed |
| `duration_minutes` | INTEGER | Nullable, 1–1,440 | Actual recorded duration |
| `note` | TEXT | Not null, defaults empty | Optional note |
| `created_at` | TEXT | Not null | UTC creation timestamp |
| `updated_at` | TEXT | Not null | UTC update timestamp |

`UNIQUE (habit_id, entry_date)` ensures at most one entry per habit and local calendar date. Re-saving a date updates that entry transactionally; undoing removes the record. An absent row means “not registered,” not “not performed.”

### `habit_status_periods`

Stores each active, paused, or ended interval with inclusive `starts_on` and optional inclusive `ends_on` dates. Status transitions close the previous interval on the preceding local day and start a new interval on the selected local date in the same transaction. The migration backfills the best available interval from the saved current status; earlier status changes cannot be reconstructed if they predate this table.

The partial unique index on open intervals ensures a habit cannot have more than one current status period.

## Migration 6: goals

The previous schema did not contain goal entities or goal-step/pillar-link tables. Migration 6 adds their SQLite equivalents while preserving existing check-in and habit records.

### `goals`

Stores a personal result or development goal, its description, status, dates, and manual progress when no steps are defined. Status is `active`, `paused`, `completed`, or `cancelled`; target dates are optional and cannot precede the start date.

| Column | Type | Constraints | Meaning |
|---|---|---|---|
| `id` | TEXT | Primary key | Stable app-generated ID |
| `title` | TEXT | Not null | Goal title |
| `description` | TEXT | Not null, defaults empty | Optional meaning/context |
| `goal_type` | TEXT | Not null, constrained | `result` or `development` |
| `status` | TEXT | Not null, constrained | Current goal state |
| `start_date` | TEXT | Not null | Start date in `YYYY-MM-DD` |
| `target_date` | TEXT | Nullable, not before start | Optional target date |
| `manual_progress` | INTEGER | Not null, 0–100 | Progress used when there are no steps |
| `created_at`, `updated_at` | TEXT | Not null | UTC timestamps |

### `goal_steps`

Stores optional ordered, individually completable steps for a goal. Progress is calculated as the rounded percentage of completed steps whenever steps exist. Goal deletion cascades to its steps.

| Column | Type | Constraints | Meaning |
|---|---|---|---|
| `id` | INTEGER | Primary key, autoincrement | Step identifier |
| `goal_id` | TEXT | Not null, references `goals.id` | Parent goal |
| `title` | TEXT | Not null | Step title |
| `sort_order` | INTEGER | Not null, unique per goal | Display order |
| `completed` | INTEGER | Not null, 0 or 1 | Completion state |
| `created_at`, `updated_at` | TEXT | Not null | UTC timestamps |

### `goal_pillars`

Links goals to one or more rows in `pillars`. The composite primary key prevents duplicate links; deleting a goal or pillar cascades to the link.

| Column | Type | Constraints | Meaning |
|---|---|---|---|
| `goal_id` | TEXT | Primary-key component, references `goals.id` | Linked goal |
| `pillar_id` | TEXT | Primary-key component, references `pillars.id` | Linked pillar |

## Migration 7: activities and reflections

The database did not previously contain the requested `Activities`, `ActivityPillars`, `Reflections`, or `ReflectionPillars` entities. Migration 7 adds the equivalent local SQLite tables and indexes without modifying earlier data.

### `activities`

Stores an experience or activity independently of goals and habits. A title and local date are required; description, duration, personal rating, and note are optional. Rating is a subjective 1–5 value, not a performance score.

| Column | Type | Constraints | Meaning |
|---|---|---|---|
| `id` | TEXT | Primary key | Stable app-generated ID |
| `title` | TEXT | Not null | Activity title |
| `description` | TEXT | Not null, defaults empty | Optional short context |
| `activity_date` | TEXT | Not null | Local calendar date in `YYYY-MM-DD` |
| `duration_minutes` | INTEGER | Nullable, 1–1,440 | Optional recorded duration |
| `rating` | INTEGER | Nullable, 1–5 | Optional personal impression |
| `note` | TEXT | Not null, defaults empty | Optional private note |
| `created_at`, `updated_at` | TEXT | Not null | UTC timestamps |

### `activity_pillars`

Links an activity to zero or more pillars. Activities without a pillar link are valid. The composite primary key prevents duplicate links.

| Column | Type | Constraints | Meaning |
|---|---|---|---|
| `activity_id` | TEXT | Primary-key component, references `activities.id` | Linked activity |
| `pillar_id` | TEXT | Primary-key component, references `pillars.id` | Linked pillar |

### `reflections`

Stores private free-form writing. A non-whitespace content body, date, and type are required; title is optional. Reflection types are `journal`, `daily`, `weekly`, or `monthly`. Content is plain text and has no external storage or analysis service.

| Column | Type | Constraints | Meaning |
|---|---|---|---|
| `id` | TEXT | Primary key | Stable app-generated ID |
| `title` | TEXT | Not null, defaults empty | Optional title |
| `content` | TEXT | Not null | Private reflection body |
| `reflection_date` | TEXT | Not null | Local calendar date in `YYYY-MM-DD` |
| `reflection_type` | TEXT | Not null, constrained | Journal, daily, weekly, or monthly |
| `created_at`, `updated_at` | TEXT | Not null | UTC timestamps |

### `reflection_pillars`

Links a reflection to zero or more pillars. The composite primary key prevents duplicate links.

| Column | Type | Constraints | Meaning |
|---|---|---|---|
| `reflection_id` | TEXT | Primary-key component, references `reflections.id` | Linked reflection |
| `pillar_id` | TEXT | Primary-key component, references `pillars.id` | Linked pillar |

## Local-first and privacy

The data stays in the device's SQLite database. No backend or network request is required by check-ins, habits, goals, activities, or reflections. Reflection bodies are not included in logs or system notices. The browser development store is persisted locally by `jeep-sqlite`.
