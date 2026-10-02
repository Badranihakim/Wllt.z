import { Plus } from 'lucide-react'
import { useWallets } from '@/features/wallet/hooks'
import { useUIStore } from '@/stores'
import { WalletCard } from '@/features/wallet/components/WalletCard'
import { formatRupiah } from '@/lib/formatters'

/**
 * WalletSlider — Horizontal scrollable wallet selector.
 * Light mode: clean white pills, Electric Blue active state.
 */
export function WalletSlider() {
  const activeWalletId  = useUIStore(s => s.activeWalletId)
  const setActiveWallet = useUIStore(s => s.setActiveWallet)
  const openAddWallet   = useUIStore(s => s.openAddWallet)

  const { data: wallets = [], isLoading } = useWallets()

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0)

  return (
    <div className="mt-2">
      {/* Section label */}
      <div className="mb-3 flex items-center justify-between">
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}
        >
          Dompet
        </span>
        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
          {wallets.length} aktif
        </span>
      </div>

      {/* Horizontal scroll row */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {/* ── "All Wallets" aggregate pill ── */}
        <button
          onClick={() => setActiveWallet(null)}
          aria-label="Tampilkan semua dompet"
          aria-pressed={activeWalletId === null}
          className={[
            'no-tap-highlight flex flex-shrink-0 flex-col items-start gap-1',
            'rounded-2xl px-4 py-3 transition-all duration-200 active:scale-95',
          ].join(' ')}
          style={{
            minWidth: '124px',
            background: activeWalletId === null ? 'var(--accent-dim)' : 'var(--surface-2)',
            border: activeWalletId === null
              ? '1.5px solid var(--accent)'
              : '1px solid var(--glass-border)',
            boxShadow: activeWalletId === null
              ? '0 2px 12px var(--accent-glow)'
              : '0 1px 4px oklch(0 0 0 / 6%)',
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-xl text-base"
              style={{
                background: activeWalletId === null ? 'var(--accent-dim)' : 'var(--surface-3)',
              }}
            >
              🗂️
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: activeWalletId === null ? 'var(--accent)' : 'var(--text-primary)' }}
            >
              Semua
            </span>
          </div>
          <span
            className="text-xs font-medium"
            style={{ color: activeWalletId === null ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            {formatRupiah(totalBalance, true)}
          </span>
        </button>

        {/* ── Individual wallet pills ── */}
        {isLoading
          ? Array.from({ length: 2 }).map((_, i) => (
              <WalletSkeletonPill key={i} />
            ))
          : wallets.map(wallet => (
              <WalletCard
                key={wallet.id}
                wallet={wallet}
                isActive={activeWalletId === wallet.id}
                onClick={() => setActiveWallet(wallet.id)}
              />
            ))
        }

        {/* ── Add wallet button ── */}
        <button
          onClick={openAddWallet}
          aria-label="Tambah dompet baru"
          className="no-tap-highlight flex flex-shrink-0 flex-col items-center justify-center gap-1 rounded-2xl px-5 py-3 transition-all duration-200 active:scale-95"
          style={{
            minWidth: '72px',
            minHeight: '84px',
            background: 'var(--surface-2)',
            border: '1.5px dashed var(--glass-border-active)',
          }}
        >
          <Plus className="h-5 w-5" style={{ color: 'var(--text-faint)' }} />
          <span className="text-[10px] font-medium" style={{ color: 'var(--text-faint)' }}>
            Tambah
          </span>
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Skeleton placeholder
// ─────────────────────────────────────────────

function WalletSkeletonPill() {
  return (
    <div
      className="flex flex-shrink-0 animate-pulse flex-col gap-2 rounded-2xl p-3"
      style={{ minWidth: '124px', minHeight: '84px', background: 'var(--surface-2)' }}
    >
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl" style={{ background: 'var(--surface-3)' }} />
        <div className="h-3 w-16 rounded-full" style={{ background: 'var(--surface-3)' }} />
      </div>
      <div className="h-2.5 w-12 rounded-full" style={{ background: 'var(--surface-3)' }} />
    </div>
  )
}
