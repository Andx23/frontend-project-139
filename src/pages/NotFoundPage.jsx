import {
  Anchor,
  Container,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header.jsx'

function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <>
      <Header />

      <Container size="sm" py="xl">
        <Paper withBorder shadow="sm" radius="md" p="xl">
          <Stack gap="md" align="center">
            <Title order={1} ta="center">
              {t('notFound.title')}
            </Title>

            <Text c="dimmed" ta="center">
              {t('notFound.description')}
            </Text>

            <Anchor component={Link} to="/">
              {t('notFound.backHome')}
            </Anchor>
          </Stack>
        </Paper>
      </Container>
    </>
  )
}

export default NotFoundPage