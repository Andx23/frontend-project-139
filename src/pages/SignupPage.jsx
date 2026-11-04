
import { useState } from 'react'
import { useForm } from '@mantine/form'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { signup } from '../api.js'
import { useAuthStore } from '../stores/useStores.js'
import Header from '../components/Header.jsx'

function SignupPage() {
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
      passwordConfirmation: '',
    },
    validate: {
      username: (value) => {
        const username = value.trim()

        if (!username) {
          return t('signup.validation.usernameRequired')
        }

        if (username.length < 3 || username.length > 20) {
          return t('signup.validation.usernameLength')
        }

        return null
      },
      password: (value) => {
        if (!value) {
          return t('signup.validation.passwordRequired')
        }

        if (value.length < 6) {
          return t('signup.validation.passwordLength')
        }

        return null
      },
      passwordConfirmation: (value, values) => {
        if (!value) {
          return t('signup.validation.confirmationRequired')
        }

        if (value !== values.password) {
          return t('signup.validation.passwordMismatch')
        }

        return null
      },
    },
  })

  const handleSubmit = async (values) => {
    if (loading) return

    setServerError('')
    setLoading(true)

    try {
      const username = values.username.trim()
      const data = await signup(username, values.password)

      setCredentials(data.token, data.username)
      navigate('/', { replace: true })
    } catch (error) {
      if (error.status === 409) {
        setServerError(t('signup.errors.usernameExists'))
      } else {
        setServerError(
          error.message || t('signup.errors.registrationFailed'),
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />

      <main className="chat-app">
        <section className="login-panel">
          <h1>{t('signup.title')}</h1>
          <p>{t('signup.description')}</p>

          <form
            className="login-form"
            onSubmit={form.onSubmit(handleSubmit)}
          >
            <label htmlFor="signup-username">
              {t('signup.username.label')}
            </label>

            <input
              id="signup-username"
              placeholder={t('signup.username.placeholder')}
              autoComplete="username"
              minLength={3}
              maxLength={20}
              disabled={loading}
              {...form.getInputProps('username')}
            />

            {form.errors.username && (
              <p className="field-error" role="alert">
                {form.errors.username}
              </p>
            )}

            <label htmlFor="signup-password">
              {t('signup.password.label')}
            </label>

            <input
              id="signup-password"
              type="password"
              placeholder={t('signup.password.placeholder')}
              autoComplete="new-password"
              minLength={6}
              disabled={loading}
              {...form.getInputProps('password')}
            />

            {form.errors.password && (
              <p className="field-error" role="alert">
                {form.errors.password}
              </p>
            )}

            <label htmlFor="signup-password-confirmation">
              {t('signup.confirmation.label')}
            </label>

            <input
              id="signup-password-confirmation"
              type="password"
              placeholder={t('signup.confirmation.placeholder')}
              autoComplete="new-password"
              disabled={loading}
              {...form.getInputProps('passwordConfirmation')}
            />

            {form.errors.passwordConfirmation && (
              <p className="field-error" role="alert">
                {form.errors.passwordConfirmation}
              </p>
            )}

            {serverError && (
              <p className="error-message" role="alert">
                {serverError}
              </p>
            )}

            <button type="submit" disabled={loading}>
              {loading ? t('signup.loading') : t('signup.submit')}
            </button>
          </form>
        </section>
      </main>
    </>
  )
}

export default SignupPage
