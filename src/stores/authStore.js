
import { createStore } from 'zustand/vanilla'
import { persist } from 'zustand/middleware'

export const createAuthStore = () => createStore(
  persist(
    (set) => ({
      token: null,
      username: null,

      setCredentials: (token, username) => {
        set({ token, username })
      },

      logout: () => {
        set({
          token: null,
          username: null,
        })
      },
    }),
    {
      name: 'auth-storage',
    },
  ),
)
