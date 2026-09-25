import './App.css'
import { AppLayout }          from '@/layouts/AppLayout'
import { DashboardView }      from '@/features/analytics/components/DashboardView'
import { TransactionsView }   from '@/features/transactions/components/TransactionsView'
import { WalletsView }        from '@/features/wallet/components/WalletsView'
import { StatisticsView }     from '@/features/analytics/components/StatisticsView'
import { BudgetsView }        from '@/features/budgets/components'
import { SettingsView }       from '@/features/profile/components'
import { useUIStore }         from '@/stores'
import type { ActiveTab }     from '@/stores'

// ─────────────────────────────────────────────
// Placeholder views (will be replaced in future tasks)
// ─────────────────────────────────────────────

function PlaceholderView({ tab }: { tab: ActiveTab }) {
  const labels: Record<ActiveTab, { emoji: string; title: string; sub: string }> = {
    dashboard:    { emoji: '🏠', title: 'Dashboard',    sub: '' },
    analytics:    { emoji: '📈', title: 'Statistik',    sub: 'Laporan visual dan tren akan hadir di sini.' },
    transactions: { emoji: '↔️', title: 'Transaksi',    sub: 'Riwayat lengkap transaksi akan hadir di sini.' },
    wallets:      { emoji: '👛', title: 'Dompet',       sub: 'Manajemen dompet & akun akan hadir di sini.' },
    budgets:      { emoji: '📊', title: 'Anggaran',     sub: 'Pelacak anggaran bulanan akan hadir di sini.' },
    settings:     { emoji: '⚙️', title: 'Profil',       sub: 'Konfigurasi akun & sinkronisasi akan hadir di sini.' },
  }

  const { emoji, title, sub } = labels[tab]

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-8 text-center">
      <span className="text-6xl">{emoji}</span>
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        {sub && <p className="mt-1 text-sm" style={{ color: 'var(--text-faint)' }}>{sub}</p>}
      </div>
      <div
        className="mt-2 rounded-full px-4 py-1.5 text-xs font-semibold"
        style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
      >
        Segera hadir
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// App — Tab router
// ─────────────────────────────────────────────

/**
 * App — Root component. Reads activeTab from Zustand and renders
 * the appropriate view inside AppLayout.
 *
 * Routing is intentionally simple (no React Router) for this phase —
 * it will be upgraded to a proper router in a future task.
 */
function App() {
  const activeTab = useUIStore(s => s.activeTab)

  const currentView = (() => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />
      case 'transactions':
        return <TransactionsView />
      case 'wallets':
        return <WalletsView />
      case 'budgets':
        return <BudgetsView />
      case 'settings':
        return <SettingsView />
      case 'analytics':
        return <StatisticsView />
      default:
        return <PlaceholderView tab={activeTab} />
    }
  })()

  return (
    <AppLayout>
      {currentView}
    </AppLayout>
  )
}

export default App
