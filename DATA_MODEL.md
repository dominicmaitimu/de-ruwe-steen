# Data model

The check-in and habit feature layers communicate with SQLite through their respective repositories; React components do not issue SQL directly. Pure date, validation, scheduling, and chart-series behavior is kept in feature logic modules.

The current journey UI follows the same repository boundary: its React provider calls the SQLite-backed journey repository, not browser storage or a remote service.

## Entities

### Learner journey

The local journey has one `journey_progress` row with its start timestamp. Each day has at most one saved answer in `journey_answers`; writing an answer also inserts that day into `journey_completed_days`. Journey reflections are stored separately in `journey_reflections` so the earlier reflection feature's schema and data remain unchanged.

The current day is derived from the local calendar date and the journey start time, capped at day 365. Completion percentage and week are derived from completed-day records. Saving a response updates the stone's progress; no account or Supabase service is involved.

### Pillar

A `Pillar` contains an `id`, Dutch `name`, `color`, `icon`, and `sortOrder`. Five initial rows are seeded by database migration 2 and loaded from SQLite for the dashboard.

### Daily check-in

A `CheckIn` belongs to one local calendar date and contains four integer scores from 1 to 10:

- `mood`
- `energy`
- `mentalCalm`
- `satisfaction`

It also stores the yes/no answer `didSomethingForSelf`, an optional `reflection`, and creation/update timestamps. A unique database constraint on the date plus repository upsert semantics guarantees at most one record per day.

`CheckInDraft` is the form model. It uses camelCase names and keeps the yes/no answer unset until the person chooses one. Before persistence, the repository validates the date, score bounds, answer selection, and reflection length.

## Query and persistence behavior

- The dashboard loads today's check-in, the five pillars, and the latest three check-ins.
- The history screen queries a selected month and sorts records newest first.
- The trend screen queries the most recent 30 calendar days and creates 7- or 30-day series in memory.
- Missing dates remain `null`; chart paths break at missing dates rather than treating them as zero.
- Re-saving a date updates its scores, answer, reflection, and `updated_at` while retaining the original record identifier and `created_at`.

### Habit

A `Habit` stores the person's chosen activity, optional description and desired duration, one or more pillar links, active dates, and status. Frequency can be daily, a target number across a week, selected weekdays, or a target number over a custom period (up to 90 days). The application spreads weekly/custom schedules across their period; they are not shown every day by default.

`HabitDraft` is validated before persistence. Habit and pillar-link changes are saved in one SQLite transaction. Status changes support active, paused, and ended without deleting prior entries.

Status periods preserve when a habit was active, paused, or ended. History can therefore mark paused/ended dates as not applicable without erasing any existing registration.

### Habit entry

A `HabitEntry` records one explicit performed/not-performed choice for one habit and local date, along with optional actual duration and note. Its unique `(habit_id, entry_date)` key and transactional upsert prevent duplicates. Removing an entry restores the “not registered” state. Calendar days outside a habit's active dates or chosen schedule are “not applicable”; relevant dates without an entry remain “not registered.”

### Habit insights

Weekly/monthly counts, mean registrations per week, and total recorded time are calculated from completed local entries. Historical views allow 7, 30, 90 days, or the full available period. The small weekly bar chart describes registrations; no streaks, points, or ratings are calculated.

### Personal goal

A `Goal` represents a user-defined result or development intention. It belongs to one or more pillars and stores a start date, an optional target date, a status, and optional descriptive context. Goals can be active, paused, completed, or cancelled.

`GoalDraft` is validated before it is saved. The repository saves a goal and its pillar links together in a SQLite transaction. When no `GoalStep` records exist, progress is manually set from 0 to 100. When steps exist, progress is calculated from their completion state instead; completing a goal marks its remaining steps complete. Steps can be edited, removed, completed, and reordered. Goal deletion removes its related steps and pillar links.

The dashboard shows up to three active goals. The development area provides goal and habit views; goal lists can be filtered by status, type, and pillar, and sorted by creation date, target date, or progress. Related active habits are surfaced by shared pillar.

### Activity

An `Activity` records an experience with a required title, a local date, optional description, duration, personal 1–5 rating, and private note. It can be linked to zero or more pillars through `activity_pillars`. Activities are not tied to goals and are never assigned a performance score.

The activity list filters by a rolling 7-, 30-, or 90-day period (or all saved dates), pillar, and search text, with newest/oldest date sorting. Summaries count activities, add recorded duration, and show counts by linked pillar; activities without a pillar remain included in the total but not in pillar counts.

### Reflection

A `Reflection` stores optional title, required free-form content, local date, a `journal`, `daily`, `weekly`, or `monthly` type, and zero or more pillar links. The simple writing editor preserves line breaks and supports long text. Optional question prompts and weekly/monthly suggestions can be inserted into the text and then edited or removed; no questions are mandatory.

Unsaved editor changes prompt before leaving through app navigation, and the browser's page-unload guard warns before discarding them. Reflection text is stored only in local SQLite; it is not logged, sent to external services, or automatically analyzed. Dashboard previews are available only in the on-device app.

### Insights

The insights screen reads the existing SQLite tables through a read-only repository and requires no schema migration. Periods are 7, 30, or 90 rolling days, 365 days, or all saved data. Check-in averages use only entered check-ins; chart lines are broken across missing dates. Equal-length previous periods are shown descriptively, while goal statuses are identified as current because historical goal-status transitions are not stored.

Habit summaries keep completed entries, explicit non-completions, unregistered relevant days, and not-applicable days distinct; no streak or completion score is calculated. Habit registration, activity, and reflection timelines use saved dates, and links to multiple pillars count once for each linked pillar. Reflection queries load only identifier, title, date, type, and pillar links; reflection text is never included in insights calculations. The activity/energy comparison is shown only when there are at least three check-ins in both groups and is described as an association, not a cause.

### Local preferences and data management

Theme (`system`, `light`, or `dark`) and date display (`localized` or `iso`) are stored locally in `app_settings`. An encrypted backup serializes the full SQLite schema and table data into a versioned envelope; restoring replaces personal rows transactionally and verifies SQLite and foreign-key integrity before commit. Restoring an older schema uses the current database schema and defaults missing preferences. A recovery backup is required before replacement through the settings UI.

Plain JSON export is an explicit, unencrypted option. Personal-data deletion removes user records and preferences while retaining the seeded pillars and database schema. Neither action runs automatically.

## Out of scope

No composite wellbeing or performance score, automated reflection analysis, or server-side processing is added. Goals, habits, check-ins, activities, reflections, and their insights stay local and work without a network connection.
