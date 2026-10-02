import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './AuthProvider'
import { JourneyProvider } from './JourneyProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <JourneyProvider>{children}</JourneyProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
