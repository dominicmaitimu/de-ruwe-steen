# Project structure

```text
deruwesteen/
├── android/                    # Capacitor Android project
├── public/                     # Static assets
├── src/
│   ├── app/                    # Router and provider setup
│   ├── assets/                 # Vite assets
│   ├── components/             # Reusable UI and journey shell
│   ├── database/               # SQLite migrations and schema version
│   ├── journey/                # Local journey repository, state, and progress logic
│   ├── pages/                  # Journey screens and 3D stone display
│   ├── check-in/                # Check-in types, repository, logic, and tests
│   ├── habits/                  # Habit types, SQLite repository, schedule logic, and screens
│   ├── goals/                   # Goal types, SQLite repository, progress logic, and screens
│   ├── activities/              # Activity types, local repository, filters, summaries, and screens
│   ├── reflections/             # Reflection types, prompts, local repository, and writing screens
│   ├── insights/                # Read-only cross-feature queries, calculations, and insights screen
│   ├── settings/                # Preferences, encrypted backups, restore, and local data management
│   ├── features/                # Dashboard, check-in, history, and trend screens
│   ├── hooks/                   # Custom React hooks
│   ├── layouts/                # Retained App A mobile app layout
│   ├── services/               # Platform services such as SQLite connection
│   ├── theme/                  # Light/dark design tokens
│   ├── types/                  # Shared application types
│   ├── utils/                  # Small shared helpers
│   ├── App.css                  # App-specific styling
│   ├── App.tsx                  # SQLite initialization and app bootstrapping
│   ├── index.css                # App B's global styles and Tailwind entry
│   └── main.tsx                # React entry point
├── public/assets/sql-wasm.wasm # Browser SQLite runtime
├── public/textures/stone/      # Journey stone stages
├── capacitor.config.ts         # Capacitor app configuration
├── INSTALLATION.md             # Local setup notes
├── DATABASE_SCHEMA.md          # SQLite tables and migration versions
├── DATA_MODEL.md               # App entities and persistence behavior
├── BACKUP_AND_RESTORE.md       # Encrypted backup/export and restore guidance
├── PRIVACY.md                  # Data storage and privacy behavior
├── ANDROID_RELEASE.md          # Android signing and release build instructions
├── RELEASE_NOTES.md            # Version 1.0.0 features and known limitations
├── PROJECT_STRUCTURE.md        # This document
├── README.md                   # Project overview and commands
├── package.json                # npm scripts and dependencies
├── tsconfig.app.json           # App TypeScript config
├── tsconfig.json              # Root TypeScript config
├── vite.config.ts             # Vite configuration
└── index.html                 # HTML entry file
```

## Architectural approach

The journey UI and its route/provider setup are separated from App A's persistent SQLite service and repositories. Existing check-in, habit, goal, activity, reflection, insight, settings, and backup modules remain in the project; the current primary navigation presents App B's journey.

## Future extension points

- Reconnect retained App A tracking and insight modules to the current navigation as needed
- Additional SQLite migrations and data repositories
- Theme and token refinement
- Native Android polish for gestures, status bar, and accessibility
