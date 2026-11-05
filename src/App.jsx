import { useEffect, useRef, useState } from 'react'
import {
  Button,
  Flex,
  Group,
  Menu,
  Paper,
  Stack,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm, hasLength, isNotEmpty } from '@mantine/form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { notifications } from '@mantine/notifications'
import {
  createChannel,
  deleteChannel,
  getChannels,
  getMessages,
  renameChannel,
  sendMessage,
} from './api.js'
import {
  useAuthStore,
  useChatStore,
} from './stores/useStores.js'
import filterProfanity from './profanity.js'
import Header from './components/Header.jsx'
import './App.css'

function App({ socket }) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const token = useAuthStore((state) => state.token)
  const username = useAuthStore((state) => state.username)

  const activeChannel = useChatStore((state) => state.activeChannel)
  const setActiveChannel = useChatStore(
    (state) => state.setActiveChannel,
  )

  const [messageText, setMessageText] = useState('')
  const [showChannelForm, setShowChannelForm] = useState(false)
  const [editingChannel, setEditingChannel] = useState(null)
  const [channelToDelete, setChannelToDelete] = useState(null)
  const [openMenuChannelId, setOpenMenuChannelId] = useState(null)
  const [error, setError] = useState('')
  const [creatingChannel, setCreatingChannel] = useState(false)
  const [renamingChannel, setRenamingChannel] = useState(false)
  const [deletingChannel, setDeletingChannel] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)

  const [connectionStatus, setConnectionStatus] = useState(() => {
    if (!navigator.onLine) return 'disconnected'
    return socket.connected ? 'connected' : 'connecting'
  })

  const messagesEndRef = useRef(null)
  const channelInputRef = useRef(null)
  const renameInputRef = useRef(null)

  const {
    data: channels = [],
    isLoading: channelsLoading,
    isError: channelsError,
  } = useQuery({
    queryKey: ['channels'],
    queryFn: () => getChannels(token),
    enabled: Boolean(token),
  })

  const {
    data: messages = [],
    isLoading: messagesLoading,
    isError: messagesError,
  } = useQuery({
    queryKey: ['messages'],
    queryFn: () => getMessages(token),
    enabled: Boolean(token),
  })

  // Notificar errores al cargar los datos.
  useEffect(() => {
    if (channelsError || messagesError) {
      notifications.show({
        id: 'chat-load-error',
        title: t('notifications.errorTitle'),
        message: t('notifications.loadError'),
        color: 'red',
      })
    }
  }, [channelsError, messagesError, t])

  // Notificar si la aplicación inicia sin conexión.
  useEffect(() => {
    if (!navigator.onLine) {
      notifications.show({
        id: 'network-offline',
        title: t('notifications.warningTitle'),
        message: t('notifications.noConnection'),
        color: 'yellow',
      })
    }
  }, [t])

  // Validación compartida para crear y renombrar canales.
  const validateChannelName = (value, channelId = null) => {
    const normalizedValue = value.trim()

    const requiredError = isNotEmpty(
      t('chat.validation.channelRequired'),
    )(normalizedValue)

    if (requiredError) return requiredError

    const lengthError = hasLength(
      { min: 3, max: 20 },
      t('chat.validation.channelLength'),
    )(normalizedValue)

    if (lengthError) return lengthError

    const channelExists = channels.some(
      (channel) =>
        channel.id !== channelId
        && channel.name.trim().toLowerCase()
          === normalizedValue.toLowerCase(),
    )

    if (channelExists) {
      return t('chat.validation.channelExists')
    }

    return null
  }

  const channelForm = useForm({
    mode: 'controlled',
    initialValues: { name: '' },
    validate: {
      name: (value) => validateChannelName(value),
    },
  })

  const renameForm = useForm({
    mode: 'controlled',
    initialValues: { name: '' },
    validate: {
      name: (value) =>
        validateChannelName(value, editingChannel?.id),
    },
  })

  // Enfocar los campos cuando se abren los formularios.
  useEffect(() => {
    if (showChannelForm) {
      channelInputRef.current?.focus()
    }
  }, [showChannelForm])

  useEffect(() => {
    if (editingChannel) {
      renameInputRef.current?.focus()
    }
  }, [editingChannel])

  // Cerrar el modal de renombramiento con Escape.
  useEffect(() => {
    if (!editingChannel) return undefined

    const handleEscape = (event) => {
      if (event.key === 'Escape' && !renamingChannel) {
        setEditingChannel(null)
        renameForm.reset()
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [editingChannel, renamingChannel, renameForm])

  // Cerrar el modal de eliminación con Escape.
  useEffect(() => {
    if (!channelToDelete) return undefined

    const handleEscape = (event) => {
      if (event.key === 'Escape' && !deletingChannel) {
        setChannelToDelete(null)
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [channelToDelete, deletingChannel])

  // Seleccionar general si el canal activo deja de existir.
  useEffect(() => {
    if (channels.length === 0) return

    const selectedChannelExists = channels.some(
      (channel) => channel.id === activeChannel?.id,
    )

    if (!selectedChannelExists) {
      const generalChannel = channels.find(
        (channel) => channel.name === 'general',
      )

      setActiveChannel(generalChannel || channels[0])
    }
  }, [channels, activeChannel, setActiveChannel])

  // Conexión del navegador y Socket.IO.
  useEffect(() => {
    const handleConnect = () => {
      if (!navigator.onLine) {
        setConnectionStatus('disconnected')
        return
      }

      setConnectionStatus('connected')
      notifications.hide('network-offline')
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    }

    const handleDisconnect = () => {
      setConnectionStatus(
        navigator.onLine ? 'connecting' : 'disconnected',
      )
    }

    const handleConnectError = () => {
      setConnectionStatus(
        navigator.onLine ? 'connecting' : 'disconnected',
      )
    }

    const handleOnline = () => {
      setConnectionStatus('connecting')
      socket.connect()
    }

    const handleOffline = () => {
      setConnectionStatus('disconnected')

      notifications.show({
        id: 'network-offline',
        title: t('notifications.warningTitle'),
        message: t('notifications.noConnection'),
        color: 'yellow',
      })
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)

      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [socket, queryClient, t])

  // Eventos de actualización en tiempo real.
  useEffect(() => {
    const handleNewChannel = (channel) => {
      queryClient.setQueryData(['channels'], (current = []) => {
        if (current.some((item) => item.id === channel.id)) {
          return current
        }

        return [...current, channel]
      })
    }

    const handleRenameChannel = (channel) => {
      queryClient.setQueryData(['channels'], (current = []) =>
        current.map((item) =>
          item.id === channel.id ? { ...item, ...channel } : item,
        ),
      )

      if (activeChannel?.id === channel.id) {
        setActiveChannel({ ...activeChannel, ...channel })
      }
    }

    const handleRemoveChannel = (removedChannel) => {
      const removedId = removedChannel.id

      queryClient.setQueryData(['channels'], (current = []) =>
        current.filter((channel) => channel.id !== removedId),
      )

      queryClient.setQueryData(['messages'], (current = []) =>
        current.filter((message) => message.channelId !== removedId),
      )

      if (activeChannel?.id === removedId) {
        const currentChannels =
          queryClient.getQueryData(['channels']) || []

        const generalChannel = currentChannels.find(
          (channel) => channel.name === 'general',
        )

        if (generalChannel) {
          setActiveChannel(generalChannel)
        }
      }

      if (channelToDelete?.id === removedId) {
        setChannelToDelete(null)
      }

      if (openMenuChannelId === removedId) {
        setOpenMenuChannelId(null)
      }
    }

    const handleNewMessage = (message) => {
      queryClient.setQueryData(['messages'], (current = []) => {
        if (current.some((item) => item.id === message.id)) {
          return current
        }

        return [...current, message]
      })
    }

    socket.on('newChannel', handleNewChannel)
    socket.on('renameChannel', handleRenameChannel)
    socket.on('removeChannel', handleRemoveChannel)
    socket.on('newMessage', handleNewMessage)

    return () => {
      socket.off('newChannel', handleNewChannel)
      socket.off('renameChannel', handleRenameChannel)
      socket.off('removeChannel', handleRemoveChannel)
      socket.off('newMessage', handleNewMessage)
    }
  }, [
    socket,
    queryClient,
    activeChannel,
    setActiveChannel,
    channelToDelete,
    openMenuChannelId,
  ])

  const visibleMessages = messages.filter(
    (message) => message.channelId === activeChannel?.id,
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChannel?.id, visibleMessages.length])

  // Mostrar notificación cuando no hay conexión.
  const notifyOffline = () => {
    notifications.show({
      id: 'network-offline',
      title: t('notifications.warningTitle'),
      message: t('notifications.noConnection'),
      color: 'yellow',
    })
  }

  // Crear canal.
  const handleCreateChannel = channelForm.onSubmit(async (values) => {
    if (creatingChannel) return

    if (!navigator.onLine) {
      setError(t('chat.errors.noConnection'))
      notifyOffline()
      return
    }

    setError('')
    setCreatingChannel(true)

    try {
      const name = filterProfanity(values.name.trim())
      const channel = await createChannel(token, name)

      queryClient.setQueryData(['channels'], (current = []) => {
        if (current.some((item) => item.id === channel.id)) {
          return current
        }

        return [...current, channel]
      })

      setActiveChannel(channel)
      channelForm.reset()
      setShowChannelForm(false)

      notifications.show({
        title: t('notifications.successTitle'),
        message: t('notifications.channelCreated', { name }),
        color: 'green',
      })
    } catch (createError) {
      console.error('Error al crear el canal:', createError)
      setError(t('chat.errors.createChannel'))
    } finally {
      setCreatingChannel(false)
    }
  })

  // Abrir modal de renombramiento.
  const handleOpenRename = (channel) => {
    setError('')
    setOpenMenuChannelId(null)
    setEditingChannel(channel)
    renameForm.setValues({ name: channel.name })
    renameForm.clearErrors()
  }

  // Renombrar canal.
  const handleRenameChannel = renameForm.onSubmit(async (values) => {
    if (!editingChannel || renamingChannel) return

    if (!navigator.onLine) {
      setError(t('chat.errors.noConnection'))
      notifyOffline()
      return
    }

    setError('')
    setRenamingChannel(true)

    try {
      const name = values.name.trim()

      const response = await renameChannel(
        token,
        editingChannel.id,
        name,
      )

      const updatedChannel = response?.id
        ? response
        : { ...editingChannel, name }

      queryClient.setQueryData(['channels'], (current = []) =>
        current.map((channel) =>
          channel.id === editingChannel.id
            ? { ...channel, ...updatedChannel, name }
            : channel,
        ),
      )

      if (activeChannel?.id === editingChannel.id) {
        setActiveChannel({
          ...activeChannel,
          ...updatedChannel,
          name,
        })
      }

      setEditingChannel(null)
      renameForm.reset()

      notifications.show({
        title: t('notifications.successTitle'),
        message: t('notifications.channelRenamed', { name }),
        color: 'green',
      })
    } catch (renameError) {
      console.error('Error al renombrar el canal:', renameError)
      setError(t('chat.errors.renameChannel'))
    } finally {
      setRenamingChannel(false)
    }
  })

  // Solicitar confirmación para eliminar.
  const handleAskDelete = (channel) => {
    if (!channel.removable) return

    setError('')
    setOpenMenuChannelId(null)
    setChannelToDelete(channel)
  }

  // Eliminar canal.
  const handleDeleteChannel = async () => {
    if (!channelToDelete || deletingChannel) return

    if (!channelToDelete.removable) {
      setChannelToDelete(null)
      return
    }

    if (!navigator.onLine) {
      setError(t('chat.errors.noConnection'))
      notifyOffline()
      return
    }

    setError('')
    setDeletingChannel(true)

    try {
      const deletedChannelName = channelToDelete.name

      await deleteChannel(token, channelToDelete.id)

      queryClient.setQueryData(['channels'], (current = []) =>
        current.filter(
          (channel) => channel.id !== channelToDelete.id,
        ),
      )

      queryClient.setQueryData(['messages'], (current = []) =>
        current.filter(
          (message) => message.channelId !== channelToDelete.id,
        ),
      )

      if (activeChannel?.id === channelToDelete.id) {
        const remainingChannels =
          queryClient.getQueryData(['channels']) || []

        const generalChannel = remainingChannels.find(
          (channel) => channel.name === 'general',
        )

        if (generalChannel) {
          setActiveChannel(generalChannel)
        }
      }

      setChannelToDelete(null)

      await queryClient.invalidateQueries({
        queryKey: ['channels'],
      })

      await queryClient.invalidateQueries({
        queryKey: ['messages'],
      })

      notifications.show({
        title: t('notifications.successTitle'),
        message: t('notifications.channelDeleted', {
          name: deletedChannelName,
        }),
        color: 'green',
      })
    } catch (deleteError) {
      console.error('Error al eliminar el canal:', deleteError)
      setError(t('chat.errors.deleteChannel'))
    } finally {
      setDeletingChannel(false)
    }
  }

  // Enviar mensajes.
  const handleSendMessage = async (event) => {
    event.preventDefault()

    const body = filterProfanity(messageText.trim())

    if (!body || !activeChannel || sendingMessage) return

    if (!navigator.onLine) {
      setError(t('chat.errors.noConnection'))
      notifyOffline()
      return
    }

    setError('')
    setSendingMessage(true)

    try {
      await sendMessage(token, {
        body,
        channelId: activeChannel.id,
        username,
      })

      setMessageText('')

      await queryClient.invalidateQueries({
        queryKey: ['messages'],
      })
    } catch (sendError) {
      console.error('Error al enviar el mensaje:', sendError)
      setError(t('chat.errors.sendMessage'))
    } finally {
      setSendingMessage(false)
    }
  }

  const connectionLabels = {
    connected: t('chat.connection.connected'),
    connecting: t('chat.connection.connecting'),
    disconnected: t('chat.connection.disconnected'),
  }

  const connectionColors = {
    connected: '#16a34a',
    connecting: '#d97706',
    disconnected: '#dc2626',
  }

  if (channelsLoading || messagesLoading) {
    return (
      <>
        <Header />
        <main className="chat-app">
          <p className="welcome-message">
            {t('chat.loading')}
          </p>
        </main>
      </>
    )
  }

  if (channelsError || messagesError) {
    return (
      <>
        <Header />
        <main className="chat-app">
          <p className="error-message">
            {t('chat.loadError')}
          </p>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />

      <Flex
        component="main"
        direction={{ base: 'column', sm: 'row' }}
        w="min(100%, 1050px)"
        mih="100vh"
        mx="auto"
        bg="white"
        style={{
          borderInline: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Paper
          component="aside"
          radius={0}
          p="md"
          w={{ base: '100%', sm: 280 }}
          style={{
            flex: '0 0 auto',
            borderRight: '1px solid var(--mantine-color-default-border)',
          }}
        >
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Title order={1} size="h3">
                {t('chat.title')}
              </Title>

              <Button
                type="button"
                variant="light"
                size="sm"
                onClick={() => {
                  setShowChannelForm((current) => !current)
                  channelForm.reset()
                  setError('')
                }}
                disabled={creatingChannel || deletingChannel}
              >
                {showChannelForm
                  ? t('common.cancel')
                  : t('chat.newChannel')}
              </Button>
            </Group>

            {showChannelForm && (
              <form onSubmit={handleCreateChannel}>
                <Stack gap="xs">
                  <TextInput
                    label={t('chat.channelName')}
                    ref={channelInputRef}
                    placeholder={t('chat.channelPlaceholder')}
                    maxLength={20}
                    disabled={creatingChannel}
                    {...channelForm.getInputProps('name')}
                  />

                  <Button
                    type="submit"
                    loading={creatingChannel}
                    disabled={creatingChannel}
                    fullWidth
                  >
                    {creatingChannel
                      ? t('chat.creatingChannel')
                      : t('chat.createChannel')}
                  </Button>
                </Stack>
              </form>
            )}

            <Stack
              component="nav"
              gap={4}
              aria-label={t('chat.conversations')}
            >
              {channels.map((channel) => (
                <Group
                  key={channel.id}
                  className="channel-row"
                  gap={4}
                  wrap="nowrap"
                >
                  <Button
                    type="button"
                    variant={
                      activeChannel?.id === channel.id
                        ? 'light'
                        : 'subtle'
                    }
                    color="gray"
                    justify="flex-start"
                    flex={1}
                    onClick={() => {
                      setActiveChannel(channel)
                      setOpenMenuChannelId(null)
                    }}
                  >
                    # {channel.name}
                  </Button>

                  <Menu
                    opened={openMenuChannelId === channel.id}
                    onChange={(opened) => {
                      setOpenMenuChannelId(
                        opened ? channel.id : null,
                      )
                    }}
                    position="bottom-end"
                    withinPortal
                    closeOnItemClick
                  >
                    <Menu.Target>
                      <Button
                        type="button"
                        variant="subtle"
                        color="gray"
                        size="compact-md"
                        px={8}
                        aria-label={t('chat.channelOptions', {
                          name: channel.name,
                        })}
                        aria-expanded={
                          openMenuChannelId === channel.id
                        }
                        aria-haspopup="menu"
                      >
                        ⋮
                      </Button>
                    </Menu.Target>

                    <Menu.Dropdown>
                      <Menu.Item
                        onClick={() => handleOpenRename(channel)}
                      >
                        {t('chat.renameChannel')}
                      </Menu.Item>

                      {channel.removable && (
                        <Menu.Item
                          color="red"
                          onClick={() => handleAskDelete(channel)}
                        >
                          {t('chat.deleteChannel')}
                        </Menu.Item>
                      )}
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              ))}
            </Stack>
          </Stack>
        </Paper>

        <section className="chat-panel">
          <header className="chat-header">
            <h2>
              {activeChannel
                ? `# ${activeChannel.name}`
                : t('chat.title')}
            </h2>

            <p>
              {activeChannel
                ? t('chat.subtitle')
                : t('chat.selectConversation')}
            </p>

            <p
              role="status"
              aria-live="polite"
              style={{
                color: connectionColors[connectionStatus],
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              ● {connectionLabels[connectionStatus]}
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
                      <strong>
                        {message.username || t('chat.unknownUser')}
                      </strong>
                      <p>{message.body}</p>

                      <time>
                        {message.createdAt
                          ? new Date(message.createdAt).toLocaleTimeString(
                              i18n.resolvedLanguage || 'en',
                              { hour: '2-digit', minute: '2-digit' },
                            )
                          : t('chat.unavailableTime')}
                      </time>
                    </article>
                  ))}

                  {visibleMessages.length === 0 && (
                    <p className="welcome-message">
                      {t('chat.emptyMessages')}
                    </p>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                <form className="message-form" onSubmit={handleSendMessage}>
                  <input
                    aria-label={t('chat.messageInputLabel')}
                    placeholder={
                      connectionStatus === 'disconnected'
                        ? t('chat.messageOfflinePlaceholder')
                        : t('chat.messagePlaceholder')
                    }
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    disabled={sendingMessage || !navigator.onLine}
                    required
                  />

                  <button
                    type="submit"
                    disabled={
                      !messageText.trim()
                      || sendingMessage
                      || !navigator.onLine
                    }
                  >
                    {sendingMessage
                      ? t('chat.sendingMessage')
                      : t('chat.sendMessage')}
                  </button>
                </form>
              </>
            ) : (
              <p className="welcome-message">
                {t('chat.selectChannel')}
              </p>
            )}
          </div>

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
        </section>

        {/* Modal para renombrar */}
        {editingChannel && (
          <div
            className="modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget
                && !renamingChannel
              ) {
                setEditingChannel(null)
                renameForm.reset()
              }
            }}
          >
            <section
              className="channel-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="rename-modal-title"
            >
              <h2 id="rename-modal-title">
                {t('chat.renameModal.title')}
              </h2>
              <p>{t('chat.renameModal.description')}</p>

              <form
                className="rename-channel-form"
                onSubmit={handleRenameChannel}
              >
                <label htmlFor="rename-channel-name">
                  {t('chat.channelName')}
                </label>

                <input
                  id="rename-channel-name"
                  ref={renameInputRef}
                  placeholder={t('chat.channelPlaceholder')}
                  maxLength={20}
                  disabled={renamingChannel}
                  {...renameForm.getInputProps('name')}
                />

                {renameForm.errors.name && (
                  <p className="field-error" role="alert">
                    {renameForm.errors.name}
                  </p>
                )}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-button"
                    disabled={renamingChannel}
                    onClick={() => {
                      setEditingChannel(null)
                      renameForm.reset()
                    }}
                  >
                    {t('common.cancel')}
                  </button>

                  <button type="submit" disabled={renamingChannel}>
                    {renamingChannel
                      ? t('chat.renameModal.saving')
                      : t('chat.renameModal.submit')}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {/* Modal de confirmación para eliminar */}
        {channelToDelete && (
          <div
            className="modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget
                && !deletingChannel
              ) {
                setChannelToDelete(null)
              }
            }}
          >
            <section
              className="channel-modal"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-modal-title"
              aria-describedby="delete-modal-description"
            >
              <h2 id="delete-modal-title">
                {t('chat.deleteModal.title', {
                  name: channelToDelete.name,
                })}
              </h2>

              <p id="delete-modal-description">
                {t('chat.deleteModal.description')}
              </p>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  disabled={deletingChannel}
                  onClick={() => setChannelToDelete(null)}
                >
                  {t('common.cancel')}
                </button>

                <button
                  type="button"
                  className="delete-confirm-button"
                  disabled={deletingChannel}
                  onClick={handleDeleteChannel}
                >
                  {deletingChannel
                    ? t('chat.deleteModal.deleting')
                    : 'Confirm'}
                </button>
              </div>
            </section>
          </div>
        )}
      </Flex>
    </>
  )
}

export default App