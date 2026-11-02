
import { create } from 'zustand'

const useChatStore = create((set) => ({
  activeChannel: null,
  isModalOpen: false,

  setActiveChannel: (channel) => {
    set({ activeChannel: channel })
  },

  setModalOpen: (isOpen) => {
    set({ isModalOpen: isOpen })
  },
}))

export default useChatStore
