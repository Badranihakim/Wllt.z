import { useState } from 'react'
import { Sparkles, Loader2, Check } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useUIStore } from '@/stores'
import { seedDummyData } from '@/lib/seedDummyData'
import { NetWorthCard }       from './NetWorthCard'
import { WalletSlider }       from './WalletSlider'
import { RecentTransactions } from './RecentTransactions'

/**
 * DashboardView — Main dashboard screen.
 *
 * Assembles 3 sections vertically:
 *   1. NetWorthCard   — hero balance + period summary
 *   2. WalletSlider   — horizontal wallet selector
 *   3. RecentTransactions — last 5 transactions
 *
 * All data is fetched directly by child components via TanStack Query hooks.
 * This component is a pure layout assembler — no business logic here.
 */
export function DashboardView() {
  const queryClient = useQueryClient()
  const navigateTo = useUIStore(s => s.navigateTo)
  const [isLoadingDemo, setIsLoadingDemo] = useState(false)
  const [demoSuccess, setDemoSuccess] = useState(false)

  const handlePullDemo = async () => {
    setIsLoadingDemo(true)
    try {
      await seedDummyData(true)
      await queryClient.invalidateQueries()
      setDemoSuccess(true)
      setTimeout(() => setDemoSuccess(false), 3000)
    } catch (err) {
      console.error('[DashboardView] Failed to pull demo data:', err)
    } finally {
      setIsLoadingDemo(false)
    }
  }

  return (
    <div className="min-h-full">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between px-4 pt-6 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            wllt<span style={{ color: 'var(--accent)' }}>.z</span>
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Keuanganmu, kendalimu</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Tarik Data Demo button */}
          <button
            type="button"
            onClick={handlePullDemo}
            disabled={isLoadingDemo}
            title="Tarik semua data demo ke dalam aplikasi"
            className="glass no-tap-highlight flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: demoSuccess ? 'oklch(0.52 0.17 160 / 15%)' : 'var(--accent-dim)',
              color: demoSuccess ? 'var(--income)' : 'var(--accent)',
              border: `1px solid ${demoSuccess ? 'var(--income)' : 'var(--accent)'}`,
            }}
          >
            {isLoadingDemo ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : demoSuccess ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span>{demoSuccess ? 'Tersedia!' : 'Tarik Data Demo'}</span>
          </button>

          {/* Avatar placeholder / profile link */}
          <button
            onClick={() => navigateTo('settings')}
            aria-label="Profil & Pengaturan"
            className="glass no-tap-highlight flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all active:scale-90"
            style={{ color: 'var(--accent)', border: '1.5px solid var(--accent-dim)' }}
          >
            U
          </button>
        </div>
      </div>

      {/* ── Section 1: Net Worth + Period ── */}
      <NetWorthCard />

      {/* ── Section 2: Wallet Selector ── */}
      <WalletSlider />

      {/* ── Section 3: Recent Transactions ── */}
      <RecentTransactions />
    </div>
  )
}

