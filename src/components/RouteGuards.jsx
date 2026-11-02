
import { Navigate } from 'react-router-dom'
import App from '../App.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import SignupPage from '../pages/SignupPage.jsx'
import useAuthStore from '../stores/authStore.js'

export function ProtectedRoute({ socket }) {
  const token = useAuthStore((state) => state.token)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <App socket={socket} />
}

export function PublicRoute({ children }) {
  const token = useAuthStore((state) => state.token)

  if (token) {
    return <Navigate to="/" replace />
  }

  return children
}

export function LoginRoute() {
  return (
    <PublicRoute>
      <LoginPage />
    </PublicRoute>
  )
}

export function SignupRoute() {
  return (
    <PublicRoute>
      <SignupPage />
    </PublicRoute>
  )
}
