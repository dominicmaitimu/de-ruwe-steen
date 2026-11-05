# De Ruwe Steen 1.0.0 — release-audit

**Auditstatus: niet vrijgegeven.** De geautomatiseerde controles en browsercontroles zijn uitgevoerd, maar de praktijktest op een fysiek Android-toestel en de ondertekende releasebuild ontbreken. Geef de app pas vrij nadat de openstaande controles zijn uitgevoerd en beoordeeld.

## 1. Projectstatus

De Ruwe Steen is een local-first Android-app voor check-ins, gewoonten, doelen, activiteiten, reflecties en offline inzichten. De app gebruikt React, TypeScript, Capacitor en een lokale SQLite-database. De huidige Android-identiteit is `com.deruwesteen.app`, versie `1.0.0` en `versionCode 1`.

### Uitgevoerde controles

| Controle | Resultaat | Bewijs / opmerkingen |
|---|---|---|
| `npm run build` | Geslaagd | TypeScript-controle en Vite-productiebuild. |
| `npm run lint` | Geslaagd | Geen lintfouten gemeld. |
| `npm test` | Geslaagd | **41 tests geslaagd** in 8 testbestanden, inclusief regressietests voor native SQLite-parameterarrays. |
| `npm run android:build` | Geslaagd | Android-debug-APK gebouwd met JDK 21. Een eerste poging met de actieve JDK 11 faalde omdat Android Gradle Plugin JDK 17 of hoger vereist. |
| Browsercontrole database | Geslaagd | Schema versie 8; integriteitscontrole `ok`; geen foreign-keyfouten. |
| Browsercontrole kernflows | Geslaagd | Check-in, doel, gewoonte en registratie, activiteit, reflectie en inzichten zijn gecontroleerd. |
| Back-up en herstel in browser | Geslaagd | JSON- en versleutelde back-up getest; verkeerd wachtwoord afgewezen; herstelroundtrip met behoud van rijaantallen geslaagd. |
| Herstelrollback in browser | Geslaagd | Ongeldige check-in werd geweigerd; gegevens bleven na rollback behouden. |
| Persoonlijke gegevens wissen in browser | Geslaagd | Testgegevens verwijderd; vijf standaardpijlers behouden; integriteit `ok`, nul foreign-keyfouten. |
| Release-ondertekening | **Niet geslaagd / geblokkeerd** | `npm run android:release` is geprobeerd, maar stopte bij de signingcontrole omdat de lokale `DERUWESTEEN_RELEASE_*`-variabelen niet waren ingesteld. Er is geen ondertekende release-APK geverifieerd. |

De browsercontroles zijn geen vervanging voor een Android-toesteltest. De APK-grootte en bundelmetingen zijn eerder vastgelegd, maar zijn geen volledige performance- of compatibiliteitsvalidatie. De productiebuild meldde bovendien dat `jeep-sqlite` de Node-module `crypto` importeert, die Vite voor de browser externaliseert. De build slaagde; de waarschuwing is niet verder onderzocht.

### Technische bevinding

Tijdens de audit is een transactieprobleem gevonden in herstel en wissen: SQLite-bewerkingen konden de expliciete buitenste transactie voortijdig committen. De betreffende repository-aanroepen zijn aangepast om binnen die transactie geen eigen transactie te starten. Herstel, foutafhandeling met rollback en wissen zijn daarna in de browser getest. De tests zijn onderdeel van de bovenstaande uitgevoerde controles.

Tijdens de Android-praktijktest bleek daarnaast dat de native SQLite-plugin voor iedere `query()` expliciet een `values`-array vereist, ook voor parameterloze SQL. De plugin valideert hetzelfde arraycontract voor `run()`. De query na het openen van de database gaf geen array mee, waardoor Android de initialisatie afbrak voordat migraties konden draaien; de browserimplementatie accepteerde de ontbrekende property wel. De app gebruikt nu `src/services/sqlite.ts` als gedeelde wrapper voor query- en run-aanroepen. Die zet ontbrekende parameters om naar `[]` en laat bestaande parameters intact. Alle directe repository-aanroepen zijn op de wrapper aangesloten. `src/services/sqlite.test.ts` bevat regressietests die de native arrayvalidatie simuleren. Unit tests, lint, productiebuild en Android-debugbuild zijn na deze wijziging geslaagd. **De app is na de fix nog niet opnieuw op een fysiek Android-toestel getest**, dus de native initialisatie moet daar nog bevestigd worden.

