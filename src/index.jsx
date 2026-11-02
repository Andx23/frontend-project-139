
import { createRoot } from 'react-dom/client'
import { io } from 'socket.io-client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import './i18n/index.js'
import init from './init.jsx'

const queryClient = new QueryClient()

const app = async () => {
  const socket = io({
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  })

  const root = createRoot(document.querySelector('#root'))

  root.render(
    <QueryClientProvider client={queryClient}>
      {await init(socket)}
    </QueryClientProvider>,
  )
}

app()
