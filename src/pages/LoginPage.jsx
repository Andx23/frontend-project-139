
import { useState } from 'react'
import { useForm } from '@mantine/form'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { login } from '../api.js'
import useAuthStore from '../stores/authStore.js'
import Header from '../components/Header.jsx'

function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setCredentials = useAuthStore((state) => state.setCredentials)

  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      username: '',
      password: '',
    },
    validate: {
      username: (value) =>
        value.trim().length > 0 ? null : t('login.validation.usernameRequired'),
      password: (value) =>
        value.length > 0 ? null : t('login.validation.passwordRequired'),
    },
  })

  const handleSubmit = async (values) => {
    setServerError('')
    setLoading(true)

    try {
      const data = await login(
        values.username.trim(),
        values.password,
      )

      setCredentials(data.token, values.username.trim())
      navigate('/', { replace: true })
    } catch {
      setServerError(t('login.errors.invalidCredentials'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />

      <main className="chat-app">
        <section className="login-panel">
          <h1>{t('login.title')}</h1>
          <p>{t('login.description')}</p>

          <form
            className="login-form"
            onSubmit={form.onSubmit(handleSubmit)}
          >
            <label htmlFor="username">{t('login.username.label')}</label>
            <input
              id="username"
              placeholder={t('login.username.placeholder')}
              autoComplete="username"
              disabled={loading}
              {...form.getInputProps('username')}
            />

            {form.errors.username && (
              <p className="error-message">{form.errors.username}</p>
            )}

            <label htmlFor="password">{t('login.password.label')}</label>
            <input
              id="password"
              type="password"
              placeholder={t('login.password.placeholder')}
              autoComplete="current-password"
              disabled={loading}
              {...form.getInputProps('password')}
            />

            {form.errors.password && (
              <p className="error-message">{form.errors.password}</p>
            )}

            {serverError && (
              <p className="error-message" role="alert">
                {serverError}
              </p>
            )}

            <button type="submit" disabled={loading}>
              {loading ? t('login.loading') : t('login.submit')}
            </button>
          </form>

          <p className="auth-link">
            {t('login.signup.prompt')}{' '}
            <Link to="/signup">{t('login.signup.link')}</Link>
          </p>
        </section>
      </main>
    </>
  )
}

export default LoginPage
