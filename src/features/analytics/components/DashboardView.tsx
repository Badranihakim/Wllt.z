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

        {/* Avatar placeholder */}
        <button
          aria-label="Profil pengguna"
          className="glass no-tap-highlight flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all active:scale-90"
          style={{ color: 'var(--accent)', border: '1.5px solid var(--accent-dim)' }}
        >
          U
        </button>
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
