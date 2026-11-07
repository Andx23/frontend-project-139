
import { useEffect, useRef, useState } from 'react'
import {
  Button,
  Flex,
  Group,
  Menu,
  Modal,
  Paper,
  Stack,
  Text,
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

  // Cerrar modal de renombramiento.
  const handleCloseRename = () => {
    if (renamingChannel) return

    setEditingChannel(null)
    renameForm.reset()
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

  // Cerrar modal de eliminación.
  const handleCloseDelete = () => {
    if (deletingChannel) return

    setChannelToDelete(null)
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
        <Flex
          component="main"
          w="min(100%, 1050px)"
          mih="100vh"
          mx="auto"
          align="center"
          justify="center"
        >
          <Text c="dimmed" ta="center">
            {t('chat.loading')}
          </Text>
        </Flex>
      </>
    )
  }

  if (channelsError || messagesError) {
    return (
      <>
        <Header />
        <Flex
          component="main"
          w="min(100%, 1050px)"
          mih="100vh"
          mx="auto"
          align="center"
          justify="center"
        >
          <Text c="red" ta="center">
            {t('chat.loadError')}
          </Text>
        </Flex>
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
        bd="1px solid var(--mantine-color-default-border)"
      >
        <Paper
          component="aside"
          radius={0}
          p="md"
          w={{ base: '100%', sm: 280 }}
          flex="0 0 auto"
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
                    aria-label={`# ${channel.name}`}
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
                    {channel.name}
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

        {/* Panel principal del chat */}
        <Flex
          component="section"
          direction="column"
          flex={1}
          miw={0}
          mih={0}
          bg="gray.0"
          bd="0"
        >
          <Paper
            component="header"
            radius={0}
            p="md"
            ta="center"
            bg="white"
          >
            <Title order={2} size="h3" mb={8}>
              {activeChannel
                ? `# ${activeChannel.name}`
                : t('chat.title')}
            </Title>

            <Text size="xs" c="dimmed">
              {activeChannel
                ? t('chat.subtitle')
                : t('chat.selectConversation')}
            </Text>

            <Text
              component="p"
              role="status"
              aria-live="polite"
              size="sm"
              fw={600}
              c={connectionColors[connectionStatus]}
              mt={4}
            >
              ● {connectionLabels[connectionStatus]}
            </Text>
          </Paper>

          <Flex
            direction="column"
            gap="md"
            p={{ base: 'sm', sm: 'md' }}
            flex={1}
            mih={0}
          >
            {activeChannel ? (
              <>
                <Stack
                  gap="sm"
                  flex={1}
                  mih={0}
                  overflow="auto"
                >
                  {visibleMessages.map((message) => {
                    const isOwnMessage = message.username === username

                    return (
                      <Flex
                        component="article"
                        key={message.id}
                        direction="column"
                        radius="md"
                        p="md"
                        bd={`1px solid ${
                          isOwnMessage
                            ? 'var(--mantine-color-indigo-2)'
                            : 'var(--mantine-color-default-border)'
                        }`}
                        bg={
                          isOwnMessage
                            ? 'var(--mantine-color-indigo-0)'
                            : 'var(--mantine-color-white)'
                        }
                        alignSelf={isOwnMessage ? 'flex-end' : 'flex-start'}
                        gap={10}
                        w="fit-content"
                        maw="min(80%, 460px)"
                      >
                        <Text
                          size="xs"
                          fw={700}
                          ta="center"
                          c="indigo"
                        >
                          {message.username || t('chat.unknownUser')}
                        </Text>

                        <Text size="sm" lh={1.5}>
                          {message.body}
                        </Text>

                        <Text
                          component="time"
                          size="xs"
                          c="dimmed"
                          ta="right"
                        >
                          {message.createdAt
                            ? new Date(message.createdAt).toLocaleTimeString(
                                i18n.resolvedLanguage || 'en',
                                { hour: '2-digit', minute: '2-digit' },
                              )
                            : t('chat.unavailableTime')}
                        </Text>
                      </Flex>
                    )
                  })}

                  {visibleMessages.length === 0 && (
                    <Text c="dimmed" ta="center" m="auto">
                      {t('chat.emptyMessages')}
                    </Text>
                  )}

                  <div ref={messagesEndRef} />
                </Stack>

                <Flex
                  component="form"
                  gap="sm"
                  align="center"
                  onSubmit={handleSendMessage}
                >
                  <TextInput
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
                    flex={1}
                  />

                  <Button
                    type="submit"
                    disabled={
                      !messageText.trim()
                      || sendingMessage
                      || !navigator.onLine
                    }
                    loading={sendingMessage}
                  >
                    {sendingMessage
                      ? t('chat.sendingMessage')
                      : t('chat.sendMessage')}
                  </Button>
                </Flex>
              </>
            ) : (
              <Text c="dimmed" ta="center" m="auto">
                {t('chat.selectChannel')}
              </Text>
            )}
          </Flex>

          {error && (
            <Text c="red" role="alert" p="sm">
              {error}
            </Text>
          )}
        </Flex>

        {/* Modal para renombrar canal */}
        <Modal
          opened={Boolean(editingChannel)}
          onClose={handleCloseRename}
          title={t('chat.renameModal.title')}
          centered
          size="420px"
          radius="md"
          closeOnClickOutside={!renamingChannel}
          closeOnEscape={!renamingChannel}
          withCloseButton={!renamingChannel}
        >
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {t('chat.renameModal.description')}
            </Text>

            <form onSubmit={handleRenameChannel}>
              <Stack gap="md">
                <TextInput
                  label={t('chat.channelName')}
                  ref={renameInputRef}
                  placeholder={t('chat.channelPlaceholder')}
                  disabled={renamingChannel}
                  {...renameForm.getInputProps('name')}
                />

                <Group justify="flex-end">
                  <Button
                    type="button"
                    variant="default"
                    disabled={renamingChannel}
                    onClick={handleCloseRename}
                  >
                    {t('common.cancel')}
                  </Button>

                  <Button
                    type="submit"
                    loading={renamingChannel}
                    disabled={renamingChannel}
                  >
                    {renamingChannel
                      ? t('chat.renameModal.saving')
                      : t('chat.renameModal.submit')}
                  </Button>
                </Group>
              </Stack>
            </form>
          </Stack>
        </Modal>

        {/* Modal de confirmación para eliminar */}
        <Modal.Root
          opened={Boolean(channelToDelete)}
          onClose={handleCloseDelete}
          centered
          size="420px"
          radius="md"
          closeOnClickOutside={!deletingChannel}
          closeOnEscape={!deletingChannel}
        >
          <Modal.Overlay />

          <Modal.Content
            ref={(node) => node?.setAttribute('role', 'alertdialog')}
          >
            <Modal.Header>
              <Modal.Title>
                {channelToDelete
                  ? t('chat.deleteModal.title', {
                      name: channelToDelete.name,
                    })
                  : ''}
              </Modal.Title>

              {!deletingChannel && <Modal.CloseButton />}
            </Modal.Header>

            <Modal.Body>
              <Stack gap="md">
                <Text size="sm" c="dimmed">
                  {t('chat.deleteModal.description')}
                </Text>

                <Group justify="flex-end">
                  <Button
                    type="button"
                    variant="default"
                    disabled={deletingChannel}
                    onClick={handleCloseDelete}
                  >
                    {t('common.cancel')}
                  </Button>

                  <Button
                    type="button"
                    color="red"
                    disabled={deletingChannel}
                    loading={deletingChannel}
                    onClick={handleDeleteChannel}
                  >
                    {deletingChannel
                      ? t('chat.deleteModal.deleting')
                      : 'Confirm'}
                  </Button>
                </Group>
              </Stack>
            </Modal.Body>
          </Modal.Content>
        </Modal.Root>
      </Flex>
    </>
  )
}

export default App
