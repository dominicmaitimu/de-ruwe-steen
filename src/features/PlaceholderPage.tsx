import type { NavigationKey } from '../types/navigation'

interface PlaceholderPageProps {
  page: NavigationKey
}

export function PlaceholderPage({ page }: PlaceholderPageProps) {
  switch (page) {
    case 'development':
      return (
        <section className="screen-section">
          <div className="hero-card accent">
            <p className="eyebrow">Jouw keuze</p>
            <h2>Gewoontes</h2>
            <p>Zelfgekozen activiteiten kunnen helpen om aandacht te geven aan wat voor jou belangrijk is.</p>
          </div>

          <div className="info-grid">
            <article className="info-card">
              <span className="metric-label">Frequentie</span>
              <strong>Flexibel</strong>
              <p>Kies dagen en aantallen die bij jouw ritme passen.</p>
            </article>
            <article className="info-card">
              <span className="metric-label">Registraties</span>
              <strong>Lokaal</strong>
              <p>Je gegevens blijven op dit apparaat beschikbaar.</p>
            </article>
          </div>
        </section>
      )
    case 'activities':
      return (
        <section className="screen-section">
          <div className="list-card">
            <h2>Activiteiten</h2>
            <ul className="list-stack">
              <li><span>Start project</span><strong>✓</strong></li>
              <li><span>Capacitor instellen</span><strong>✓</strong></li>
              <li><span>SQLite basis openen</span><strong>✓</strong></li>
              <li><span>Navigatie bouwen</span><strong>✓</strong></li>
            </ul>
          </div>
        </section>
      )
    case 'reflection':
      return (
        <section className="screen-section">
          <div className="list-card">
            <h2>Reflectie</h2>
            <p className="muted-copy">De eerste pass is gericht op een rustige, betrouwbare basis. Er is bewust gekozen voor een eenvoudige en onderhoudbare structuur.</p>
            <div className="quote-box">
              “Eenvoud creëren maakt consistentie mogelijk.”
            </div>
          </div>
        </section>
      )
    case 'insights':
      return (
        <section className="screen-section">
          <div className="info-grid">
            <article className="info-card">
              <span className="metric-label">Systeem</span>
              <strong>Light / dark</strong>
              <p>De thematische stijl volgt automatisch de apparaatinstelling.</p>
            </article>
            <article className="info-card">
              <span className="metric-label">Offline</span>
              <strong>Beschikbaar</strong>
              <p>Geen backend is nodig om voort te kunnen werken.</p>
            </article>
          </div>
        </section>
      )
    case 'home':
    default:
      return (
        <section className="screen-section">
          <div className="hero-card">
            <p className="eyebrow">De Ruwe Steen</p>
            <h2>De basis is online</h2>
            <p>Een lokale, rustige mobiele ervaring voor reflectie, ontwikkeling en activiteiten.</p>
          </div>

          <div className="stats-grid">
            <article className="stat-card">
              <span className="metric-label">Focus</span>
              <strong>3</strong>
            </article>
            <article className="stat-card">
              <span className="metric-label">Status</span>
              <strong>Stable</strong>
            </article>
            <article className="stat-card">
              <span className="metric-label">Data</span>
              <strong>SQLite</strong>
            </article>
          </div>

          <div className="list-card">
            <h2>Vandaag</h2>
            <ul className="list-stack">
              <li><span>Projectstructuur controleren</span><strong>✓</strong></li>
              <li><span>Databasebasis valideren</span><strong>✓</strong></li>
              <li><span>Android-ondersteuning voorbereiden</span><strong>✓</strong></li>
            </ul>
          </div>
        </section>
      )
  }
}
