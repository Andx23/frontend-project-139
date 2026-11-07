import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import NotFoundPage from './pages/NotFoundPage.jsx'
import {
  ProtectedRoute,
  LoginRoute,
  SignupRoute,
} from './components/RouteGuards.jsx'
import { createAuthStore } from './stores/authStore.js'
import { createChatStore } from './stores/chatStore.js'
import StoreProvider from './stores/StoreProvider.jsx'

const init = async (socket) => {
  const authStore = createAuthStore()
  const chatStore = createChatStore()

  return (
    <MantineProvider>
      <Notifications position="top-right" />

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
  )
}

export default init