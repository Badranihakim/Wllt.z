import { ChevronRight } from 'lucide-react'
import { useTransactions } from '@/features/transactions/hooks'
import { useUIStore } from '@/stores'
import { TransactionItem } from '@/features/transactions/components/TransactionItem'
import { EmptyState } from '@/features/transactions/components/EmptyState'

const MAX_RECENT = 5

/**
 * RecentTransactions — Shows the 5 most recent transactions for the active
 * wallet + period. Navigates to the full transaction list on "See All".
 */
export function RecentTransactions() {
  const navigateTo = useUIStore(s => s.navigateTo)

  const { data: allTransactions = [], isLoading } = useTransactions()

  // Sort newest first, take top 5
  const recent = [...allTransactions]
    .sort((a, b) => b.date.localeCompare(a.date) || b.updated_at.localeCompare(a.updated_at))
    .slice(0, MAX_RECENT)

  return (
    <div className="mt-6 px-4 pb-4">
      {/* ── Section header ── */}
      <div className="mb-3 flex items-center justify-between">
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}
        >
          Transaksi Terakhir
        </span>
        <button
          onClick={() => navigateTo('transactions')}
          className="no-tap-highlight flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors active:scale-95"
          style={{ color: 'var(--accent)' }}
        >
          Lihat Semua
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Card ── */}
      <div
        className="overflow-hidden rounded-3xl"
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--glass-border)',
          boxShadow: '0 2px 16px oklch(0 0 0 / 6%)',
        }}
      >
        {isLoading ? (
          /* Skeleton rows */
          <div className="divide-y" style={{ borderColor: 'var(--glass-border)' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <TransactionSkeletonRow key={i} />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <EmptyState
            icon="📭"
            message="Belum ada transaksi"
            subMessage="Ketuk tombol + untuk mencatat transaksi pertamamu"
          />
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--glass-border)' }}>
            {recent.map(txn => (
              <TransactionItem
                key={txn.id}
                transaction={txn}
                /* Category lookup will be added when category hooks are wired */
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Skeleton row
// ─────────────────────────────────────────────

function TransactionSkeletonRow() {
  return (
    <div className="flex animate-pulse items-center gap-3 px-4 py-3">
      <div className="h-10 w-10 flex-shrink-0 rounded-xl" style={{ background: 'var(--surface-3)' }} />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-3 w-32 rounded-full" style={{ background: 'var(--surface-3)' }} />
        <div className="h-2.5 w-20 rounded-full" style={{ background: 'var(--surface-2)' }} />
      </div>
      <div className="h-3 w-16 rounded-full" style={{ background: 'var(--surface-3)' }} />
    </div>
  )
}
