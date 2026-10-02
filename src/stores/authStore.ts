import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setDatabaseUser } from '@/db'

export interface UserProfile {
  id: string
  name: string
  email: string
  avatar?: string
  createdAt: string
}

export interface UserAccount extends UserProfile {
  password: string
}

export interface AuthState {
  // Google Sheets integration state
  accessToken: string | null
  spreadsheetId: string | null
  setAccessToken: (token: string | null) => void
  setSpreadsheetId: (id: string | null) => void

  // User Authentication state
  currentUser: UserProfile | null
  registeredUsers: UserAccount[]

  login: (email: string, password: string) => { success: boolean; error?: string }
  register: (name: string, email: string, password: string) => { success: boolean; error?: string }
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      spreadsheetId: null,
      currentUser: null,
      registeredUsers: [],

      setAccessToken: (token) => set({ accessToken: token }),
      setSpreadsheetId: (id) => set({ spreadsheetId: id }),

      login: (email, password) => {
        const normalizedEmail = email.trim().toLowerCase()
        const user = get().registeredUsers.find(
          (u) => u.email.toLowerCase() === normalizedEmail
        )

        if (!user) {
          return { success: false, error: 'Email atau username tidak ditemukan' }
        }

        if (user.password !== password) {
          return { success: false, error: 'Password yang dimasukkan salah' }
        }

        // Set database for this user
        setDatabaseUser(user.id)

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...profile } = user
        set({ currentUser: profile })
        return { success: true }
      },

      register: (name, email, password) => {
        const normalizedEmail = email.trim().toLowerCase()
        const cleanName = name.trim()

        if (!cleanName) {
          return { success: false, error: 'Nama wajib diisi' }
        }
        if (!normalizedEmail) {
          return { success: false, error: 'Email wajib diisi' }
        }
        if (password.length < 4) {
          return { success: false, error: 'Password minimal 4 karakter' }
        }

        const existing = get().registeredUsers.find(
          (u) => u.email.toLowerCase() === normalizedEmail
        )
        if (existing) {
          return { success: false, error: 'Email ini sudah terdaftar' }
        }

        const newId = 'user_' + crypto.randomUUID().slice(0, 8)
        const newUser: UserAccount = {
          id: newId,
          name: cleanName,
          email: normalizedEmail,
          password,
          avatar: '👤',
          createdAt: new Date().toISOString(),
        }

        // Set database for new user
        setDatabaseUser(newUser.id)

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...profile } = newUser
        set((state) => ({
          registeredUsers: [...state.registeredUsers, newUser],
          currentUser: profile,
        }))

        return { success: true }
      },

      logout: () => {
        setDatabaseUser('default')
        set({
          accessToken: null,
          spreadsheetId: null,
          currentUser: null,
        })
      },
    }),
    {
      name: 'wlltz-auth-storage',
      onRehydrateStorage: () => (state) => {
        if (state?.currentUser?.id) {
          setDatabaseUser(state.currentUser.id)
        } else {
          setDatabaseUser('default')
        }
      },
    }
  )
)
