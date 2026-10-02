import { useState } from 'react'
import { Cloud, CheckCircle2, Loader2, Database, AlertCircle, Sparkles, Download, Trash2, RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores'
import { GoogleSheetsRepository } from '@/repositories/google-sheets/GoogleSheetsRepository'
import { transactionRepo } from '@/repositories'
import { seedDummyData, clearAllData, exportAllData } from '@/lib/seedDummyData'
import { useDebugMode } from '@/lib/debug'

export function SettingsView() {
  const queryClient = useQueryClient()
  const isDebug = useDebugMode()
  const { accessToken, setAccessToken, setSpreadsheetId, currentUser, logout } = useAuthStore()
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error' | 'session_expired'>('idle')
  const [isSeeding, setIsSeeding] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [dummySuccess, setDummySuccess] = useState<string | null>(null)

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

  const handleSeedDummy = async () => {
    setIsSeeding(true)
    setError(null)
    try {
      await seedDummyData(true)
      await queryClient.invalidateQueries()
      setDummySuccess('Semua data demo berhasil ditarik dan dimuat!')
      setTimeout(() => setDummySuccess(null), 3500)
    } catch (err: any) {
      console.error('[SettingsView] Error seeding dummy data:', err)
      setError(err?.message || 'Gagal memuat data demo')
    } finally {
      setIsSeeding(false)
    }
  }

  const handleClearData = async () => {
    if (!window.confirm('Yakin ingin membersihkan semua data transaksi, anggaran, dan dompet?')) {
      return
    }
    setIsClearing(true)
    setError(null)
    try {
      await clearAllData()
      await queryClient.invalidateQueries()
      setDummySuccess('Semua data berhasil dibersihkan kembali ke awal.')
      setTimeout(() => setDummySuccess(null), 3500)
    } catch (err: any) {
      console.error('[SettingsView] Error clearing data:', err)
      setError(err?.message || 'Gagal membersihkan data')
    } finally {
      setIsClearing(false)
    }
  }

  const handleExportData = async () => {
    try {
      await exportAllData()
    } catch (err: any) {
      console.error('[SettingsView] Error exporting data:', err)
      setError(err?.message || 'Gagal mengekspor data')
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
        
        {/* Account Info card */}
        <div 
          className="flex flex-col items-center justify-center p-6 rounded-3xl"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--glass-border)' }}
        >
          <div className="h-20 w-20 rounded-full mb-3 flex items-center justify-center text-3xl shadow-sm" style={{ background: 'var(--surface-3)' }}>
            {currentUser?.avatar || '👤'}
          </div>
          <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            {currentUser?.name || 'Pengguna Lokal'}
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
            {currentUser?.email || 'Data tersimpan aman di database terisolasi'}
          </p>
          <button
            type="button"
            onClick={logout}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-red-200 dark:border-red-900/60 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            Keluar / Ganti Akun
          </button>
        </div>

        {/* Demo Data Section (Hanya tampil jika mode debug aktif via URL ?debug=1) */}
        {isDebug && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <span>🛠️</span>
                <span>Mode Pengembang (debug=1)</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                Data Simulasi
              </span>
            </div>
            
            <div 
              className="p-4 rounded-3xl space-y-3 border border-amber-500/20"
              style={{ background: 'var(--surface-2)' }}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Kelola Data Demo</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-faint)' }}>
                    Tarik semua paket data demo (6 dompet, puluhan transaksi, anggaran bulanan, dan statistik pengeluaran), ekspor, atau reset data.
                  </p>
                </div>
              </div>

              {dummySuccess && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <p>{dummySuccess}</p>
                </div>
              )}

              {/* Primary Action: Tarik Semua Data Demo */}
              <button
                onClick={handleSeedDummy}
                disabled={isSeeding || isClearing}
                className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-white shadow-md cursor-pointer"
                style={{
                  background: 'var(--accent)',
                  boxShadow: '0 4px 16px var(--accent-glow)',
                  color: '#ffffff',
                }}
              >
                {isSeeding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sedang Menarik Data Demo...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Tarik Semua Data Demo</span>
                  </>
                )}
              </button>

              {/* Secondary Actions Row: Ekspor & Bersihkan */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleExportData}
                  disabled={isSeeding || isClearing}
                  className="py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  style={{
                    background: 'var(--surface-3)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh JSON</span>
                </button>

                <button
                  onClick={handleClearData}
                  disabled={isSeeding || isClearing}
                  className="py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 text-red-500 cursor-pointer"
                  style={{
                    background: 'var(--surface-3)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  {isClearing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Hapus Data</span>
                </button>
              </div>
            </div>
          </div>
        )}

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
