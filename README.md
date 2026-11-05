# De Ruwe Steen

De Ruwe Steen is een lokale 365-daagse reflectie- en leerreis rond de leerlinggraad. De reis doorloopt acht fases, met dagelijkse vragen, persoonlijke antwoorden en reflecties. De steen verandert mee met de voortgang. De interface is gebaseerd op App B; alle reisgegevens worden lokaal in App A's SQLite-database opgeslagen. Er is geen account of Supabase-koppeling.

## Implemented features

De app is at version 1.0.0 and includes:

- Vite + React + TypeScript app bootstrapping
- Capacitor Android integration
- App B's responsive journey shell, routes, and dark visual styling
- Eight phases of the 365-day learner journey, with curated daily prompts
- Local answer saving and completed-day tracking
- Local journey reflections and progress summaries
- Interactive Three.js stone visualization and transformation timeline
- Versioned local SQLite database and migrations; journey records use App A's repositories and database service
- Local preference management for theme and date display
- Password-encrypted backups, user-selected import/export, restore safety points, and integrity checks
- Explicit plain-JSON export and confirmed personal-data deletion
- Local Android app shell and PWA support

The earlier check-in, habit, goal, activity, and insight modules and their SQLite tables remain in the project/database; the current journey navigation focuses on App B's experience.

## Local development

```bash
npm install
npm run dev
```

Open the Vite app in the browser at http://localhost:5173.

## Production build

```bash
npm run build
```

## Android workflow

1. Install Android Studio and Android SDK.
2. Ensure Java 21 and Android SDK Platform 36 are installed.
3. Build the Android debug APK:

```bash
npm run android:build
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.

### Signed release APK

See [ANDROID_RELEASE.md](./ANDROID_RELEASE.md) for keystore handling and the required signing environment variables. A release APK is built with:

```bash
npm run android:release
```

To open Android Studio:

```bash
npx cap open android
```

## App structure

- `src/components`: reusable UI blocks
- `src/pages`: learner journey screens based on App B
- `src/journey`: SQLite repository, journey progress logic, and React state provider
- `src/features`: retained check-in, history, trend, and dashboard modules
- `src/check-in`: check-in types, repository, and business logic
- `src/habits`: habit types, schedule logic, SQLite repository, and mobile screens
- `src/goals`: goal types, progress logic, SQLite repository, and mobile screens
- `src/activities`: activity types, filters, SQLite repository, and screens
- `src/reflections`: reflection types, writing prompts, SQLite repository, and screens
- `src/insights`: read-only local snapshot queries, descriptive calculations, and insights screen
- `src/settings`: preferences, database health, encrypted backups, restore, and data management
- `src/layouts`: shared mobile app layout
- `src/hooks`: custom hooks
- `src/database`: SQLite schema version and migrations
- `src/services`: platform services
- `src/types`: shared typing
- `src/theme`: light/dark design tokens
- `src/utils`: small shared helpers
- `src/App.tsx`: app shell and navigation

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm test
npm run android:sync
npm run android:build
npm run android:release
npm run android:open
```

The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.

## Notes

The SQLite schema is at version 9. Migration 9 adds local journey progress, answers, completed days, and journey reflections while preserving earlier tables. See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md), [DATA_MODEL.md](./DATA_MODEL.md), [BACKUP_AND_RESTORE.md](./BACKUP_AND_RESTORE.md), [PRIVACY.md](./PRIVACY.md), and [RELEASE_NOTES.md](./RELEASE_NOTES.md) for details.
