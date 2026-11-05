import { navigationItems, type NavigationKey } from '../types/navigation'

interface BottomNavigationProps {
  activeKey: NavigationKey
  onChange: (nextKey: NavigationKey) => void
}

export function BottomNavigation({ activeKey, onChange }: BottomNavigationProps) {
  return (
    <nav className="bottom-navigation" aria-label="Hoofdnavigatie">
      {navigationItems.map((item) => {
        const isActive = activeKey === item.key

        return (
          <button
            key={item.key}
            type="button"
            className={`nav-button ${isActive ? 'active' : ''}`}
            aria-pressed={isActive}
            onClick={() => onChange(item.key)}
          >
            <span className="nav-key">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
