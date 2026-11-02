
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import NotFoundPage from './pages/NotFoundPage.jsx'
import {
  ProtectedRoute,
  LoginRoute,
  SignupRoute,
} from './components/RouteGuards.jsx'

const init = async (socket) => {
  return (
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
  )
}

export default init

