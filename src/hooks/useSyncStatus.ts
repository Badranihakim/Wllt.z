import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { useAuthStore } from '@/stores'
import { GoogleSheetsRepository } from '@/repositories/google-sheets/GoogleSheetsRepository'
import { isNetworkError } from '@/lib/errorUtils'
import { useQueryClient } from '@tanstack/react-query'

export type SyncVisualState = 'synced' | 'pending' | 'offline' | 'syncing' | 'error'

export interface SyncStatusInfo {
  isOnline: boolean
  pendingCount: number
  visualState: SyncVisualState
  isSyncing: boolean
  syncFeedback: string | null
  lastSyncResult: { action: string; message: string } | null
  triggerSync: () => Promise<{ success: boolean; message: string }>
}

/**
 * useSyncStatus — Hook reaktif untuk memantau status sinkronisasi,
 * jumlah data offline tertunda di IndexedDB, serta memicu smart bi-directional sync.
 */
export function useSyncStatus(): SyncStatusInfo {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore(s => s.accessToken)
  const setAccessToken = useAuthStore(s => s.setAccessToken)
  const currentUser = useAuthStore(s => s.currentUser)
  const setSpreadsheetId = useAuthStore(s => s.setSpreadsheetId)

  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null)
  const [lastSyncResult, setLastSyncResult] = useState<{ action: string; message: string } | null>(null)

  // Pantau status koneksi internet browser
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Live query menghitung transaksi lokal yang berstatus selain 'synced'
  const pendingCount = useLiveQuery(
    async () => {
      try {
        const count = await db.transactions
          .where('sync_status')
          .equals('local_only')
          .count()
        return count
      } catch {
        return 0
      }
    },
    [],
    0
  )

  // Status visual gabungan untuk UI (badge, warna, teks)
  const visualState: SyncVisualState = (() => {
    if (isSyncing) return 'syncing'
    if (!isOnline) return 'offline'
    if ((pendingCount || 0) > 0) return 'pending'
    return 'synced'
  })()

  // Eksekusi sinkronisasi dua arah cerdas (Smart Bi-directional Merge)
  const triggerSync = useCallback(async () => {
    let token = accessToken

    // Jika token kosong di state memori, coba silent re-acquire menggunakan email akun aktif
    if (!token && currentUser?.email) {
      const client_id = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
      const emailHint = currentUser.email.trim()
      if (client_id && typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
        try {
          const fetchedToken = await new Promise<string>((resolve, reject) => {
            const client = (window as any).google.accounts.oauth2.initTokenClient({
              client_id,
              scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets',
              hint: emailHint,
              callback: (response: any) => {
                if (response.error !== undefined) {
                  reject(new Error(response.error_description || response.error))
                  return
                }
                resolve(response.access_token)
              },
            })
            client.requestAccessToken({
              hint: emailHint,
              prompt: '',
            })
          })
          if (fetchedToken) {
            token = fetchedToken
            setAccessToken(fetchedToken)
          }
        } catch {
          token = null
        }
      }
    }

    if (!token) {
      return { success: false, message: 'Google Drive belum terhubung di Pengaturan' }
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncFeedback('Offline')
      setTimeout(() => setSyncFeedback(null), 3500)
      return {
        success: false,
        message: 'Perangkat sedang offline. Sambungkan ke internet untuk melakukan sinkronisasi.',
      }
    }

    setIsSyncing(true)
    setSyncFeedback(null)
    try {
      const repo = new GoogleSheetsRepository(token)
      const res = await repo.syncTwoWay()
      setSpreadsheetId(res.spreadsheetId)

      // Refresh seluruh cache data di UI
      await queryClient.invalidateQueries()

      setLastSyncResult({ action: res.action, message: res.message })
      setSyncFeedback('Tersinkron')
      setTimeout(() => setSyncFeedback(null), 3500)
      return { success: true, message: res.message }
    } catch (err: any) {
      console.error('[useSyncStatus] Error saat sinkronisasi:', err)
      const feedback = isNetworkError(err) ? 'Offline' : 'Gagal'
      setSyncFeedback(feedback)
      setTimeout(() => setSyncFeedback(null), 3500)
      return { success: false, message: err?.message || 'Gagal sinkronisasi data' }
    } finally {
      setIsSyncing(false)
    }
  }, [accessToken, currentUser?.email, setAccessToken, setSpreadsheetId, queryClient])

  return {
    isOnline,
    pendingCount: pendingCount || 0,
    visualState,
    isSyncing,
    syncFeedback,
    lastSyncResult,
    triggerSync,
  }
}
