import { useState } from 'react'
import { Cloud, CheckCircle2, Loader2, Database, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/stores'
import { GoogleSheetsRepository } from '@/repositories/google-sheets/GoogleSheetsRepository'
import { transactionRepo } from '@/repositories'

export function SettingsView() {
  const { accessToken, setAccessToken, setSpreadsheetId } = useAuthStore()
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error' | 'session_expired'>('idle')

  const handleConnect = () => {
    setError(null)
    const client_id = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
    if (!client_id) {
      setError('Client ID tidak ditemukan (VITE_GOOGLE_CLIENT_ID)')
      return
    }

    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets',
        callback: (response: any) => {
          if (response.error !== undefined) {
            setError(response.error)
            return
          }
          setAccessToken(response.access_token)
          // Initiate sync immediately after connect
          handleSync(response.access_token)
        },
      })
      client.requestAccessToken()
    } catch (err: any) {
      setError(err.message || 'Gagal memuat Google Identity Services')
    }
  }

  const handleSync = async (token: string = accessToken!) => {
    if (!token) return
    setIsSyncing(true)
    setSyncStatus('syncing')
    setError(null)

    try {
      const cloudRepo = new GoogleSheetsRepository(token)
      const spreadsheetId = await cloudRepo.getOrCreateSpreadsheet()
      setSpreadsheetId(spreadsheetId)

      // Fetch local_only transactions
      const localTxs = await transactionRepo.findBySyncStatus('local_only')
      
      if (localTxs.length > 0) {
        await cloudRepo.appendTransactions(spreadsheetId, localTxs)
        await transactionRepo.markAsSynced(localTxs.map(t => t.id))
      }
      
      setSyncStatus('synced')
    } catch (err: any) {
      console.error(err)
      if (err.message === 'Session Expired') {
        setSyncStatus('session_expired')
      } else {
        setError(err.message || 'Gagal sinkronisasi data')
        setSyncStatus('error')
      }
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--surface-1)' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 pb-3 pt-4 mb-4">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Pengaturan
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-6">
        
        {/* Account Info placeholder */}
        <div 
          className="flex flex-col items-center justify-center p-6 rounded-3xl"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--glass-border)' }}
        >
          <div className="h-20 w-20 rounded-full mb-3 flex items-center justify-center text-3xl shadow-sm" style={{ background: 'var(--surface-3)' }}>
            👤
          </div>
          <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Pengguna Lokal</h2>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Data tersimpan aman di peramban Anda</p>
        </div>

        {/* Cloud Sync Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Cloud Sync (Google Sheets)
          </h3>
          
          <div 
            className="p-4 rounded-3xl"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--glass-border)' }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-xl" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                <Database className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Sinkronisasi Data</p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-faint)' }}>
                  Hubungkan ke Google Drive untuk mem-backup dan menyinkronkan data transaksi Anda ke Google Sheets.
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 mb-4 p-3 rounded-xl text-xs font-medium text-red-600 bg-red-50">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {!accessToken ? (
              <>
                {syncStatus === 'session_expired' && (
                  <div className="flex items-start gap-2 mb-4 p-3 rounded-xl text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>Sesi Google Anda telah berakhir demi keamanan. Silakan hubungkan kembali akun Anda.</p>
                  </div>
                )}
                <button
                  onClick={handleConnect}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  <Cloud className="w-4 h-4" />
                  {syncStatus === 'session_expired' ? 'Hubungkan Kembali Akun Google' : 'Hubungkan Google Drive'}
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--surface-3)' }}>
                  <div className="flex items-center gap-2">
                    {syncStatus === 'syncing' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    ) : syncStatus === 'synced' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Cloud className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    )}
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Status Sinkronisasi
                    </span>
                  </div>
                  <span className="text-xs font-bold" style={{ color: 'var(--text-faint)' }}>
                    {syncStatus === 'syncing' ? 'Sedang Menyinkronkan...' 
                      : syncStatus === 'synced' ? 'Tersinkronisasi' 
                      : syncStatus === 'error' ? 'Gagal Sinkronisasi'
                      : 'Terhubung'}
                  </span>
                </div>

                <button
                  onClick={() => handleSync()}
                  disabled={isSyncing}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
