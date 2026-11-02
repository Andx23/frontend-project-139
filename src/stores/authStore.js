
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
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

export default useAuthStore
