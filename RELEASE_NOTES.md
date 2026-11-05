# De Ruwe Steen 1.0.0

## Release overview

De Ruwe Steen 1.0.0 presents a 365-day learner journey through eight reflective phases, with daily questions, saved answers, personal reflections, and an evolving 3D rough-stone visualization. Journey data is stored locally in App A's SQLite database without an account or Supabase backend.

## What's included

- Eight-phase question journey with local answers and completion tracking.
- Local journey reflections, progress summaries, themed question categories, and stone transformation views.
- App A's existing check-in, habit, goal, activity, reflection, and insight database/modules remain available in the codebase.
- System/light/dark theme and localized/ISO date display.
- Password-protected `.deruwesteen` backup, validated restore with recovery point, plain JSON export, integrity checks, and confirmed personal-data deletion.
- Android SAF file selection and saving, with system backup/data transfer disabled.

## Installation and building

Requirements, debug installation, and local development: [INSTALLATION.md](./INSTALLATION.md).

Signed release setup and required signing environment: [ANDROID_RELEASE.md](./ANDROID_RELEASE.md).

Encrypted backup and restore instructions: [BACKUP_AND_RESTORE.md](./BACKUP_AND_RESTORE.md).

## Known limitations

- The SQLite database is not encrypted at rest; biometric app locking is not enabled. Use Android's device lock and encryption.
- The encrypted backup password cannot be recovered if lost. Plain JSON exports are not encrypted.
- Android document picking and saving require practical validation on a physical device.
- A signed, distributable APK requires locally configured release keystore credentials.
- There is no backend synchronization, cloud account, or multi-device sync.
- Android `INTERNET` permission remains for Capacitor WebView compatibility; no De Ruwe Steen backend is configured.
