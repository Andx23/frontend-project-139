
const baseUrl = '/api/v1'

const request = async (path, token, options = {}) => {
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    throw new Error(`Error HTTP: ${response.status}`)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export const login = (username, password) =>
  request('/login', null, {
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

export const sendMessage = (token, message) =>
  request('/messages', token, {
    method: 'POST',
    body: JSON.stringify(message),
  })
