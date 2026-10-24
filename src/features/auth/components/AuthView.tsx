import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores'
import { bootstrapLocalDB } from '@/lib/seedDefaultData'
import { GoogleSheetsRepository } from '@/repositories/google-sheets/GoogleSheetsRepository'
import { ShieldCheck, Loader2 } from 'lucide-react'

interface AuthViewProps {
  onSuccess?: () => void
}

export function AuthView({ onSuccess }: AuthViewProps) {
  const queryClient = useQueryClient()
  const { loginWithGoogle, setAccessToken, setSpreadsheetId } = useAuthStore()

  const [error, setError] = useState<string | null>(null)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const handleGoogleLogin = () => {
    setError(null)
    const client_id = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
    if (!client_id) {
      setError('Client ID Google tidak ditemukan (VITE_GOOGLE_CLIENT_ID)')
      return
    }

    try {
      setIsGoogleLoading(true)
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: async (response: any) => {
          if (response.error !== undefined) {
            setError(response.error)
            setIsGoogleLoading(false)
            return
          }

          try {
            const token = response.access_token
            setAccessToken(token)

            // 1. Fetch user profile from Google UserInfo endpoint
            const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${token}` },
            })
            const info = await infoRes.json()

            // 2. Login & set active database user
            await loginWithGoogle({
              email: info.email,
              name: info.name || info.given_name || 'Google User',
              avatar: info.picture,
              sub: info.sub,
            })

            // 3. Initialize default structures (wallets & categories)
            await bootstrapLocalDB()

            // 4. Check Google Drive for existing sync data and restore if available
            try {
              const cloudRepo = new GoogleSheetsRepository(token)
              const spreadsheetId = await cloudRepo.getOrCreateSpreadsheet()
              setSpreadsheetId(spreadsheetId)

              // Attempt to pull existing data from Drive
              await cloudRepo.pullFromDrive(spreadsheetId)
            } catch (driveErr) {
              console.warn('[AuthView] Sync check on Google login:', driveErr)
            }

            // 5. Invalidate react-query cache and finish login
            await queryClient.invalidateQueries()
            onSuccess?.()
          } catch (err: any) {
            console.error('[AuthView] Google login error:', err)
            setError(err?.message || 'Gagal menyelesaikan masuk dengan Google')
          } finally {
            setIsGoogleLoading(false)
          }
        },
      })
      client.requestAccessToken()
    } catch (err: any) {
      setIsGoogleLoading(false)
      setError(err?.message || 'Gagal memuat Google Identity Services')
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 sm:p-6"
         style={{ background: 'var(--surface-0)' }}>
      {/* Background ambient gradient */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 20%, oklch(0.85 0.1 240 / 30%), transparent)',
        }}
      />

      <div className="relative w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl transition-all duration-300 border border-slate-100 dark:border-slate-800"
           style={{ background: 'var(--surface-1)' }}>
        
        {/* Header / Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-lg mb-3"
               style={{ background: 'oklch(0.975 0.004 240)', border: '1px solid var(--glass-border)' }}>
            💎
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            wllt<span style={{ color: 'var(--accent)' }}>.z</span>
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
            Aplikasi Catatan Keuangan Pribadi & Akuntansi
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 rounded-xl p-3 text-xs font-semibold flex items-center gap-2 border border-red-200 dark:border-red-900/50"
               style={{ background: 'var(--expense-dim)', color: 'var(--expense)' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading}
          className="w-full py-3.5 px-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-3 transition-all border shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          style={{
            background: 'var(--surface-2)',
            color: 'var(--text-primary)',
            borderColor: 'var(--glass-border)',
          }}
        >
          {isGoogleLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span>Menghubungkan ke Google...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Masuk dengan Google</span>
            </>
          )}
        </button>

        {/* Privacy Note */}
        <div className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Setiap akun memiliki penyimpanan database terpisah & aman.</span>
        </div>
      </div>
    </div>
  )
}
