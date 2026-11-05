# Privacy and local data

De Ruwe Steen is designed for local, offline use. It has no application account, backend, analytics, advertising SDK, or app-level data synchronization. The Android `INTERNET` permission is retained for Capacitor's local WebView runtime; the app does not send personal records to a De Ruwe Steen server.

## What is stored

The local SQLite database can contain learner-journey answers, completed days and reflections, check-in scores, habit and goal details, activity notes and ratings, journal text, pillar links, and display preferences. This information stays in the app's local database unless you explicitly export it, share a backup, or use Android system features outside the app.

Reflection content is not logged or sent to external services. Insights read only reflection metadata (such as date and type), not reflection text.

## Backups and device transfers

Android automatic cloud backup and device-transfer backup are disabled for the app database and files. Use the app's encrypted backup when you want a portable copy. A user-selected file destination may itself be cloud-synchronized by its provider; De Ruwe Steen does not control that destination.

Encrypted backups use AES-256-GCM and PBKDF2-HMAC-SHA-256 (600,000 iterations). The password is not saved. Losing it means the backup cannot be decrypted. Plain JSON export is also available, but is unencrypted and can be read by anyone who obtains the file.

The Android file picker uses the Storage Access Framework, so the app does not request broad storage access. Import/export is limited to 20 MB. The app does not enable biometric database locking: the current SQLite database is not encrypted at rest, and switching encryption on without a secure migration could make existing data inaccessible. Protect the device with its screen lock and use Android's device encryption.

## Retention and deletion

Data remains on the device until you delete it in Settings, clear the app's storage, or uninstall the app. Clearing all personal data from Settings preserves the database schema and seeded pillars, but removes personal records and preferences. Exported files must be deleted separately.

Browser development uses browser-managed local storage for SQLite. Clearing browser site data may permanently remove that development database.

## Permissions and limits

The Android app requests internet access for the local Capacitor WebView. Journey data is not sent to Supabase or another app backend. The interface loads its Cormorant Garamond and Source Sans 3 fonts from Google Fonts when a network connection is available; that font request can disclose the device's network address to Google. Backup file access is granted only through a user-selected Android document URI. This notice describes the current app behavior; review it again if future integrations add network services or third-party SDKs.
