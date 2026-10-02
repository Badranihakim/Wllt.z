import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { useWallets } from '@/features/wallet/hooks'
import { useTransactionSummary } from '@/features/transactions/hooks'
import { useUIStore, getPreviousPeriod, getNextPeriod } from '@/stores'
import { formatRupiah, formatPeriod } from '@/lib/formatters'

/**
 * NetWorthCard — Hero card showing total balance + income/expense summary.
 *
 * Reads data from:
 *   - useWallets() → sum of all active wallet balances
 *   - useTransactionSummary() → period income/expense
 *   - useUIStore → currentPeriod for period navigation
 */
export function NetWorthCard() {
  const currentPeriod   = useUIStore(s => s.currentPeriod)
  const setCurrentPeriod = useUIStore(s => s.setCurrentPeriod)
  const isSyncing       = useUIStore(s => s.isSyncing)

  const { data: wallets = [] }  = useWallets()
  const { data: summary }       = useTransactionSummary()

  const totalBalance = wallets
    .filter(w => !w.exclude_from_total)
    .reduce((sum, w) => sum + w.balance, 0)
  const income  = summary?.income  ?? 0
  const expense = summary?.expense ?? 0

  return (
    <div
      className="glass rounded-3xl p-5"
      style={{ boxShadow: '0 4px 24px oklch(0 0 0 / 8%), 0 1px 4px oklch(0 0 0 / 4%)' }}
    >
      {/* ── Header row ── */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Total Saldo
        </span>
        <button
          aria-label="Refresh"
          className="rounded-lg p-1.5 transition-colors active:scale-90"
          style={{ color: 'var(--text-faint)' }}
        >
          <RefreshCw
            className="h-3.5 w-3.5"
            style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }}
          />
        </button>
      </div>

      {/* ── Net worth amount ── */}
      <div className="mb-1">
        <span
          className="block text-4xl font-bold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {formatRupiah(totalBalance)}
        </span>
      </div>

      {/* ── Income / Expense row ── */}
      <div className="mb-5 flex gap-4">
        {/* Income */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: 'var(--income)' }} aria-hidden="true">↑</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--income)' }}>
            {formatRupiah(income, true)}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-faint)' }}>pemasukan</span>
        </div>

        {/* Expense */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: 'var(--expense)' }} aria-hidden="true">↓</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--expense)' }}>
            {formatRupiah(expense, true)}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-faint)' }}>pengeluaran</span>
        </div>
      </div>

      {/* ── Period navigator ── */}
      <div
        className="flex items-center justify-between rounded-2xl px-4 py-2.5"
        style={{ background: 'var(--surface-3)' }}
      >
        <button
          onClick={() => setCurrentPeriod(getPreviousPeriod(currentPeriod))}
          aria-label="Bulan sebelumnya"
          className="rounded-lg p-1 transition-colors active:scale-90"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {formatPeriod(currentPeriod)}
        </span>

        <button
          onClick={() => setCurrentPeriod(getNextPeriod(currentPeriod))}
          aria-label="Bulan berikutnya"
          className="rounded-lg p-1 transition-colors active:scale-90"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
