import type { PropsWithChildren } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { JourneyProvider } from '../../journey/JourneyProvider'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <BrowserRouter>
      <JourneyProvider>{children}</JourneyProvider>
    </BrowserRouter>
  )
}
