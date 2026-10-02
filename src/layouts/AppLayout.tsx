import { type ReactNode } from 'react'
import {
  Home,
  BarChart2,
  Plus,
  Wallet,
  User,
  ArrowRightLeft,
  Target,
  LogOut,
} from 'lucide-react'
import { useUIStore, type ActiveTab, useAuthStore } from '@/stores'
import { AddTransactionModal } from '@/features/transactions/components/AddTransactionModal'
import { AddWalletModal }     from '@/features/wallet/components/AddWalletModal'

// ─────────────────────────────────────────────
// Nav configs
// ─────────────────────────────────────────────

interface NavItem {
  tab: ActiveTab
  icon: any
  label: string
}

const MOBILE_NAV_ITEMS: NavItem[] = [
  { tab: 'dashboard',    icon: Home,       label: 'Beranda' },
  { tab: 'analytics',    icon: BarChart2,  label: 'Statistik' },
  // Center slot is the FAB — handled separately
  { tab: 'wallets',      icon: Wallet,     label: 'Dompet' },
  { tab: 'settings',     icon: User,       label: 'Profil' },
]

const DESKTOP_NAV_ITEMS: NavItem[] = [
  { tab: 'dashboard',    icon: Home,           label: 'Beranda' },
  { tab: 'analytics',    icon: BarChart2,      label: 'Statistik & Tren' },
  { tab: 'transactions', icon: ArrowRightLeft, label: 'Riwayat Transaksi' },
  { tab: 'wallets',      icon: Wallet,         label: 'Kelola Dompet' },
  { tab: 'budgets',      icon: Target,         label: 'Target Anggaran' },
  { tab: 'settings',     icon: User,           label: 'Profil & Pengaturan' },
]

// ─────────────────────────────────────────────
// AppLayout
// ─────────────────────────────────────────────

interface AppLayoutProps {
  children: ReactNode
}

/**
 * AppLayout — Responsive layout shell for wllt.z.
 *
 * - Desktop (md+): Spacious dashboard layout with a dedicated sidebar,
 *   full-width responsive container (max-w-6xl), and user profile switcher.
 * - Mobile (<md): Familiar mobile-native shell with bottom navigation and center FAB.
 */
export function AppLayout({ children }: AppLayoutProps) {
  const activeTab         = useUIStore(s => s.activeTab)
  const navigateTo        = useUIStore(s => s.navigateTo)
  const openAddTransaction = useUIStore(s => s.openAddTransaction)
  const currentUser       = useAuthStore(s => s.currentUser)
  const logout            = useAuthStore(s => s.logout)

  return (
    <div className="flex min-h-screen w-full"
         style={{ background: 'var(--surface-0)' }}>

      {/* ── Desktop Sidebar (Hidden on mobile) ── */}
      <aside
        className="hidden md:flex md:w-64 lg:w-72 flex-col justify-between shrink-0 h-screen sticky top-0 border-r border-slate-200/80 dark:border-slate-800/80 p-5 z-40"
        style={{ background: 'var(--surface-1)' }}
      >
        <div className="flex flex-col gap-6">
          {/* Brand header */}
          <div className="flex items-center gap-3 px-2 pt-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-xl shadow-md"
              style={{
                background: 'oklch(0.975 0.004 240)',
                border: '1px solid var(--glass-border)',
              }}
            >
              💎
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                wllt<span style={{ color: 'var(--accent)' }}>.z</span>
              </h1>
              <p className="text-[11px] font-medium" style={{ color: 'var(--text-faint)' }}>
                Personal Finance & Accounting
              </p>
            </div>
          </div>

          {/* Quick Add Transaction Button */}
          <button
            type="button"
            onClick={openAddTransaction}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-2xl text-sm font-bold text-white transition-all shadow-md active:scale-95 hover:opacity-90 cursor-pointer"
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-foreground, #fff)',
            }}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Catat Transaksi</span>
          </button>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {DESKTOP_NAV_ITEMS.map(({ tab, icon: Icon, label }) => {
              const isActive = activeTab === tab
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => navigateTo(tab)}
                  className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 text-left cursor-pointer"
                  style={{
                    background: isActive ? 'var(--surface-3)' : 'transparent',
                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  <Icon
                    className="w-4 h-4 transition-colors"
                    style={{ color: isActive ? 'var(--accent)' : 'var(--text-faint)' }}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span>{label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* User Profile Card & Logout Footer */}
        <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm"
              style={{ background: 'var(--surface-3)', color: 'var(--accent)' }}
            >
              {currentUser?.avatar || '👤'}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                {currentUser?.name || 'Pengguna'}
              </span>
              <span className="text-[10px] truncate" style={{ color: 'var(--text-faint)' }}>
                {currentUser?.email || 'Akun Lokal'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            title="Keluar / Ganti Akun"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-red-50 text-slate-400 hover:text-red-500 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ── Main Scrollable Content Area ── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Mobile Header with current user badge & logout (md:hidden) */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200/60 dark:border-slate-800/60"
             style={{ background: 'var(--surface-1)' }}>
          <div className="flex items-center gap-2">
            <span className="text-lg">💎</span>
            <span className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              wllt<span style={{ color: 'var(--accent)' }}>.z</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {currentUser?.name || 'Tamu'}
            </span>
            <button
              type="button"
              onClick={logout}
              title="Keluar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Content View */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6 pb-24 md:pb-12">
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Navigation Bar (md:hidden) ── */}
      <nav
        className="md:hidden glass safe-bottom fixed inset-x-0 bottom-0 z-50"
        style={{
          borderTop: '1px solid var(--glass-border)',
          boxShadow: '0 -4px 24px oklch(0 0 0 / 8%)',
        }}
      >
        <div className="flex h-[72px] items-center justify-around px-2 max-w-md mx-auto">
          {/* Left 2 tabs */}
          {MOBILE_NAV_ITEMS.slice(0, 2).map(({ tab, icon: Icon, label }) => (
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
          {MOBILE_NAV_ITEMS.slice(2).map(({ tab, icon: Icon, label }) => (
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

      {/* ── Global modals ── */}
      <AddTransactionModal />
      <AddWalletModal />
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
