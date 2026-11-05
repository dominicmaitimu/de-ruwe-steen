# Android release builds

The Android application ID is `com.deruwesteen.app`. The package and Android version name are currently `1.0.0`; increment `versionCode` in `android/app/build.gradle` for each published release.

## Create a release keystore

Use a private location outside the repository and restrict access to the keystore and its passwords. For example:

```powershell
keytool -genkeypair -v -keystore "$HOME\deruwesteen-release.jks" -alias deruwesteen -keyalg RSA -keysize 3072 -validity 10000
```

Keep a secure, separate backup of the keystore. Losing it can prevent updates to an already published app. Never commit the keystore, passwords, or signing properties to source control.

## Configure signing and build

Set these variables in the build environment:

- `DERUWESTEEN_RELEASE_STORE_FILE`: absolute path to the `.jks` file
- `DERUWESTEEN_RELEASE_STORE_PASSWORD`: keystore password
- `DERUWESTEEN_RELEASE_KEY_ALIAS`: key alias (for the example above, `deruwesteen`)
- `DERUWESTEEN_RELEASE_KEY_PASSWORD`: key password

PowerShell session example (enter real secrets locally; do not paste them into tracked files):

```powershell
$env:DERUWESTEEN_RELEASE_STORE_FILE = "$HOME\deruwesteen-release.jks"
$env:DERUWESTEEN_RELEASE_STORE_PASSWORD = "<your-keystore-password>"
$env:DERUWESTEEN_RELEASE_KEY_ALIAS = "deruwesteen"
$env:DERUWESTEEN_RELEASE_KEY_PASSWORD = "<your-key-password>"
npm run android:release
```

The Gradle release-signing validation fails if any variable is missing. Debug builds do not need release credentials. The command builds the web app, syncs Capacitor, and produces:

```text
android\app\build\outputs\apk\release\app-release.apk
```

Before distribution, verify the signing certificate and APK on supported Android versions and test document picking/saving on a device. Keep the signing key stable across updates, and use a separate, controlled process for app-store publishing.

## Android privacy configuration

System backup and device-transfer extraction are disabled; the app's own user-triggered backup flow is the supported way to move personal data. The document picker uses the Storage Access Framework and requires no broad storage permission. `INTERNET` remains for Capacitor WebView runtime compatibility; the application has no configured backend.
