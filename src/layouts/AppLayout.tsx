import { type ReactNode } from 'react'
import {
  Home,
  BarChart2,
  Plus,
  Wallet,
  User,
} from 'lucide-react'
import { useUIStore, type ActiveTab } from '@/stores'
import { AddTransactionModal } from '@/features/transactions/components/AddTransactionModal'
import { AddWalletModal }     from '@/features/wallet/components/AddWalletModal'

// ─────────────────────────────────────────────
// Bottom nav config
// ─────────────────────────────────────────────

interface NavItem {
  tab: ActiveTab
  icon: typeof Home
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { tab: 'dashboard',    icon: Home,       label: 'Beranda' },
  { tab: 'analytics',    icon: BarChart2,  label: 'Statistik' },
  // Center slot is the FAB — handled separately
  { tab: 'wallets',      icon: Wallet,     label: 'Dompet' },
  { tab: 'settings',     icon: User,       label: 'Profil' },
]

// ─────────────────────────────────────────────
// AppLayout
// ─────────────────────────────────────────────

interface AppLayoutProps {
  children: ReactNode
}

/**
 * AppLayout — The root shell for wllt.z.
 *
 * Structure:
 *   - Clamps to max-w-[430px] centered on desktop (feels native)
 *   - Full-height flex column: scrollable content + fixed bottom nav
 *   - Bottom nav: 4 tabs + center FAB, glass effect, safe-area aware
 *   - Micro-interactions: active tab indicator + FAB scale on press
 */
export function AppLayout({ children }: AppLayoutProps) {
  const activeTab          = useUIStore(s => s.activeTab)
  const navigateTo         = useUIStore(s => s.navigateTo)
  const openAddTransaction  = useUIStore(s => s.openAddTransaction)

  return (
    <div className="flex min-h-screen w-full items-start justify-center"
         style={{ background: 'var(--surface-0)' }}>
      {/* ── App shell — mobile viewport clamp ── */}
      <div className="relative flex h-screen w-full max-w-[430px] flex-col overflow-hidden">

        {/* ── Scrollable content area ── */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-[88px] scrollbar-none">
          {/* Top safe area (notch) */}
          <div className="safe-top" />
          {children}
        </main>

        {/* ── Bottom Navigation Bar ── */}
        <nav
          className="glass safe-bottom absolute inset-x-0 bottom-0 z-50"
          style={{
            borderTop: '1px solid var(--glass-border)',
            borderLeft: 'none',
            borderRight: 'none',
            borderRadius: 0,
            boxShadow: '0 -4px 24px oklch(0 0 0 / 8%)',
          }}
        >
          <div className="flex h-[72px] items-center justify-around px-2">

            {/* Left 2 tabs */}
            {NAV_ITEMS.slice(0, 2).map(({ tab, icon: Icon, label }) => (
              <NavTab
                key={tab}
                icon={Icon}
                label={label}
                isActive={activeTab === tab}
                onClick={() => navigateTo(tab)}
              />
            ))}

            {/* ── Center FAB ── */}
            <button
              id="fab-add-transaction"
              aria-label="Tambah transaksi"
              onClick={openAddTransaction}
              className={[
                'no-tap-highlight relative flex h-14 w-14 items-center justify-center',
                'rounded-full transition-all duration-200 shadow-lg',
                'active:scale-90 hover:opacity-90',
              ].join(' ')}
              style={{
                background: 'var(--accent)',
                boxShadow: '0 4px 16px var(--accent-glow)',
                marginBottom: '8px',
              }}
            >
              <Plus className="h-7 w-7 text-white" strokeWidth={2.5} />
            </button>

            {/* Right 2 tabs */}
            {NAV_ITEMS.slice(2).map(({ tab, icon: Icon, label }) => (
              <NavTab
                key={tab}
                icon={Icon}
                label={label}
                isActive={activeTab === tab}
                onClick={() => navigateTo(tab)}
              />
            ))}

          </div>
        </nav>
        {/* ── Global modals (always mounted, visibility via Zustand) ── */}
        <AddTransactionModal />
        <AddWalletModal />

      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// NavTab — individual bottom nav button
// ─────────────────────────────────────────────

interface NavTabProps {
  icon: typeof Home
  label: string
  isActive: boolean
  onClick: () => void
}

function NavTab({ icon: Icon, label, isActive, onClick }: NavTabProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={[
        'no-tap-highlight flex flex-col items-center justify-center gap-1',
        'h-14 w-16 rounded-xl transition-all duration-200',
        'active:scale-90',
      ].join(' ')}
    >
      {/* Active indicator dot */}
      <span
        className="mb-0.5 h-1 w-1 rounded-full transition-all duration-300"
        style={{
          background: isActive ? 'var(--accent)' : 'transparent',
          boxShadow: isActive ? '0 0 6px var(--accent-glow)' : 'none',
        }}
        aria-hidden="true"
      />

      <Icon
        className="h-5 w-5 transition-colors duration-200"
        style={{ color: isActive ? 'var(--accent)' : 'var(--text-faint)' }}
        strokeWidth={isActive ? 2.5 : 1.75}
      />

      <span
        className="text-[10px] font-semibold tracking-wide transition-colors duration-200"
        style={{ color: isActive ? 'var(--accent)' : 'var(--text-faint)' }}
      >
        {label}
      </span>
    </button>
  )
}
