# Backup and restore

De Ruwe Steen stores personal data in its local SQLite database. The settings page supports encrypted backups, explicit unencrypted JSON exports, restoration, an integrity check, and deletion of personal data.

## Encrypted backup

1. Open **Instellingen**.
2. Enter and confirm a password of at least 12 characters.
3. Choose a destination in the Android system file picker, or use the browser download in web development.
4. Keep the password separately from the `.deruwesteen` file. De Ruwe Steen does not store or recover it. Existing encrypted backups remain restorable.

The versioned backup uses AES-256-GCM with a fresh 16-byte salt and 12-byte nonce, and PBKDF2-HMAC-SHA-256 with 600,000 iterations. Envelope metadata is authenticated with the encrypted data. The password and clear database contents are not written into the backup envelope. Exports and imports are limited to 20 MB.

## Restore

1. Select a `.deruwesteen` file and enter its password. This also accepts earlier encrypted backups, regardless of their filename extension.
2. Review the export date, schema version, and record counts. This check does not change the current database.
3. Create and save an encrypted recovery point of the current database.
4. Confirm replacement. Restore runs in a database transaction and checks SQLite integrity and foreign-key consistency before committing.

If validation or insertion fails, the transaction is rolled back. Older supported schema snapshots are migrated into the current schema; preferences absent from older snapshots use their defaults. A backup from a newer or unsupported schema is rejected. Restore is not a merge: it replaces personal data.

## JSON export and delete

The optional JSON export is **not encrypted** and contains readable personal data. Only use a destination you trust and protect or delete the file when it is no longer needed.

Deleting personal data requires typing the confirmation phrase and a second confirmation. It removes journey answers, completions, journey reflections, check-ins, habits, goals, activities, reflections, preferences, and related records while preserving the database structure and five seeded pillars. This cannot be undone without a saved backup.

## Integrity check

The settings page runs SQLite `integrity_check` and `foreign_key_check`, and shows local table row counts. A failed check is reported; De Ruwe Steen does not silently repair database contents.

More on storage and platform behavior: [PRIVACY.md](./PRIVACY.md).
