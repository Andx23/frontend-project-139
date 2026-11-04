
import { createStore } from 'zustand/vanilla'

export const createChatStore = () => createStore((set) => ({
  activeChannel: null,
  isModalOpen: false,

  setActiveChannel: (channel) => {
    set({ activeChannel: channel })
  },

  setModalOpen: (isOpen) => {
    set({ isModalOpen: isOpen })
  },
}))
