import type { Wallet } from '@/types'
import { formatRupiah } from '@/lib/formatters'

interface WalletCardProps {
  wallet: Wallet
  isActive: boolean
  onClick: () => void
}

/**
 * WalletCard — Compact horizontal wallet pill for the wallet selector slider.
 * Light mode: white card with Electric Blue active state.
 */
export function WalletCard({ wallet, isActive, onClick }: WalletCardProps) {
  return (
    <button
      onClick={onClick}
      aria-label={`Pilih dompet ${wallet.name}`}
      aria-pressed={isActive}
      className="no-tap-highlight flex flex-shrink-0 flex-col items-start gap-1 rounded-2xl px-4 py-3 transition-all duration-200 active:scale-95"
      style={{
        minWidth: '124px',
        background: isActive ? 'var(--accent-dim)' : 'var(--surface-2)',
        border: isActive ? '1.5px solid var(--accent)' : '1px solid var(--glass-border)',
        boxShadow: isActive
          ? '0 2px 12px var(--accent-glow)'
          : '0 1px 4px oklch(0 0 0 / 6%)',
      }}
    >
      {/* Icon + Name row */}
      <div className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-xl text-base"
          style={{ background: isActive ? 'var(--accent-dim)' : 'var(--surface-3)' }}
        >
          {wallet.icon}
        </span>
        <span
          className="text-sm font-semibold leading-tight"
          style={{ color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}
        >
          {wallet.name}
        </span>
      </div>

      {/* Balance */}
      <span
        className="text-xs font-medium"
        style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
      >
        {formatRupiah(wallet.balance, true)}
      </span>
    </button>
  )
}