Een gemelde zwarte pagina bij typen in `Wat houdt me vandaag bezig?` is in de VS Code-browser gereproduceerd. De check-in `onChange`-handler las `event.currentTarget.value` binnen een uitgestelde functionele React-state-update. Tegen de tijd dat React die updater uitvoerde, was `currentTarget` al `null`; dit veroorzaakte `TypeError: Cannot read properties of null (reading 'value')` en crashte de component. De handler leest de waarde nu synchroon uit het event en gebruikt die waarde daarna in de updater. In de browser is na de wijziging tekstinvoer getest en bleef de pagina actief. Eerdere toetsenbord-/viewportaanpassingen waren gebaseerd op een onjuiste hypothese en zijn verwijderd; de vastgestelde directe oorzaak was de event-handlerfout.

## 2. Openstaande controles

Deze controles zijn **niet uitgevoerd** en worden niet als geslaagd beschouwd:

- Praktijktest van de debug-APK op een fysiek Android-toestel, inclusief de checklist hieronder.
- Bevestigen op een fysiek Android-toestel dat database-initialisatie en migraties nu zonder foutmelding slagen; de debugbuild bouwt, maar een build valideert de runtime op toestel niet.
- Herhaal de invoertest in de VS Code-browser na volledige reload en bevestig dat tekstinvoer geen componentfout meer veroorzaakt.
- Bevestigen op het betrokken Android-toestel dat het check-in-reflectieveld met geopend toetsenbord zichtbaar en typbaar blijft, dat het scherm kan scrollen en dat geen zwart scherm meer optreedt.
- Test van Android-bestandskiezer en bestandsopslaan (Storage Access Framework, SAF) op toestel.
- Releasebuild met een lokaal beheerde keystore, plus verificatie van de APK-handtekening.
- Installatie en controle van de ondertekende release-APK op toestel.
- Herstart, achtergrond/hervatten, toetsenbord, schermformaten en light/dark mode op toestel.
- Meerweekse gebruiksscenario's en langdurige gegevensretentie.
- Aanvullende onderzoek naar de genoemde `jeep-sqlite`/Vite-`crypto`-waarschuwing.
- Play Store-publicatie, store-metadata en eventuele store-specifieke controles.

## 3. Android-praktijktest: checklist voor de debug-APK

Voer de test uit op een eigen Android-telefoon. Noteer toestelmodel, Android-versie, datum, uitkomst en eventuele foutmelding per onderdeel. Gebruik bij voorkeur eerst alleen testgegevens. Maak vóór verwijderen of opnieuw installeren een back-up van gegevens die je wilt bewaren.

### Installeren en eerste start

- [ ] Bouw de debug-APK met `npm run android:build`.
- [ ] Zoek het bestand `android\app\build\outputs\apk\debug\app-debug.apk`.
- [ ] Installeer de APK op het toestel, bijvoorbeeld met USB-debugging en `adb install -r "android\app\build\outputs\apk\debug\app-debug.apk"`, of draag de APK op een vertrouwde manier over en open deze op het toestel.
- [ ] Controleer of Android de app als De Ruwe Steen (`com.deruwesteen.app`) installeert en of de app zonder crash opent.
- [ ] Controleer de eerste database-initialisatie: dashboard en vijf standaardpijlers worden getoond; er verschijnt geen foutmelding.

### Navigatie en invoer

- [ ] Navigeer door dashboard, check-ins, gewoonten, doelen, activiteiten, reflecties, inzichten en instellingen.
- [ ] Controleer dat schermen laden, terugnavigatie werkt en er geen onverwachte lege of foutschermen zijn.
- [ ] Maak een check-in, sla die op, open deze opnieuw en wijzig deze.
- [ ] Maak een gewoonte met een schema en pijler, registreer een uitvoering en controleer de registratiegeschiedenis.
- [ ] Maak een doel, voeg waar beschikbaar deelstappen toe, wijzig voortgang/status en controleer de weergave.
- [ ] Maak een activiteit met duur en notitie en controleer dat deze terug te vinden is.
- [ ] Maak een reflectie en controleer dat de volledige tekst na opslaan opnieuw zichtbaar is.
- [ ] Controleer validatie bij lege verplichte velden en ongeldige invoer; de app mag niet stilzwijgend ongeldige gegevens opslaan.
- [ ] Controleer dat inzichten de ingevoerde testgegevens tonen en geen foutmelding geven.

### Opslaan, afsluiten en offline

- [ ] Sluit de app volledig af via Android Recents en start opnieuw; controleer dat opgeslagen gegevens behouden zijn.
- [ ] Herstart het toestel en controleer opnieuw dat de app opent en gegevens behouden zijn.
- [ ] Schakel vliegtuigmodus in en open de app; controleer navigatie, invoer, opslaan en inzichten zonder netwerkverbinding.
- [ ] Zet de app naar de achtergrond tijdens invoer, keer terug en controleer dat de app bruikbaar blijft. Controleer expliciet of nog niet opgeslagen invoer behouden blijft of duidelijk als niet-opgeslagen herkenbaar is.

