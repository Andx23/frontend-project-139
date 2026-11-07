
import { useState } from 'react'
import {
  Button,
  Container,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
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

      <Container size={460} py="xl">
        <Paper withBorder shadow="md" radius="md" p="xl">
          <Stack gap="md">
            <Title order={1} size="h2" ta="center">
              {t('signup.title')}
            </Title>

            <Text c="dimmed" size="sm" ta="center">
              {t('signup.description')}
            </Text>

            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack gap="sm">
                <TextInput
                  key={form.key('username')}
                  label={t('signup.username.label')}
                  placeholder={t('signup.username.placeholder')}
                  autoComplete="username"
                  disabled={loading}
                  {...form.getInputProps('username')}
                />

                <PasswordInput
                  key={form.key('password')}
                  label={t('signup.password.label')}
                  placeholder={t('signup.password.placeholder')}
                  autoComplete="new-password"
                  disabled={loading}
                  {...form.getInputProps('password')}
                />

                <PasswordInput
                  key={form.key('passwordConfirmation')}
                  label={t('signup.confirmation.label')}
                  placeholder={t('signup.confirmation.placeholder')}
                  autoComplete="new-password"
                  disabled={loading}
                  {...form.getInputProps('passwordConfirmation')}
                />

                {serverError && (
                  <Text c="red" size="sm" role="alert">
                    {serverError}
                  </Text>
                )}

                <Button
                  type="submit"
                  fullWidth
                  loading={loading}
                >
                  {t('signup.submit')}
                </Button>
              </Stack>
            </form>
          </Stack>
        </Paper>
      </Container>
    </>
  )
}

export default SignupPage
