import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppProviders } from '@/app/providers/AppProviders'
import { AppRouter } from '@/app/router'
import { registerSW } from 'virtual:pwa-register'

registerSW({
  immediate: true,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </StrictMode>,
)