### Toetsenbord, scherm en thema

- [ ] Open tekstvelden met het Android-toetsenbord; controleer dat het veld en de actieknoppen zichtbaar blijven en dat de pagina bruikbaar kan scrollen.
- [ ] Test een lange reflectie en een lange notitie; controleer invoer, scrollen, opslaan en opnieuw openen.
- [ ] Test waar mogelijk een smal scherm en grotere systeemtekst; controleer dat belangrijke inhoud en knoppen niet buiten beeld vallen.
- [ ] Test systeemthema, licht thema en donker thema via de app-instellingen; controleer leesbaarheid na navigeren en na herstart.
- [ ] Test datumweergave-instellingen en controleer dat datums consistent worden weergegeven.

### Back-up, herstel en wissen

- [ ] Exporteer een versleutelde back-up naar een locatie die je zelf kiest. Controleer dat Android de documentkiezer opent en dat het bestand wordt aangemaakt.
- [ ] Maak minstens één herkenbaar testrecord en exporteer daarna een nieuwe back-up.
- [ ] Importeer/herstel die back-up en controleer of het testrecord en de overige relevante gegevens terugkomen.
- [ ] Probeer herstel met een verkeerd wachtwoord; controleer dat dit duidelijk wordt geweigerd en dat bestaande gegevens niet veranderen.
- [ ] Test plain JSON-export alleen met testgegevens; behandel dit bestand als onversleuteld en privé.
- [ ] Voer gegevens wissen alleen uit als je testgegevens gebruikt of vooraf een bruikbare back-up hebt gemaakt. Controleer dat persoonlijke testgegevens verdwijnen en de standaardpijlers behouden blijven.
- [ ] Controleer na herstel en wissen de database-integriteitscontrole in instellingen.

### Resultaat vastleggen

- [ ] Noteer alle mislukkingen, crashes, onverwachte meldingen en stappen om ze te reproduceren.
- [ ] Herhaal mislukte checks na een eventuele correctie.
- [ ] Beoordeel SAF, offline gebruik, toetsenbord, hervatten, herstart, thema's en gegevensretentie afzonderlijk; één geslaagde flow vervangt niet de andere checks.

## 4. Release signing veilig inrichten

De signingconfiguratie in `android\app\build.gradle` leest de volgende omgevingsvariabelen:

- `DERUWESTEEN_RELEASE_STORE_FILE` — volledig pad naar de keystore.
- `DERUWESTEEN_RELEASE_STORE_PASSWORD` — keystorewachtwoord.
- `DERUWESTEEN_RELEASE_KEY_ALIAS` — alias van de signing key.
- `DERUWESTEEN_RELEASE_KEY_PASSWORD` — wachtwoord van de signing key.

### Keystore aanmaken

Maak de keystore op een vertrouwde ontwikkelmachine op een privépad **buiten de repository**. Bijvoorbeeld in PowerShell:

```powershell
keytool -genkeypair -v `
  -keystore "$HOME\deruwesteen-release.jks" `
  -alias deruwesteen `
  -keyalg RSA `
  -keysize 3072 `
  -validity 10000
