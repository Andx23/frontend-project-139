
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  cleanup,
  render,
  screen,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'

import {
  createChannel,
  deleteChannel,
  getChannels,
  getMessages,
  renameChannel,
} from './api.js'
import useAuthStore from './stores/authStore.js'
import App from './App.jsx'
import './i18n/index.js'

vi.mock('./api.js', () => ({
  createChannel: vi.fn(),
  deleteChannel: vi.fn(),
  getChannels: vi.fn(),
  getMessages: vi.fn(),
  renameChannel: vi.fn(),
  sendMessage: vi.fn(),
}))

vi.mock('./components/Header.jsx', () => ({
  default: () => null,
}))

describe('App notifications', () => {
  let queryClient
  let socket

  beforeEach(() => {
    useAuthStore.setState({
      token: 'test-token',
      username: 'test-user',
    })

    getChannels.mockRejectedValue(
      new Error('Failed to load channels'),
    )

    getMessages.mockResolvedValue([])

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    socket = {
      connected: false,
      on: vi.fn(),
      off: vi.fn(),
      connect: vi.fn(),
    }
  })

  afterEach(() => {
    cleanup()
    queryClient.clear()

    useAuthStore.setState({
      token: null,
      username: null,
    })

    vi.clearAllMocks()
  })

  it('shows an error notification when channels fail to load', async () => {
    render(
      <MantineProvider>
        <Notifications />

        <QueryClientProvider client={queryClient}>
          <App socket={socket} />
        </QueryClientProvider>
      </MantineProvider>,
    )

    expect(
      await screen.findByText(
        'Unable to load chat data. Please check your connection and try again.',
      ),
    ).toBeInTheDocument()
  })

  it('shows a success notification when a channel is created', async () => {
    const user = userEvent.setup()

    getChannels.mockResolvedValue([
      {
        id: 1,
        name: 'general',
        removable: false,
      },
    ])

    createChannel.mockResolvedValue({
      id: 2,
      name: 'videogames',
      removable: true,
    })

    render(
      <MantineProvider>
        <Notifications />

        <QueryClientProvider client={queryClient}>
          <App socket={socket} />
        </QueryClientProvider>
      </MantineProvider>,
    )

    await user.click(
      await screen.findByRole('button', {
        name: '+ New channel',
      }),
    )

    await user.type(
      screen.getByLabelText('Channel name'),
      'videogames',
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Create channel',
      }),
    )

    expect(
      await screen.findByText(
        'Channel "videogames" was created successfully.',
      ),
    ).toBeInTheDocument()

    expect(createChannel).toHaveBeenCalledWith(
      'test-token',
      'videogames',
    )
  })

  it('shows a success notification when a channel is renamed', async () => {
    const user = userEvent.setup()

    getChannels.mockResolvedValue([
      {
        id: 1,
        name: 'general',
        removable: false,
      },
      {
        id: 2,
        name: 'videogames',
        removable: true,
      },
    ])

    renameChannel.mockResolvedValue({
      id: 2,
      name: 'development',
      removable: true,
    })

    render(
      <MantineProvider>
        <Notifications />

        <QueryClientProvider client={queryClient}>
          <App socket={socket} />
        </QueryClientProvider>
      </MantineProvider>,
    )

    await screen.findByRole('button', {
      name: '# videogames',
    })

    await user.click(
      screen.getByRole('button', {
        name: 'Options for channel videogames',
      }),
    )

    await user.click(
      screen.getByRole('menuitem', {
        name: 'Rename channel',
      }),
    )

    const nameInput = screen.getByLabelText('Channel name')

    await user.clear(nameInput)
    await user.type(nameInput, 'development')

    await user.click(
      screen.getByRole('button', {
        name: 'Save changes',
      }),
    )

    expect(
      await screen.findByText(
        'Channel "development" was renamed successfully.',
      ),
    ).toBeInTheDocument()

    expect(renameChannel).toHaveBeenCalledWith(
      'test-token',
      2,
      'development',
    )
  })

  it('shows a success notification when a channel is deleted', async () => {
    const user = userEvent.setup()

    getChannels
      .mockResolvedValueOnce([
        {
          id: 1,
          name: 'general',
          removable: false,
        },
        {
          id: 2,
          name: 'videogames',
          removable: true,
        },
      ])
      .mockResolvedValue([
        {
          id: 1,
          name: 'general',
          removable: false,
        },
      ])

    deleteChannel.mockResolvedValue(undefined)

    render(
      <MantineProvider>
        <Notifications />

        <QueryClientProvider client={queryClient}>
          <App socket={socket} />
        </QueryClientProvider>
      </MantineProvider>,
    )

    await screen.findByRole('button', {
      name: '# videogames',
    })

    await user.click(
      screen.getByRole('button', {
        name: 'Options for channel videogames',
      }),
    )

    await user.click(
      screen.getByRole('menuitem', {
        name: 'Delete channel',
      }),
    )

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', {
        name: 'Delete channel',
      }),
    )

    expect(
      await screen.findByText(
        'Channel "videogames" was deleted successfully.',
      ),
    ).toBeInTheDocument()

    expect(deleteChannel).toHaveBeenCalledWith(
      'test-token',
      2,
    )
  })
})
