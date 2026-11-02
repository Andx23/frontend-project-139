import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header.jsx'

function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <>
      <Header />

      <main className="chat-app">
        <section className="login-panel">
          <h1>{t('notFound.title')}</h1>
          <p>{t('notFound.description')}</p>
          <Link to="/">{t('notFound.backHome')}</Link>
        </section>
      </main>
    </>
  )
}

export default NotFoundPage