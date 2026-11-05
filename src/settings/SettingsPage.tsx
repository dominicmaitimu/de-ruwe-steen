import { useEffect, useState } from 'react'
import { DATABASE_VERSION } from '../database/migrations'
import { backupRepository, type DatabaseHealth } from './backup.repository'
import {
  decryptBackup,
  getBackupSummary,
  type BackupPayload,
} from './backup.logic'
import { chooseBackupFile, saveUserFile } from './file-transfer'
import type { AppPreferences, ThemePreference } from './settings.repository'

interface SettingsPageProps {
  preferences: AppPreferences
  onThemeChange: (theme: ThemePreference) => Promise<void>
  onDateFormatChange: (format: AppPreferences['dateFormat']) => Promise<void>
  onClose: () => void
  onDataChanged: () => void
}

function messageOf(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback
  return /sqlite|sql\b|constraint|foreign key|transaction|database|table not found/i.test(error.message)
    ? fallback
    : error.message
}

function makeFileDate(): string {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function SettingsPage({ preferences, onThemeChange, onDateFormatChange, onClose, onDataChanged }: SettingsPageProps) {
  const [backupPassword, setBackupPassword] = useState('')
  const [backupConfirmation, setBackupConfirmation] = useState('')
  const [restoreFile, setRestoreFile] = useState<{ fileName: string; content: string } | null>(null)
  const [restorePassword, setRestorePassword] = useState('')
  const [restoreState, setRestoreState] = useState<{ payload: BackupPayload; schemaVersion: number; exportedAt: string } | null>(null)
  const [recoveryPassword, setRecoveryPassword] = useState('')
  const [recoveryConfirmation, setRecoveryConfirmation] = useState('')
  const [recoverySaved, setRecoverySaved] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [health, setHealth] = useState<DatabaseHealth | null>(null)
  const [healthError, setHealthError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void backupRepository.checkIntegrity().then((result) => {
      if (active) setHealth(result)
    }).catch(() => {
      if (active) setHealthError(true)
    })
    return () => { active = false }
  }, [])

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await action()
    } catch (reason) {
      setError(messageOf(reason, 'De actie kon niet worden uitgevoerd.'))
    } finally {
      setBusy(false)
    }
  }

  const createBackup = () => run(async () => {
    if (backupPassword.length < 12) throw new Error('Gebruik minimaal 12 tekens voor het wachtwoord.')
    if (backupPassword !== backupConfirmation) throw new Error('De wachtwoorden zijn niet gelijk.')
    const contents = await backupRepository.exportEncrypted(backupPassword)
    const saved = await saveUserFile(`De-Ruwe-Steen-back-up-${makeFileDate()}.deruwesteen`, contents)
    if (saved) setNotice('De versleutelde back-up is opgeslagen. Bewaar het wachtwoord apart; De Ruwe Steen kan het niet terughalen.')
    setBackupPassword('')
    setBackupConfirmation('')
  })

  const exportJson = () => run(async () => {
    if (!window.confirm('JSON-exporten zijn niet versleuteld en bevatten gevoelige gegevens. Wil je doorgaan?')) return
    const contents = await backupRepository.exportPlainJson()
    const saved = await saveUserFile(`De-Ruwe-Steen-export-${makeFileDate()}.json`, contents)
    if (saved) setNotice('De niet-versleutelde JSON-export is opgeslagen. Behandel dit bestand als gevoelige informatie.')
  })

  const pickRestoreFile = () => run(async () => {
    const selected = await chooseBackupFile()
    if (!selected) return
    setRestoreFile(selected)
    setRestorePassword('')
    setRestoreState(null)
    setRecoverySaved(false)
    setNotice('Bestand geselecteerd. Voer het back-upwachtwoord in om de inhoud te controleren.')
  })

  const inspectRestore = () => run(async () => {
    if (!restoreFile) throw new Error('Kies eerst een versleuteld back-upbestand.')
    const result = await decryptBackup(restoreFile.content, restorePassword)
    setRestoreState({ payload: result.payload, schemaVersion: result.envelope.schemaVersion, exportedAt: result.envelope.exportedAt })
    setRestorePassword('')
    setNotice('Back-up ontsleuteld en gecontroleerd. De huidige database is nog niet gewijzigd.')
  })

  const saveRecoveryPoint = () => run(async () => {
    if (!restoreState) throw new Error('Controleer eerst de geselecteerde back-up.')
    if (recoveryPassword.length < 12) throw new Error('Gebruik minimaal 12 tekens voor het herstelpuntwachtwoord.')
    if (recoveryPassword !== recoveryConfirmation) throw new Error('De wachtwoorden zijn niet gelijk.')
    const contents = await backupRepository.exportEncrypted(recoveryPassword)
    const saved = await saveUserFile(`De-Ruwe-Steen-herstelpunt-${makeFileDate()}.deruwesteen`, contents)
    if (saved) {
      setRecoverySaved(true)
      setNotice('Het versleutelde herstelpunt van je huidige gegevens is opgeslagen.')
    }
    setRecoveryPassword('')
    setRecoveryConfirmation('')
  })

  const restore = () => run(async () => {
    if (!restoreState || !recoverySaved) throw new Error('Maak eerst een versleuteld herstelpunt van de huidige gegevens.')
    if (!window.confirm('Herstellen vervangt alle huidige persoonlijke gegevens. Het gemaakte herstelpunt is nodig als je terug wilt. Wil je doorgaan?')) return
    await backupRepository.restore(restoreState.payload, restoreState.schemaVersion)
    const result = await backupRepository.checkIntegrity()
    setHealth(result)
    setHealthError(false)
    setRestoreFile(null)
    setRestoreState(null)
    setRecoverySaved(false)
    setNotice('De back-up is hersteld en de database-integriteitscontrole is geslaagd.')
    onDataChanged()
  })

  const clearData = () => run(async () => {
    if (deleteConfirmation !== 'WIS ALLE GEGEVENS') throw new Error('Typ exact “WIS ALLE GEGEVENS” om door te gaan.')
    if (!window.confirm('Dit verwijdert lokaal alle reisantwoorden, reisreflecties en voortgang, plus check-ins, gewoontes, doelen, activiteiten, reflecties en voorkeuren. Dit kan niet ongedaan worden gemaakt. Wil je alle gegevens wissen?')) return
    await backupRepository.clearPersonalData()
    setDeleteConfirmation('')
    setHealth(await backupRepository.checkIntegrity())
    setNotice('Je persoonlijke gegevens zijn verwijderd. De standaardpijlers en databasestructuur zijn behouden.')
    onDataChanged()
  })

  const verifyIntegrity = () => run(async () => {
    const result = await backupRepository.checkIntegrity()
    setHealth(result)
    if (result.integrity !== 'ok' || result.foreignKeyErrors) throw new Error('De database-integriteitscontrole heeft problemen gevonden. Er zijn geen automatische reparaties uitgevoerd.')
    setNotice('Database-integriteit is in orde; foreign keys zijn geldig.')
  })

  const summary = restoreState ? getBackupSummary(restoreState.payload) : null
  const totalRows = health ? Object.values(health.tableCounts).reduce((sum, count) => sum + count, 0) : null

  return (
    <section className="screen-section settings-page">
      <header className="settings-page-header">
        <div><p className="eyebrow">Jouw gegevens, jouw keuzes</p><h2>Instellingen</h2><p>Voorkeuren, privacy en gegevensbeheer op dit apparaat.</p></div>
        <button type="button" className="secondary-button" onClick={onClose}>Sluiten</button>
      </header>
      {error ? <div className="inline-error" role="alert">{error}</div> : null}
      {notice ? <div className="success-message" role="status">{notice}</div> : null}

      <section className="content-card settings-card">
        <h3>Persoonlijk</h3>
        <label className="habit-field">Thema<select disabled={busy} value={preferences.theme} onChange={(event) => void run(() => onThemeChange(event.currentTarget.value as ThemePreference))}><option value="system">Systeeminstelling</option><option value="light">Licht</option><option value="dark">Donker</option></select></label>
        <label className="habit-field">Datumweergave<select disabled={busy} value={preferences.dateFormat} onChange={(event) => void run(() => onDateFormatChange(event.currentTarget.value as AppPreferences['dateFormat']))}><option value="localized">Nederlands (bijv. 30 okt 2026)</option><option value="iso">ISO (bijv. 2026-10-30)</option></select></label>
        <p className="settings-note">Datums worden lokaal weergegeven. Tijden volgen de tijdzone en klokinstelling van je apparaat.</p>
      </section>

      <section className="content-card settings-card">
        <h3>Gegevensbeheer</h3>
        <p>Een beveiligde back-up bevat je volledige lokale SQLite-database, inclusief reisantwoorden en reflecties, check-ins, gewoontes, doelen, activiteiten, pijlerkoppelingen en instellingen.</p>
        <form className="settings-form" onSubmit={(event) => { event.preventDefault(); void createBackup() }}>
          <label className="habit-field">Wachtwoord voor back-up<input type="password" autoComplete="new-password" minLength={12} required value={backupPassword} onChange={(event) => setBackupPassword(event.currentTarget.value)} /></label>
          <label className="habit-field">Wachtwoord herhalen<input type="password" autoComplete="new-password" minLength={12} required value={backupConfirmation} onChange={(event) => setBackupConfirmation(event.currentTarget.value)} /></label>
          <button type="submit" className="primary-button" disabled={busy}>Versleutelde .deruwesteen-back-up maken</button>
        </form>
        <p className="settings-note">Het wachtwoord wordt niet opgeslagen. Bewaar het apart; zonder wachtwoord kan een back-up niet worden hersteld.</p>
        <button type="button" className="secondary-button" disabled={busy} onClick={() => void exportJson()}>Niet-versleutelde JSON exporteren…</button>
        <p className="settings-warning">JSON bevat leesbare persoonlijke en mogelijk gevoelige informatie. Exporteer alleen naar een locatie die je vertrouwt.</p>

        <h4>Back-up herstellen</h4>
        {!restoreFile ? <button type="button" className="secondary-button" disabled={busy} onClick={() => void pickRestoreFile()}>.deruwesteen-bestand kiezen…</button> : (
          <div className="settings-restore">
            <p className="settings-note">Geselecteerd: {restoreFile.fileName}</p>
            {!restoreState ? <form className="settings-form" onSubmit={(event) => { event.preventDefault(); void inspectRestore() }}>
              <label className="habit-field">Back-upwachtwoord<input type="password" autoComplete="current-password" required value={restorePassword} onChange={(event) => setRestorePassword(event.currentTarget.value)} /></label>
              <button type="submit" className="secondary-button" disabled={busy}>Wachtwoord controleren</button>
            </form> : (
              <>
                <p className="settings-note">Back-upversie {restoreState.schemaVersion} · gemaakt op {restoreState.exportedAt}</p>
                <ul className="settings-counts">
                  <li>{summary?.checkIns} check-ins</li><li>{summary?.habits} gewoontes</li><li>{summary?.habitEntries} gewoonteregistraties</li>
                  <li>{summary?.goals} doelen</li><li>{summary?.activities} activiteiten</li><li>{summary?.reflections} reflecties</li>
                </ul>
                {!recoverySaved ? <form className="settings-form" onSubmit={(event) => { event.preventDefault(); void saveRecoveryPoint() }}>
                  <p className="settings-warning">Voordat gegevens worden vervangen, sla je een versleuteld herstelpunt van de huidige database op.</p>
                  <label className="habit-field">Wachtwoord voor herstelpunt<input type="password" autoComplete="new-password" minLength={12} required value={recoveryPassword} onChange={(event) => setRecoveryPassword(event.currentTarget.value)} /></label>
                  <label className="habit-field">Wachtwoord herhalen<input type="password" autoComplete="new-password" minLength={12} required value={recoveryConfirmation} onChange={(event) => setRecoveryConfirmation(event.currentTarget.value)} /></label>
                  <button type="submit" className="secondary-button" disabled={busy}>Huidige gegevens als herstelpunt bewaren</button>
                </form> : <button type="button" className="danger-button" disabled={busy} onClick={() => void restore()}>Herstellen en huidige gegevens vervangen</button>}
              </>
            )}
            <button type="button" className="text-button" disabled={busy} onClick={() => { setRestoreFile(null); setRestoreState(null); setRecoverySaved(false); setRestorePassword('') }}>Bestand sluiten</button>
          </div>
        )}

        <h4>Databasegegevens</h4>
        <div className="settings-info-grid">
          <span>Schema</span><strong>Versie {DATABASE_VERSION}</strong>
          <span>Lokale tabellen</span><strong>{health ? Object.keys(health.tableCounts).length : '—'}</strong>
          <span>Rijen in tabellen</span><strong>{totalRows ?? '—'}</strong>
          <span>SQLite-controle</span><strong>{health?.integrity ?? (healthError ? 'Controle mislukt' : 'Nog niet gecontroleerd')}</strong>
          <span>Foreign key-controle</span><strong>{health ? `${health.foreignKeyErrors} fouten` : 'Nog niet gecontroleerd'}</strong>
        </div>
        {health ? <details className="settings-table-counts"><summary>Rijaantallen per tabel</summary><ul>{Object.entries(health.tableCounts).map(([table, count]) => <li key={table}><span>{table}</span><strong>{count}</strong></li>)}</ul></details> : null}
        <button type="button" className="secondary-button" disabled={busy} onClick={() => void verifyIntegrity()}>Integriteit opnieuw controleren</button>

        <h4>Persoonlijke gegevens wissen</h4>
        <p className="settings-warning">Dit is onomkeerbaar. Maak eerst een versleutelde back-up als je gegevens later wilt kunnen herstellen.</p>
        <form className="settings-form" onSubmit={(event) => { event.preventDefault(); void clearData() }}>
          <label className="habit-field">Typ WIS ALLE GEGEVENS om te bevestigen<input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.currentTarget.value)} /></label>
          <button type="submit" className="danger-button" disabled={busy || deleteConfirmation !== 'WIS ALLE GEGEVENS'}>Alle persoonlijke gegevens wissen</button>
        </form>
      </section>

      <section className="content-card settings-card">
        <h3>Privacy en beveiliging</h3>
        <ul className="settings-list"><li>Gegevens blijven in de lokale appdatabase; er is geen analytics of externe API-koppeling.</li><li>De Android-bestandskiezer geeft alleen toegang tot het bestand dat je zelf kiest.</li><li>App-vergrendeling en biometrische toegang zijn momenteel niet ingeschakeld: de bestaande database is niet versleuteld en een veilige migratie vereist een afzonderlijke sleutel- en herstelstrategie.</li></ul>
      </section>

      <section className="content-card settings-card">
        <h3>Over De Ruwe Steen</h3>
        <div className="settings-info-grid"><span>Applicatie</span><strong>De Ruwe Steen</strong><span>Versie</span><strong>1.0.0</strong><span>Application ID</span><strong>com.deruwesteen.app</strong></div>
        <p className="settings-note">Android buildnummer: 1. De app werkt offline; de Android WebView gebruikt de lokale Capacitor-brug.</p>
      </section>
    </section>
  )
}
