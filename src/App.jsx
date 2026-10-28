
import { useEffect, useRef, useState } from 'react'
import {
  createChannel,
  getChannels,
  getMessages,
  login,
  sendMessage,
} from './api.js'
import './App.css'

function App({ socket }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [channels, setChannels] = useState([])
  const [messages, setMessages] = useState([])
  const [activeChannel, setActiveChannel] = useState(null)
  const [messageText, setMessageText] = useState('')
  const [newChannelName, setNewChannelName] = useState('')
  const [showChannelForm, setShowChannelForm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [creatingChannel, setCreatingChannel] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (!token) return

    getChannels(token)
      .then(setChannels)
      .catch(() => setError('No se pudieron cargar los canales.'))

    getMessages(token)
      .then(setMessages)
      .catch(() => setError('No se pudieron cargar los mensajes.'))
  }, [token])

  useEffect(() => {
    const handleNewChannel = (channel) => {
      setChannels((current) => {
        if (current.some((item) => item.id === channel.id)) {
          return current
        }

        return [...current, channel]
      })
    }

    const handleNewMessage = (message) => {
      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) {
          return current
        }

        return [...current, message]
      })
    }

    socket.on('newChannel', handleNewChannel)
    socket.on('newMessage', handleNewMessage)

    return () => {
      socket.off('newChannel', handleNewChannel)
      socket.off('newMessage', handleNewMessage)
    }
  }, [socket])

  const visibleMessages = messages.filter(
    (message) => message.channelId === activeChannel?.id,
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChannel?.id, visibleMessages.length])

  const handleLogin = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await login(username, password)
      setToken(result.token)
    } catch {
      setError('No se pudo iniciar sesión. Revisa tus credenciales.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateChannel = async (event) => {
    event.preventDefault()

    const name = newChannelName.trim()

    if (!name) return

    setError('')
    setCreatingChannel(true)

    try {
      const channel = await createChannel(token, name)

      setChannels((current) => {
        if (current.some((item) => item.id === channel.id)) {
          return current
        }

        return [...current, channel]
      })

      setActiveChannel(channel)
      setNewChannelName('')
      setShowChannelForm(false)
    } catch {
      setError('No se pudo crear el canal. Inténtalo de nuevo.')
    } finally {
      setCreatingChannel(false)
    }
  }

  const handleSendMessage = async (event) => {
    event.preventDefault()

    const body = messageText.trim()

    if (!body || !activeChannel) return

    setError('')

    try {
      await sendMessage(token, {
        body,
        channelId: activeChannel.id,
        username,
      })

      setMessageText('')
    } catch {
      setError('No se pudo enviar el mensaje.')
    }
  }

  if (!token) {
    return (
      <main className="chat-app">
        <section className="login-panel">
          <h1>Chat App</h1>
          <p>Inicia sesión para acceder a tus conversaciones.</p>

          <form className="login-form" onSubmit={handleLogin}>
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />

            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>

          {error && <p className="error-message">{error}</p>}
        </section>
      </main>
    )
  }

  return (
    <main className="chat-app">
      <aside className="sidebar">
        <header className="sidebar-header">
          <h1>Chat App</h1>

          <button
            type="button"
            className="new-chat-button"
            onClick={() => {
              setShowChannelForm((current) => !current)
              setError('')
            }}
          >
            {showChannelForm ? 'Cancelar' : '+ Nuevo canal'}
          </button>
        </header>

        {showChannelForm && (
          <form className="new-channel-form" onSubmit={handleCreateChannel}>
            <label htmlFor="new-channel-name">Nombre del canal</label>
            <input
              id="new-channel-name"
              value={newChannelName}
              onChange={(event) => setNewChannelName(event.target.value)}
              placeholder="Ej. videojuegos"
              maxLength={50}
              required
            />

            <button type="submit" disabled={creatingChannel}>
              {creatingChannel ? 'Creando...' : 'Crear canal'}
            </button>
          </form>
        )}

        <nav className="conversation-list" aria-label="Conversaciones">
          {channels.map((channel) => (
            <button
              type="button"
              className={`channel-button ${
                activeChannel?.id === channel.id ? 'active' : ''
              }`}
              key={channel.id}
              onClick={() => setActiveChannel(channel)}
            >
              # {channel.name}
            </button>
          ))}
        </nav>
      </aside>

      <section className="chat-panel">
        <header className="chat-header">
          <h2>
            {activeChannel
              ? `# ${activeChannel.name}`
              : `Bienvenido, ${username}`}
          </h2>

          <p>
            {activeChannel
              ? 'Conversación en tiempo real'
              : 'Selecciona una conversación para comenzar.'}
          </p>
        </header>

        <div className="messages-area">
          {activeChannel ? (
            <>
              <div className="message-list">
                {visibleMessages.map((message) => (
                  <article
                    className={`message-item ${
                      message.username === username ? 'own-message' : ''
                    }`}
                    key={message.id}
                  >
                    <strong>{message.username || 'Usuario'}</strong>
                    <p>{message.body}</p>
                    <time>
                      {message.createdAt
                        ? new Date(message.createdAt).toLocaleTimeString(
                            'es-CO',
                            { hour: '2-digit', minute: '2-digit' },
                          )
                        : 'Hora no disponible'}
                    </time>
                  </article>
                ))}

                {visibleMessages.length === 0 && (
                  <p className="welcome-message">
                    Todavía no hay mensajes en este canal.
                  </p>
                )}

                <div ref={messagesEndRef} />
              </div>

              <form className="message-form" onSubmit={handleSendMessage}>
                <input
                  aria-label="Escribe un mensaje"
                  placeholder="Escribe un mensaje..."
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  required
                />

                <button type="submit" disabled={!messageText.trim()}>
                  Enviar
                </button>
              </form>
            </>
          ) : (
            <p className="welcome-message">
              Selecciona un canal para ver y enviar mensajes.
            </p>
          )}
        </div>

        {error && <p className="error-message">{error}</p>}
      </section>
    </main>
  )
}

export default App
