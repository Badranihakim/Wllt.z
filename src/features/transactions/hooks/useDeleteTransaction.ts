import { useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionRepo, walletRepo, budgetRepo, categoryRepo } from '@/repositories'
import { queryKeys } from '@/lib/queryKeys'
import { GoogleSheetsRepository } from '@/repositories/google-sheets/GoogleSheetsRepository'
import type { Transaction } from '@/types'

// ─────────────────────────────────────────────
// Balance reversal helpers
// ─────────────────────────────────────────────

/**
 * Compute the REVERSAL balance deltas for a deleted transaction.
 * This is the exact inverse of getBalanceDeltas in useCreateTransaction.
 *
 * Deleting an income:   −amount (undo the credit)
 * Deleting an expense:  +amount (undo the debit)
 * Deleting a transfer:  +amount to source, −amount from destination
 * Deleting a debt:      −amount (undo the credit)
 */
function getReversalDeltas(
  txn: Transaction,
): Array<{ walletId: string; delta: number }> {
  switch (txn.type) {
    case 'income':
      return [{ walletId: txn.wallet_id, delta: -txn.amount }]

    case 'expense':
      return [{ walletId: txn.wallet_id, delta: +txn.amount }]

    case 'debt':
      return [{ walletId: txn.wallet_id, delta: -txn.amount }]

    case 'transfer':
      if (!txn.to_wallet_id) {
        console.warn('[useDeleteTransaction] transfer missing to_wallet_id', txn.id)
        return [{ walletId: txn.wallet_id, delta: +txn.amount }]
      }
      return [
        { walletId: txn.wallet_id,    delta: +txn.amount }, // restore source
        { walletId: txn.to_wallet_id, delta: -txn.amount }, // undo destination credit
      ]
  }
}

// ─────────────────────────────────────────────
// useDeleteTransaction
// ─────────────────────────────────────────────

/**
 * Mutation to soft-delete a transaction with full reversal of side effects:
 *
 * 1. **Fetch** the transaction before deleting (needed for reversal values)
 * 2. **Soft-delete** via `transactionRepo.delete(id)` — sets `is_deleted = true`
 * 3. **Reverse wallet balance(s)** — undo the impact of the original transaction
 * 4. **Reverse budget spent** — subtract the amount from the budget's spent cache
 * 5. **Invalidate cache** for wallets, transactions, and budgets
 *
 * The transaction is NOT permanently removed from IndexedDB so the sync
 * engine can propagate the deletion to Google Sheets.
 *
 * @example
 * const { mutate: deleteTransaction, isPending } = useDeleteTransaction()
 *
 * deleteTransaction('transaction-uuid')
 *
 * // With callbacks:
 * deleteTransaction('transaction-uuid', {
 *   onSuccess: () => toast.success('Transaction deleted'),
 *   onError: (err) => toast.error(err.message),
 * })
 */
export function useDeleteTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (transactionId: string) => {
      // ── Step 1: Snapshot the transaction before deletion ──────────────
      const txn = await transactionRepo.findById(transactionId)
      if (!txn) {
        throw new Error(
          `useDeleteTransaction: transaction "${transactionId}" not found or already deleted`,
        )
      }

      // ── Step 2: Soft-delete the transaction ───────────────────────────
      await transactionRepo.delete(transactionId)

      // ── Step 3: Reverse wallet balance(s) ────────────────────────────
      const reversals = getReversalDeltas(txn)
      await Promise.all(
        reversals.map(({ walletId, delta }) =>
          walletRepo.updateBalance(walletId, delta),
        ),
      )

      // ── Step 4: Reverse budget spent (expense only) ───────────────────
      if (txn.type === 'expense') {
        try {
          // ── Parent-ID resolution ─────────────────────────────────────
          const txnCategory = await categoryRepo.findById(txn.category_id)
          const budgetCategoryId = txnCategory?.parent_id ?? txn.category_id

          const budget = await budgetRepo.findBudgetForCategory(budgetCategoryId)

          if (budget) {
            // Clamp to 0 — spent should never go negative
            const newSpent = Math.max(0, budget.spent - txn.amount)
            await budgetRepo.updateSpent(budget.id, newSpent)
          }
        } catch (err) {
          // Non-fatal — budget will be recalculated on next sync
          console.warn('[useDeleteTransaction] budget reversal failed:', err)
        }
      }

      // Return the deleted transaction for use in onSuccess callback
      return txn
    },

    onSuccess: async () => {
      // ── Step 5: Invalidate affected query caches ──────────────────────
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.wallets.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all() }),
      ])

      // ── Step 6: Background Sync ─────────────────────────────────────────
      GoogleSheetsRepository.sync()
    },
  })
}
