import { createRoot } from 'react-dom/client'
import { io } from 'socket.io-client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import * as Sentry from '@sentry/react'

import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import './i18n/index.js'

import init from './init.jsx'

// Inicializar el seguimiento de errores con Bugsink.
const dsn = import.meta.env.VITE_BUGSINK_DSN
if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  })
}

const queryClient = new QueryClient()

const app = async () => {
  const socket = io({
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  })

  const root = createRoot(document.querySelector('#root'), {
    onUncaughtError: Sentry.reactErrorHandler(),
    onCaughtError: Sentry.reactErrorHandler(),
    onRecoverableError: Sentry.reactErrorHandler(),
  })

  root.render(
    <MantineProvider>
      <Notifications position="top-right" />

      <QueryClientProvider client={queryClient}>
        {await init(socket)}
      </QueryClientProvider>
    </MantineProvider>,
  )
}

app()
