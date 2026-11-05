# GitHub Actions CI/CD voor De Ruwe Steen

## CI-workflow (`.github/workflows/ci.yml`)

- Trigger: push en pull requests naar `main`.
- Voert lint, tests, productiebuild, Capacitor sync en Android debugbuild uit.
- Publiceert de debug APK als artifact.
- Gebruikte scripts: `npm run lint`, `npm test`, `npm run build`, `npx cap sync android`, `./gradlew assembleDebug`.
- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Release-workflow (`.github/workflows/release.yml`)

- Trigger: tags in de vorm `v*`.
- Voert dezelfde kwaliteitscontroles uit als CI.
- Bouwt een ondertekende release APK.
- Signing key wordt tijdelijk uit `ANDROID_KEYSTORE_BASE64` gereconstrueerd.
- Signing secrets worden als environment variables gezet:
  - `DERUWESTEEN_RELEASE_STORE_FILE`
  - `DERUWESTEEN_RELEASE_STORE_PASSWORD`
  - `DERUWESTEEN_RELEASE_KEY_ALIAS`
  - `DERUWESTEEN_RELEASE_KEY_PASSWORD`
- APK wordt geverifieerd met `apksigner verify`.
- Release APK wordt als asset toegevoegd aan de GitHub Release.
- Keystore wordt na afloop verwijderd.

## Benodigde GitHub Secrets

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

## Releaseprocedure

1. Verhoog handmatig `versionCode` en `versionName` in `android/app/build.gradle`.
2. Commit en push deze wijziging naar `main`.
3. Maak een nieuwe tag aan in de vorm `vX.Y.Z` die overeenkomt met de nieuwe `versionName`.
4. Push de tag naar GitHub.
5. De releaseworkflow bouwt en publiceert de ondertekende APK.

## Versiebeheer

- `versionCode` en `versionName` staan in `android/app/build.gradle`.
- Verhoog beide vóór iedere release.
- De releaseworkflow controleert dat de tag overeenkomt met de `versionName`.

## Beveiliging en herstel signinggegevens

- Signing key wordt nooit in de repository of artifacts opgeslagen.
- Signing secrets zijn alleen beschikbaar in de releaseworkflow.
- Keystore wordt altijd verwijderd na de build.
- Herstel: voeg een nieuwe base64-gecodeerde keystore toe aan de repository secrets indien nodig.

## Locatie APK

- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk` (artifact in CI).
- Release APK: `android/app/build/outputs/apk/release/app-release.apk` (asset bij GitHub Release).

## Buildproblemen onderzoeken

- Bekijk de logs van de mislukte workflow in GitHub Actions.
- Controleer lint, tests, build, signing en APK-verificatie.
- Controleer of de signing secrets correct zijn ingesteld.
