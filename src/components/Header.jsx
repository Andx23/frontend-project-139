
import { Anchor, Button, Container, Group } from '@mantine/core'
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
    <Container size="xl" py="md">
      <Group justify="space-between" align="center">
        <Anchor
          component={Link}
          to="/"
          size="lg"
          fw={700}
          underline="never"
          c="dark"
        >
          {t('app.name')}
        </Anchor>

        {token && (
          <Button
            type="button"
            variant="light"
            color="red"
            onClick={handleLogout}
          >
            {t('header.logout')}
          </Button>
        )}
      </Group>
    </Container>
  )
}

export default Header