```

`keytool` vraagt om de wachtwoorden en certificaatgegevens. Kies unieke sterke wachtwoorden en bewaar die in een goedgekeurde wachtwoordmanager. Maak een versleutelde, afzonderlijke reservekopie van de keystore. Verlies of wijzig de releasekey niet nadat een APK is gepubliceerd: updates moeten met een compatibele signing key worden ondertekend.

### Secrets beschermen

- Plaats de `.jks`-keystore, wachtwoorden en signingconfiguratie met secrets nooit in de repository, broncode, documentatie, screenshots, issue trackers of chat.
- Zet secrets niet in een `.env`-bestand of script dat kan worden gecommit. Een `.gitignore`-regel is geen vervanging voor het buiten de repository bewaren van secrets.
- Stel de omgevingsvariabelen lokaal in voor de buildomgeving, bij voorkeur met een goedgekeurde secrets manager. Beperk toegang tot die omgeving en voorkom dat shell-transcripts, buildlogs of CI-logs de waarden registreren.
- Deel alleen de alias en het certificaatfingerprint met mensen die die informatie nodig hebben; deel nooit de private keystore of wachtwoorden.
- Controleer vóór bouwen dat de keystore op het opgegeven pad bestaat en dat de alias klopt. `npm run android:release` hoort te stoppen wanneer een van de vereiste variabelen ontbreekt.

De precieze lokale signingstappen en omgevingsvariabelen staan ook in [ANDROID_RELEASE.md](./ANDROID_RELEASE.md).

## 5. Releaseprocedure

Voer deze procedure pas uit nadat de openstaande toestelchecks zijn afgerond:

1. **Rond de toestelchecklist af.** Leg toestel, Android-versie, testdatum en resultaten vast. Los releaseblokkerende problemen op en herhaal relevante tests.
2. **Controleer de releaseversie.** Controleer `versionName` en `versionCode` in `android\app\build.gradle`. Verhoog `versionCode` vóór iedere nieuwe gepubliceerde release; wijzig de app-identiteit niet onbedoeld.
3. **Configureer signing lokaal.** Stel de vier `DERUWESTEEN_RELEASE_*`-variabelen in de lokale buildomgeving in. Zet geen echte waarden in bestanden die door Git worden gevolgd.
4. **Voer de releasebuild uit vanuit de projectroot:**

   ```powershell
   npm run android:release
   ```

   Dit voert de webbuild uit, synchroniseert Capacitor en bouwt de release-APK. Verwacht bestand:
   `android\app\build\outputs\apk\release\app-release.apk`.

5. **Controleer het artifact.** Controleer dat het bestand bestaat en een plausibele bestandsgrootte heeft. Verifieer de APK-signature met Android SDK Build Tools:

   ```powershell
   & "$env:ANDROID_SDK_ROOT\build-tools\<build-tools-versie>\apksigner.bat" `
     verify --verbose --print-certs `
     "android\app\build\outputs\apk\release\app-release.apk"
   ```

   Gebruik het daadwerkelijk geïnstalleerde Build Tools-versienummer in plaats van `<build-tools-versie>`. Controleer dat de verificatie slaagt en dat de getoonde certificaatfingerprint overeenkomt met de verwachte releasekey. Controleer de alias/certificaatgegevens zo nodig ook met `keytool -list -v` op de keystore; geef daarvoor het wachtwoord alleen lokaal op wanneer `keytool` erom vraagt.

6. **Installeer en test de releasevariant op toestel.** Test de ondertekende APK, niet alleen de debugvariant, op een ondersteund toestel. Debug en release gebruiken verschillende signing keys; Android kan de releasevariant daarom mogelijk niet over een geïnstalleerde debugvariant heen installeren. Maak eerst een back-up van testgegevens. Als verwijderen noodzakelijk is, houd er rekening mee dat lokale appgegevens daardoor verloren kunnen gaan.
7. **Bewaar en distribueer gecontroleerd.** Bewaar de definitieve APK, de SHA-256-hash en de gebruikte releaseversie op de daarvoor goedgekeurde locatie. Bereken de hash bijvoorbeeld met:

   ```powershell
   Get-FileHash "android\app\build\outputs\apk\release\app-release.apk" -Algorithm SHA256
   ```

   Distribueer de APK pas na controle van handtekening, fingerprint, installatie en kernflows. Publicatie via een app-store vereist daarnaast de toepasselijke storecontroles.

## Referenties





### GitHub Actions CI

- Zie `.github/workflows/ci.yml`.
- Voert lint, tests, productiebuild, Capacitor sync en Android debugbuild uit bij push/pull request naar `main`.
- Debug APK wordt als artifact gepubliceerd.

### GitHub Actions releaseworkflow

- Zie `.github/workflows/release.yml`.
- Trigger: tags in de vorm `v*`.
- Bouwt een ondertekende release APK met signing key uit GitHub Secrets.
- Signing key wordt tijdelijk uit base64 gereconstrueerd en na afloop verwijderd.
- APK wordt geverifieerd met `apksigner verify`.
- Release APK wordt als asset toegevoegd aan de GitHub Release.
- Signing secrets zijn alleen beschikbaar in deze workflow.

### Releaseprocedure en versiebeheer

- Verhoog handmatig `versionCode` en `versionName` in `android/app/build.gradle` vóór iedere release.
- Maak een tag aan in de vorm `vX.Y.Z` die overeenkomt met de nieuwe `versionName`.
- De releaseworkflow controleert dat de tag overeenkomt met de ingestelde versie.
- Zie `GITHUB_RELEASES.md` voor volledige procedure en troubleshooting.

### Veiligheid

- Signing key en secrets worden nooit in de repository of artifacts opgeslagen.
- Pull requests van forks krijgen geen toegang tot signing secrets.
- Debugbuild werkt zonder signing secrets.
