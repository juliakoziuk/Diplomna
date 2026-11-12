import { create } from "zustand"
import { persist } from "zustand/middleware"

export type AuthMode = "login" | "register"

interface GeneralState {
  isProfileSettingsModalOpen: boolean
  isLoginModalOpen: boolean
  isCreateRoomModalOpen: boolean
  /** Which tab of the sign-in modal is shown. */
  authMode: AuthMode
  toggleProfileSettingsModal: () => void
  toggleLoginModal: () => void
  toggleCreateRoomModal: () => void
  setAuthMode: (mode: AuthMode) => void
  /** Opens the sign-in modal on the given tab. */
  openAuth: (mode: AuthMode) => void
  closeAuth: () => void
}

export const useGeneralStore = create<GeneralState>()(
  persist(
    (set) => ({
      isProfileSettingsModalOpen: false,
      isLoginModalOpen: false,
      isCreateRoomModalOpen: false,
      authMode: "login",

      toggleProfileSettingsModal: () =>
        set((state) => ({
          isProfileSettingsModalOpen: !state.isProfileSettingsModalOpen,
        })),
      toggleLoginModal: () =>
        set((state) => ({
          isLoginModalOpen: !state.isLoginModalOpen,
        })),
      toggleCreateRoomModal: () =>
        set((state) => ({
          isCreateRoomModalOpen: !state.isCreateRoomModalOpen,
        })),
      setAuthMode: (mode) => set({ authMode: mode }),
      openAuth: (mode) => set({ authMode: mode, isLoginModalOpen: true }),
      closeAuth: () => set({ isLoginModalOpen: false }),
    }),
    {
      name: "general-store",
      // Only transient UI flags live here: a modal must not reopen after a reload.
      partialize: () => ({}),
    }
  )
)
