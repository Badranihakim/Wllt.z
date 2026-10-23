import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setDatabaseUser } from '@/db'
import { supabase } from '@/lib/supabase'
import { supabaseSync } from '@/services/supabaseSync'

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

  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
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

      login: async (email, password) => {
        const normalizedEmail = email.trim().toLowerCase()

        // 1. Try Supabase Auth
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          })

          if (error) {
            if (error.message.includes('Email not confirmed')) {
              return {
                success: false,
                error: 'Email belum diverifikasi. Silakan periksa inbox email Anda, atau matikan "Confirm email" di dashboard Supabase.',
              }
            }
            if (error.message.includes('Invalid login credentials')) {
              // Check if user exists locally
              const localUser = get().registeredUsers.find(
                (u) => u.email.toLowerCase() === normalizedEmail
              )
              if (localUser && localUser.password === password) {
                setDatabaseUser(localUser.id)
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { password: _, ...profile } = localUser
                set({ currentUser: profile })
                return { success: true }
              }
              return { success: false, error: 'Email atau password yang Anda masukkan salah.' }
            }
            return { success: false, error: error.message }
          }

          if (data?.user) {
            const profile: UserProfile = {
              id: data.user.id,
              name: data.user.user_metadata?.name || normalizedEmail.split('@')[0],
              email: data.user.email || normalizedEmail,
              avatar: '👤',
              createdAt: data.user.created_at,
            }

            setDatabaseUser(profile.id)
            set({ currentUser: profile })

            // Trigger background sync from Supabase cloud
            supabaseSync.syncAll(profile.id).catch(console.warn)

            return { success: true }
          }
        } catch (err: any) {
          console.warn('[authStore] Supabase signIn failed, checking local:', err)
        }

        // Fallback: check local storage
        const localUser = get().registeredUsers.find(
          (u) => u.email.toLowerCase() === normalizedEmail
        )
        if (localUser && localUser.password === password) {
          setDatabaseUser(localUser.id)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { password: _, ...profile } = localUser
          set({ currentUser: profile })
          return { success: true }
        }

        return { success: false, error: 'Email atau username tidak ditemukan' }
      },

      register: async (name, email, password) => {
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

        // 1. Try Supabase Auth
        try {
          const { data, error } = await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
              data: { name: cleanName },
            },
          })

          if (error) {
            if (error.message.includes('User already registered')) {
              return { success: false, error: 'Email ini sudah terdaftar. Silakan langsung masuk (Login).' }
            }
            return { success: false, error: error.message }
          }

          if (data?.user) {
            const profile: UserProfile = {
              id: data.user.id,
              name: cleanName,
              email: normalizedEmail,
              avatar: '👤',
              createdAt: data.user.created_at,
            }

            // Also keep local fallback
            const localAccount: UserAccount = {
              ...profile,
              password,
            }

            setDatabaseUser(profile.id)
            set((state) => ({
              registeredUsers: [...state.registeredUsers.filter(u => u.email !== normalizedEmail), localAccount],
              currentUser: profile,
            }))

            if (!data.session) {
              // Email confirmation was turned on in Supabase
              return {
                success: true,
                error: 'Pendaftaran berhasil! Jika login terhambat, periksa inbox email Anda untuk konfirmasi atau matikan "Confirm email" di Supabase.',
              }
            }

            // Sync initial data to Supabase
            supabaseSync.pushLocalToCloud(profile.id).catch(console.warn)

            return { success: true }
          }
        } catch (err: any) {
          console.warn('[authStore] Supabase signUp failed, falling back to local:', err)
        }

        // Fallback: Local registration
        const newId = 'user_' + crypto.randomUUID().slice(0, 8)
        const newUser: UserAccount = {
          id: newId,
          name: cleanName,
          email: normalizedEmail,
          password,
          avatar: '👤',
          createdAt: new Date().toISOString(),
        }

        setDatabaseUser(newUser.id)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...profile } = newUser
        set((state) => ({
          registeredUsers: [...state.registeredUsers, newUser],
          currentUser: profile,
        }))

        return { success: true }
      },

      logout: async () => {
        try {
          await supabase.auth.signOut()
        } catch (err) {
          console.warn('[authStore] Supabase signOut error:', err)
        }
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
          // Trigger sync on rehydrate
          supabaseSync.syncAll(state.currentUser.id).catch(console.warn)
        } else {
          setDatabaseUser('default')
        }
      },
    }
  )
)
