interface AppHeaderProps {
  title: string
  onSettingsToggle: () => void
  settingsOpen: boolean
  onBack?: () => void
}

export function AppHeader({ title, onSettingsToggle, settingsOpen, onBack }: AppHeaderProps) {
  return (
    <header className="app-header">
      {onBack ? (
        <button type="button" className="icon-button" aria-label="Terug naar dashboard" onClick={onBack}>
          ‹
        </button>
      ) : (
        <div className="header-metadata">
          <span className="status-badge">Offline</span>
          <span className="header-caption">De Ruwe Steen</span>
        </div>
      )}
      <h1>{title}</h1>
      <button type="button" className="icon-button" aria-label={settingsOpen ? 'Sluit instellingen' : 'Open instellingen'} onClick={onSettingsToggle}>
        {settingsOpen ? '×' : '⚙'}
      </button>
    </header>
  )
}
