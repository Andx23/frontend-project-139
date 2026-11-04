
import { useContext } from 'react'
import { useStore } from 'zustand'
import StoreContext from './StoreContext.js'

const useStores = () => {
  const stores = useContext(StoreContext)

  if (!stores) {
    throw new Error(
      'Store hooks must be used within a StoreProvider',
    )
  }

  return stores
}

export function useAuthStore(selector) {
  const { authStore } = useStores()

  return useStore(authStore, selector)
}

export function useChatStore(selector) {
  const { chatStore } = useStores()

  return useStore(chatStore, selector)
}
