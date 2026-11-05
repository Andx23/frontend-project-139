
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
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { login } from '../api.js'
import { useAuthStore } from '../stores/useStores.js'
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
        value.trim().length > 0
          ? null
          : t('login.validation.usernameRequired'),
      password: (value) =>
        value.length > 0
          ? null
          : t('login.validation.passwordRequired'),
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

      <Container size={420} py="xl">
        <Paper withBorder shadow="md" radius="md" p="xl">
          <Stack gap="md">
            <Title order={1} ta="center" size="h2">
              {t('login.title')}
            </Title>

            <Text c="dimmed" size="sm" ta="center">
              {t('login.description')}
            </Text>

            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack gap="sm">
                <TextInput
                  label={t('login.username.label')}
                  placeholder={t('login.username.placeholder')}
                  autoComplete="username"
                  disabled={loading}
                  {...form.getInputProps('username')}
                />

                <PasswordInput
                  label={t('login.password.label')}
                  placeholder={t('login.password.placeholder')}
                  autoComplete="current-password"
                  disabled={loading}
                  {...form.getInputProps('password')}
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
                  {t('login.submit')}
                </Button>
              </Stack>
            </form>

            <Text size="sm" ta="center">
              {t('login.signup.prompt')}{' '}
              <Text component={Link} to="/signup" c="blue" inherit>
                {t('login.signup.link')}
              </Text>
            </Text>
          </Stack>
        </Paper>
      </Container>
    </>
  )
}

export default LoginPage
