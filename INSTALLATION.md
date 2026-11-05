# Installation

## Requirements

- Node.js 20+
- npm
- Git
- Android Studio with Android SDK
- Java 21 (Android Studio's bundled JBR works)
- Android SDK Platform 36 and build-tools
- Windows development machine for the Android build flow

## Install dependencies

```bash
npm install
```

## Start the app locally

```bash
npm run dev
```

This starts the Vite app and serves it at http://localhost:5173.

## Build the web app

```bash
npm run build
npm run lint
npm test
```

## Android setup

1. Install Android Studio and command line tools.
2. Install Android SDK Platform 36 and the matching build tools.
3. Ensure `JAVA_HOME` points to JDK 21 and `ANDROID_HOME` points to your Android SDK. For example:

```bash
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
```

4. Build the web app, sync Capacitor, and compile a debug APK:

```bash
npm run android:build
```

The generated APK is `android\app\build\outputs\apk\debug\app-debug.apk`.

## Signed release APK

Create and protect a release keystore before producing a distributable APK. Follow [ANDROID_RELEASE.md](./ANDROID_RELEASE.md); signing credentials are supplied through environment variables and must not be committed. Then run:

```bash
npm run android:release
```

The signed APK is generated at `android\app\build\outputs\apk\release\app-release.apk`.

To install it on a connected Android phone with USB debugging enabled:

```bash
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

To open the project in Android Studio:

```bash
npx cap open android
```

## Offline-first behavior

The app is designed to run locally without a backend. Database operations are handled through the Capacitor SQLite plugin, including the browser SQLite runtime for local development. The app shell, check-in, habits, goals, activities, reflections, and insights remain usable without internet access. Insights query existing local tables and do not load reflection text. Reflection content is stored locally and is not sent to external services or automatically analyzed.

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) and [DATA_MODEL.md](./DATA_MODEL.md) for the local data layout.
See [BACKUP_AND_RESTORE.md](./BACKUP_AND_RESTORE.md) for encrypted backups and [PRIVACY.md](./PRIVACY.md) for local storage and privacy behavior.
