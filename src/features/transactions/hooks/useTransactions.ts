import { useQuery } from '@tanstack/react-query'
import { transactionRepo } from '@/repositories'
import { useUIStore, getPeriodDateRange } from '@/stores'
import { queryKeys } from '@/lib/queryKeys'

// ─────────────────────────────────────────────
// useTransactions
// ─────────────────────────────────────────────

/**
 * Fetch transactions for the currently active wallet + period.
 *
 * Data is driven reactively from Zustand UI store:
 *   - `activeWalletId`: null = aggregate all wallets
 *   - `currentPeriod`:  "YYYY-MM" string
 *
 * The query key includes both filter values so TanStack Query maintains
 * a separate cache entry for every unique (walletId, period) combination.
 * Navigating back to a previously viewed period is instant from cache.
 *
 * @example
 * const { data: transactions = [], isLoading } = useTransactions()
 */
export function useTransactions() {
  const activeWalletId = useUIStore(s => s.activeWalletId)
  const currentPeriod  = useUIStore(s => s.currentPeriod)

  const { from, to } = getPeriodDateRange(currentPeriod)

  return useQuery({
    queryKey: queryKeys.transactions.filtered(activeWalletId, currentPeriod),

    queryFn: async () => {
      if (activeWalletId !== null) {
        // Specific wallet selected — use compound index for efficiency
        return transactionRepo.findByWalletAndPeriod(activeWalletId, from, to)
      }
      // "All Wallets" view — date-range scan across all wallets
      return transactionRepo.findByDateRange(from, to)
    },
  })
}

// ─────────────────────────────────────────────
// useTransactionSummary
// ─────────────────────────────────────────────

/**
 * Compute income/expense/net totals for the active wallet + period.
 *
 * Returns `{ income: number, expense: number, net: number }`.
 * Derived client-side from the same cache as `useTransactions`.
 *
 * @example
 * const { data: summary } = useTransactionSummary()
 * // { income: 5_000_000, expense: 1_200_000, net: 3_800_000 }
 */
export function useTransactionSummary() {
  const activeWalletId = useUIStore(s => s.activeWalletId)
  const currentPeriod  = useUIStore(s => s.currentPeriod)

  const { from, to } = getPeriodDateRange(currentPeriod)

  return useQuery({
    queryKey: queryKeys.transactions.summary(activeWalletId, currentPeriod),

    queryFn: async () => {
      // If a specific wallet is selected, use the repo's built-in summary helper.
      // For "All Wallets" we compute it manually from all transactions in the period.
      if (activeWalletId !== null) {
        return transactionRepo.getSummaryForPeriod(activeWalletId, from, to)
      }

      const txns = await transactionRepo.findByDateRange(from, to)
      let income = 0
      let expense = 0
      for (const t of txns) {
        if (t.type === 'income')  income  += t.amount
        if (t.type === 'expense') expense += t.amount
      }
      return { income, expense, net: income - expense }
    },
  })
}
