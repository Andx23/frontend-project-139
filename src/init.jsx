
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import './i18n/index.js'
import NotFoundPage from './pages/NotFoundPage.jsx'
import {
  ProtectedRoute,
  LoginRoute,
  SignupRoute,
} from './components/RouteGuards.jsx'
import { createAuthStore } from './stores/authStore.js'
import { createChatStore } from './stores/chatStore.js'
import StoreProvider from './stores/StoreProvider.jsx'

const queryClient = new QueryClient()

const init = async (socket) => {
  const authStore = createAuthStore()
  const chatStore = createChatStore()

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <Notifications
          position="top-right"
          withinPortal={false}
        />

        <StoreProvider
          authStore={authStore}
          chatStore={chatStore}
        >
          <BrowserRouter>
            <Routes>
              <Route
                path="/"
                element={<ProtectedRoute socket={socket} />}
              />

              <Route
                path="/login"
                element={<LoginRoute />}
              />

              <Route
                path="/signup"
                element={<SignupRoute />}
              />

              <Route
                path="*"
                element={<NotFoundPage />}
              />
            </Routes>
          </BrowserRouter>
        </StoreProvider>
      </MantineProvider>
    </QueryClientProvider>
  )
}

export default init
