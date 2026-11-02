
const baseUrl = '/api/v1'
const REQUEST_TIMEOUT = 15000

const request = async (path, token, options = {}) => {
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  }

  const controller = new AbortController()

  const timeoutId = setTimeout(() => {
    controller.abort()
  }, REQUEST_TIMEOUT)

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })

    if (!response.ok) {
      const error = new Error(`Error HTTP: ${response.status}`)
      error.status = response.status
      throw error
    }

    if (response.status === 204) {
      return null
    }

    return await response.json()
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(
        'La solicitud tardó demasiado. Comprueba tu conexión e inténtalo de nuevo.',
        { cause: error },
      )
    }

    if (error instanceof TypeError) {
      throw new Error(
        'No se pudo conectar con el servidor. Comprueba tu conexión.',
        { cause: error },
      )
    }

    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export const login = (username, password) =>
  request('/login', null, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })

export const signup = (username, password) =>
  request('/signup', null, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })

export const getChannels = (token) =>
  request('/channels', token)

export const getMessages = (token) =>
  request('/messages', token)

export const createChannel = (token, name) =>
  request('/channels', token, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })

export const renameChannel = (token, channelId, name) =>
  request(`/channels/${encodeURIComponent(channelId)}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })

export const deleteChannel = (token, channelId) =>
  request(`/channels/${encodeURIComponent(channelId)}`, token, {
    method: 'DELETE',
  })

export const sendMessage = (token, message) =>
  request('/messages', token, {
    method: 'POST',
    body: JSON.stringify(message),
  })
