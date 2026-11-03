
import * as Sentry from '@sentry/react'

function BugsinkTest() {
  const handleTestError = () => {
    Sentry.captureException(
      new Error('INSEPTION Chat - Error de prueba de Bugsink'),
    )
  }

  return (
    <button type="button" onClick={handleTestError}>
      Enviar error de prueba a Bugsink
    </button>
  )
}

export default BugsinkTest
