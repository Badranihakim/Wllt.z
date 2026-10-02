import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores'
import { bootstrapLocalDB } from '@/lib/seedDefaultData'
import { LogIn, UserPlus, ShieldCheck } from 'lucide-react'

interface AuthViewProps {
  onSuccess?: () => void
}

export function AuthView({ onSuccess }: AuthViewProps) {
  const queryClient = useQueryClient()
  const { login, register } = useAuthStore()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (mode === 'login') {
        const res = login(email, password)
        if (!res.success) {
          setError(res.error || 'Gagal masuk. Periksa email dan password Anda.')
          return
        }
      } else {
        const res = register(name, email, password)
        if (!res.success) {
          setError(res.error || 'Gagal mendaftar. Silakan coba lagi.')
          return
        }
      }

      // Initialize DB & refresh queries
      await bootstrapLocalDB()
      await queryClient.invalidateQueries()
      onSuccess?.()
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan sistem.')
    } finally {
      setIsSubmitting(false)
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
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-lg mb-3"
               style={{ background: 'oklch(0.975 0.004 240)', border: '1px solid var(--glass-border)' }}>
            💎
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            wllt<span style={{ color: 'var(--accent)' }}>.z</span>
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
            Aplikasi Catatan Keuangan Pribadi & Akuntansi Multi-User
          </p>
        </div>

        {/* Tab Toggle (Masuk vs Daftar) */}
        <div className="flex rounded-2xl p-1 mb-6 border border-slate-200/50 dark:border-slate-800/50"
             style={{ background: 'var(--surface-3)' }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null) }}
            className="flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
            style={{
              background: mode === 'login' ? 'var(--surface-1)' : 'transparent',
              color: mode === 'login' ? 'var(--text-primary)' : 'var(--text-faint)',
              boxShadow: mode === 'login' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <LogIn className="w-3.5 h-3.5" />
            Masuk
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null) }}
            className="flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
            style={{
              background: mode === 'register' ? 'var(--surface-1)' : 'transparent',
              color: mode === 'register' ? 'var(--text-primary)' : 'var(--text-faint)',
              boxShadow: mode === 'register' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Daftar Akun Baru
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 rounded-xl p-3 text-xs font-semibold flex items-center gap-2 border border-red-200 dark:border-red-900/50"
               style={{ background: 'var(--expense-dim)', color: 'var(--expense)' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                Nama Lengkap
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="misal: Rayan"
                className="w-full rounded-2xl px-4 py-3 text-sm font-medium outline-none border transition-all"
                style={{
                  background: 'var(--surface-3)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--glass-border)',
                }}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              Email atau Username
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com atau username"
              className="w-full rounded-2xl px-4 py-3 text-sm font-medium outline-none border transition-all"
              style={{
                background: 'var(--surface-3)',
                color: 'var(--text-primary)',
                borderColor: 'var(--glass-border)',
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 4 karakter"
              className="w-full rounded-2xl px-4 py-3 text-sm font-medium outline-none border transition-all"
              style={{
                background: 'var(--surface-3)',
                color: 'var(--text-primary)',
                borderColor: 'var(--glass-border)',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3.5 rounded-2xl text-sm font-bold !text-white transition-all shadow-md active:scale-98 disabled:opacity-50"
            style={{
              background: 'var(--accent)',
              color: '#ffffff',
            }}
          >
            {isSubmitting
              ? 'Memproses...'
              : mode === 'login'
              ? 'Masuk ke Catatan Saya'
              : 'Daftar & Buat Akuntansi Baru'}
          </button>
        </form>

        {/* Privacy Note */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Setiap akun memiliki penyimpanan database terpisah & aman.</span>
        </div>
      </div>
    </div>
  )
}
