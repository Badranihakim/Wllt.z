import { useState } from 'react'
import { Sparkles, Loader2, Check } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useUIStore } from '@/stores'
import { seedDummyData } from '@/lib/seedDummyData'
import { useDebugMode } from '@/lib/debug'
import { NetWorthCard }            from './NetWorthCard'
import { WalletSlider }            from './WalletSlider'
import { RecentTransactions }      from './RecentTransactions'
import { DashboardCashFlowChart }  from './DashboardCashFlowChart'
import { DashboardBudgetProgress } from './DashboardBudgetProgress'

/**
 * DashboardView — Main dashboard screen.
 *
 * Responsive layout:
 *   - Desktop: 2-column balanced grid with Financial Overview, Wallets,
 *     Weekly Cashflow Chart, Recent Transactions, and Budget Progress.
 *   - Mobile: Natural vertical stack.
 */
export function DashboardView() {
  const queryClient = useQueryClient()
  const navigateTo = useUIStore(s => s.navigateTo)
  const isDebug = useDebugMode()
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
      <div className="flex items-center justify-between pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            wllt<span style={{ color: 'var(--accent)' }}>.z</span>
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Keuanganmu, kendalimu</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Tarik Data Demo button (Only visible in debug mode ?debug=1) */}
          {isDebug && (
            <button
              type="button"
              onClick={handlePullDemo}
              disabled={isLoadingDemo}
              title="Tarik semua data demo ke dalam aplikasi"
              className="glass no-tap-highlight flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
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
          )}

          {/* Avatar placeholder / profile link */}
          <button
            onClick={() => navigateTo('settings')}
            aria-label="Profil & Pengaturan"
            className="glass no-tap-highlight flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all active:scale-90"
            style={{ color: 'var(--accent)', border: '1.5px solid var(--accent-dim)' }}
          >
            👤
          </button>
        </div>
      </div>

      {/* ── Responsive Dashboard Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-2">
        {/* Top Left: Net Worth Card & Wallet Slider */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <NetWorthCard />
          <WalletSlider />
        </div>

        {/* Top Right: Recent Transactions */}
        <div className="lg:col-span-5 flex flex-col">
          <RecentTransactions />
        </div>

        {/* Bottom Left: Cash Flow Trend Chart */}
        <div className="lg:col-span-7 flex flex-col">
          <DashboardCashFlowChart />
        </div>

        {/* Bottom Right: Category Budget Progress */}
        <div className="lg:col-span-5 flex flex-col">
          <DashboardBudgetProgress />
        </div>
      </div>
    </div>
  )
}

