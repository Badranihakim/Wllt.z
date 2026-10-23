import { useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionRepo, walletRepo, budgetRepo, categoryRepo } from '@/repositories'
import { queryKeys } from '@/lib/queryKeys'
import { GoogleSheetsRepository } from '@/repositories/google-sheets/GoogleSheetsRepository'
import type { CreateTransactionDTO, Transaction } from '@/types'

// ─────────────────────────────────────────────
// Balance delta helpers
// ─────────────────────────────────────────────

/**
 * Compute wallet balance deltas for a given transaction.
 * Returns an array of { walletId, delta } pairs — always 1 entry,
 * except for 'transfer' which has 2 (source debit + destination credit).
 */
function getBalanceDeltas(
  txn: Transaction,
): Array<{ walletId: string; delta: number }> {
  switch (txn.type) {
    case 'income':
      // Money comes IN to wallet_id
      return [{ walletId: txn.wallet_id, delta: +txn.amount }]

    case 'expense':
      // Money goes OUT from wallet_id
      return [{ walletId: txn.wallet_id, delta: -txn.amount }]

    case 'debt':
      // Debt received = money comes in (e.g. borrowed from someone)
      // Debt paid    = money goes out (e.g. paying back a debt)
      // We treat 'debt' as income-like (money received).
      // The debt tracking UI will handle the liability aspect separately.
      return [{ walletId: txn.wallet_id, delta: +txn.amount }]

    case 'transfer':
      // Money moves from wallet_id → to_wallet_id
      if (!txn.to_wallet_id) {
        console.warn('[useCreateTransaction] transfer missing to_wallet_id', txn.id)
        return [{ walletId: txn.wallet_id, delta: -txn.amount }]
      }
      return [
        { walletId: txn.wallet_id,    delta: -txn.amount },
        { walletId: txn.to_wallet_id, delta: +txn.amount },
      ]
  }
}

// ─────────────────────────────────────────────
// useCreateTransaction
// ─────────────────────────────────────────────

/**
 * Mutation to record a new transaction with full side-effect automation:
 *
 * 1. **Persist** the transaction to IndexedDB via `transactionRepo.create(dto)`
 * 2. **Update wallet balance(s)** via `walletRepo.updateBalance(id, delta)`
 *    - income:   +amount to wallet_id
 *    - expense:  −amount from wallet_id
 *    - transfer: −amount from wallet_id, +amount to to_wallet_id
 *    - debt:     +amount to wallet_id (liability tracked separately)
 * 3. **Update budget spent** if an active budget exists for this category:
 *    - Only for 'expense' transactions
 *    - Finds the budget for the category, adds amount to .spent
 * 4. **Invalidate TanStack Query cache** for wallets, transactions, and budgets
 *    so all affected UI panels re-render with fresh data.
 *
 * @example
 * const { mutate: addTransaction, isPending } = useCreateTransaction()
 *
 * addTransaction({
 *   date: '2025-01-15',
 *   title: 'Lunch',
 *   amount: 45_000,
 *   type: 'expense',
 *   category_id: 'food-uuid',
 *   wallet_id: 'bca-uuid',
 *   to_wallet_id: null,
 *   notes: null,
 *   receipt_url: null,
 * })
 */
export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateTransactionDTO) => transactionRepo.create(dto),

    onSuccess: async (newTransaction) => {
      // ── Step 1: Update wallet balance(s) ─────────────────────────────
      const deltas = getBalanceDeltas(newTransaction)

      await Promise.all(
        deltas.map(({ walletId, delta }) =>
          walletRepo.updateBalance(walletId, delta),
        ),
      )

      // ── Step 2: Update budget spent (expense only) ────────────────────
      if (newTransaction.type === 'expense') {
        try {
          // ── Parent-ID resolution ─────────────────────────────────────
          // Budgets are always anchored to TOP-LEVEL (parent) categories.
          // If the transaction uses a sub-category (parent_id !== null),
          // we must walk up to the parent before querying the budget table.
          const txnCategory = await categoryRepo.findById(newTransaction.category_id)
          const budgetCategoryId =
            txnCategory?.parent_id ?? newTransaction.category_id

          const budget = await budgetRepo.findBudgetForCategory(budgetCategoryId)

          if (budget) {
            const newSpent = budget.spent + newTransaction.amount
            await budgetRepo.updateSpent(budget.id, newSpent)
          }
        } catch (err) {
          // Budget update failure is non-fatal — transaction is already saved.
          // The budget will be recalculated on next full sync.
          console.warn('[useCreateTransaction] budget update failed:', err)
        }
      }

      // ── Step 3: Invalidate all affected query caches ──────────────────
      // Using root prefix keys so ALL sub-queries are invalidated:
      //   ['wallets'] clears active list, totals, detail pages
      //   ['transactions'] clears filtered list, summaries, by-wallet
      //   ['budgets'] clears active budgets, progress bars
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.wallets.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all() }),
      ])

      // ── Step 4: Background Sync ─────────────────────────────────────────
      GoogleSheetsRepository.sync()
    },
  })
}
