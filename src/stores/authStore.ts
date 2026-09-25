import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthState {
  accessToken: string | null
  spreadsheetId: string | null
  setAccessToken: (token: string | null) => void
  setSpreadsheetId: (id: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      spreadsheetId: null,
      setAccessToken: (token) => set({ accessToken: token }),
      setSpreadsheetId: (id) => set({ spreadsheetId: id }),
      logout: () => set({ accessToken: null, spreadsheetId: null }),
    }),
    {
      name: 'wlltz-auth-storage',
    }
  )
)
