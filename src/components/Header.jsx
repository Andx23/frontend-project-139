
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/useStores.js'

function Header() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const logout = useAuthStore((state) => state.logout)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="app-header">
      <Link to="/" className="app-header-logo">
        {t('app.name')}
      </Link>

      {token && (
        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
        >
          {t('header.logout')}
        </button>
      )}
    </header>
  )
}

export default Header
