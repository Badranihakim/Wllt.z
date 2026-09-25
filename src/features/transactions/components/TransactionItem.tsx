import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Transaction } from '@/types'
import { formatSignedRupiah, formatRelativeDate } from '@/lib/formatters'

interface TransactionItemProps {
  transaction: Transaction
  categoryIcon?: string
  categoryName?: string
  /** Called when the user confirms deletion. Wired to useDeleteTransaction in parent. */
  onDelete?: (id: string) => void
  isDeleting?: boolean
}

const TYPE_ICON: Record<Transaction['type'], string> = {
  income:   '💰',
  expense:  '💸',
  transfer: '↔️',
  debt:     '🤝',
}

/**
 * TransactionItem — A single row in the transaction list.
 *
 * Delete UX: tap the trash icon → row expands a confirmation strip.
 * Tap "Hapus" to confirm, tap anywhere else to dismiss.
 * This avoids accidental swipe-delete on mobile.
 */
export function TransactionItem({
  transaction,
  categoryIcon,
  categoryName,
  onDelete,
  isDeleting = false,
}: TransactionItemProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  const icon      = categoryIcon ?? TYPE_ICON[transaction.type]
  const isIncome  = transaction.type === 'income' || transaction.type === 'debt'
  const isExpense = transaction.type === 'expense'

  const handleDeleteConfirm = () => {
    onDelete?.(transaction.id)
    setShowConfirm(false)
  }

  return (
    <div
      className="overflow-hidden transition-all duration-200"
      style={{
        opacity: isDeleting ? 0.4 : 1,
        pointerEvents: isDeleting ? 'none' : 'auto',
      }}
    >
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3 transition-colors duration-150"
        onMouseEnter={e => !showConfirm && (e.currentTarget.style.background = 'var(--surface-3)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {/* Category icon bubble */}
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lg"
          style={{
            background: isIncome
              ? 'var(--income-dim)'
              : isExpense
                ? 'var(--expense-dim)'
                : 'var(--surface-3)',
          }}
        >
          {icon}
        </div>

        {/* Title + meta */}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {transaction.title}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
            {categoryName ? `${categoryName} · ` : ''}
            {formatRelativeDate(transaction.date)}
          </span>
        </div>

        {/* Amount + sync dot */}
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <span
            className="text-sm font-bold tabular-nums"
            style={{
              color: isIncome
                ? 'var(--income)'
                : isExpense
                  ? 'var(--expense)'
                  : 'var(--text-primary)',
            }}
          >
            {formatSignedRupiah(transaction.amount, transaction.type, true)}
          </span>
          <SyncDot status={transaction.sync_status} />
        </div>

        {/* Delete trigger (only when onDelete prop provided) */}
        {onDelete && (
          <button
            type="button"
            aria-label="Hapus transaksi"
            onClick={e => { e.stopPropagation(); setShowConfirm(s => !s) }}
            className="no-tap-highlight ml-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-150 active:scale-90"
            style={{
              background: showConfirm ? 'var(--expense-dim)' : 'transparent',
              color: showConfirm ? 'var(--expense)' : 'var(--text-faint)',
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Confirm delete strip — slide down */}
      {showConfirm && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-2 text-xs"
          style={{ background: 'var(--expense-dim)' }}
        >
          <span className="font-medium" style={{ color: 'var(--expense)' }}>
            Hapus transaksi ini?
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="rounded-lg px-3 py-1.5 font-semibold transition-all active:scale-95"
              style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              className="rounded-lg px-3 py-1.5 font-bold text-white transition-all active:scale-95"
              style={{ background: 'var(--expense)', boxShadow: '0 2px 8px oklch(0.45 0.18 25 / 30%)' }}
            >
              Hapus
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// SyncDot
// ─────────────────────────────────────────────

interface SyncDotProps {
  status: Transaction['sync_status']
}

function SyncDot({ status }: SyncDotProps) {
  const config = {
    synced:     { color: 'var(--income)',    title: 'Tersinkron',    filled: true  },
    local_only: { color: 'var(--text-faint)', title: 'Belum sinkron', filled: false },
    syncing:    { color: 'var(--accent)',    title: 'Menyinkron...', filled: true  },
    failed:     { color: 'var(--expense)',   title: 'Gagal sinkron', filled: true  },
  }[status]

  return (
    <span
      title={config.title}
      aria-label={config.title}
      className="block h-1.5 w-1.5 rounded-full"
      style={{
        background: config.filled ? config.color : 'transparent',
        border: config.filled ? 'none' : `1.5px solid ${config.color}`,
      }}
    />
  )
}
