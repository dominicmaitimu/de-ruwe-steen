import type { ReactNode } from 'react'
import { AppHeader } from '../components/AppHeader'
import { BottomNavigation } from '../components/BottomNavigation'
import type { NavigationKey } from '../types/navigation'

interface AppLayoutProps {
  activeKey: NavigationKey
  onNavigationChange: (nextKey: NavigationKey) => void
  onSettingsToggle: () => void
  onBack?: () => void
  settingsOpen: boolean
  title: string
  children: ReactNode
}

export function AppLayout({
  activeKey,
  onNavigationChange,
  onSettingsToggle,
  onBack,
  settingsOpen,
  title,
  children,
}: AppLayoutProps) {
  return (
    <div className="app-shell">
      <div className="mobile-frame">
        <AppHeader title={title} onSettingsToggle={onSettingsToggle} settingsOpen={settingsOpen} onBack={onBack} />
        <main className="content-area">{children}</main>
        <BottomNavigation activeKey={activeKey} onChange={onNavigationChange} />
      </div>
    </div>
  )
}
