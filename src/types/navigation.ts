export type NavigationKey = 'home' | 'development' | 'activities' | 'reflection' | 'insights'

export interface NavigationItem {
  key: NavigationKey
  label: string
  description: string
}

export const navigationItems: NavigationItem[] = [
  { key: 'home', label: 'Home', description: 'Samenvatting en focus' },
  { key: 'development', label: 'Ontwikkeling', description: 'Persoonlijke doelen en gewoontes' },
  { key: 'activities', label: 'Activiteiten', description: 'Dagelijkse acties' },
  { key: 'reflection', label: 'Reflectie', description: 'Herinneringen en balans' },
  { key: 'insights', label: 'Inzichten', description: 'Patronen en overzicht' },
]

export const navigationLookup = navigationItems.reduce<Record<NavigationKey, NavigationItem>>((accumulator, item) => {
  accumulator[item.key] = item
  return accumulator
}, {} as Record<NavigationKey, NavigationItem>)
