import type { BudgetPeriod } from '@/types'

/**
 * queryKeys — Centralized TanStack Query key factory for wllt.z.
 *
 * WHY this pattern?
 * Spreading query key strings across many files causes subtle invalidation
 * bugs — a typo in one file means that mutation's invalidation silently
 * misses the cache entry it was supposed to clear.
 *
 * This factory is the single source of truth. All `useQuery`, `useMutation`
 * onSuccess handlers, and manual `queryClient.invalidateQueries` calls MUST
 * use keys from here.
 *
 * HOW prefix invalidation works:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.wallets.all() })
 *   → invalidates ['wallets'], ['wallets', 'active'], ['wallets', 'uuid-123'], etc.
 *   → any query whose key STARTS WITH ['wallets'] is marked stale.
 *
 * USAGE:
 *   import { queryKeys } from '@/lib/queryKeys'
 *
 *   // In a query:
 *   queryKey: queryKeys.transactions.filtered(walletId, period)
 *
 *   // In a mutation onSuccess:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() })
 */
export const queryKeys = {
  // ── Wallets ────────────────────────────────────────────────────────────
  wallets: {
    /** Root prefix — invalidating this clears ALL wallet queries. */
    all: () => ['wallets'] as const,

    /** Active (non-archived, non-deleted) wallets list. */
    active: () => ['wallets', 'active'] as const,

    /** Single wallet detail by ID. */
    detail: (id: string) => ['wallets', id] as const,
  },

  // ── Transactions ───────────────────────────────────────────────────────
  transactions: {
    /** Root prefix — invalidating this clears ALL transaction queries. */
    all: () => ['transactions'] as const,

    /**
     * Transactions filtered by wallet + period.
     * walletId = null means "All Wallets" aggregate view.
     */
    filtered: (walletId: string | null, period: string) =>
      ['transactions', { walletId, period }] as const,

    /** All transactions for a single wallet (unscoped by period). */
    byWallet: (walletId: string) =>
      ['transactions', 'wallet', walletId] as const,

    /** Transactions summary (income/expense totals) for a period. */
    summary: (walletId: string | null, period: string) =>
      ['transactions', 'summary', { walletId, period }] as const,
  },

  // ── Budgets ────────────────────────────────────────────────────────────
  budgets: {
    /** Root prefix — invalidating this clears ALL budget queries. */
    all: () => ['budgets'] as const,

    /** Active budgets filtered by period granularity (monthly, weekly, etc.). */
    active: (period: BudgetPeriod) => ['budgets', 'active', period] as const,

    /** Single budget detail by ID. */
    detail: (id: string) => ['budgets', id] as const,
  },

  // ── Categories ─────────────────────────────────────────────────────────
  categories: {
    /** Root prefix — invalidating this clears ALL category queries. */
    all: () => ['categories'] as const,

    /** Categories filtered by transaction type (income or expense). */
    byType: (type: 'income' | 'expense') => ['categories', type] as const,
  },
} as const
