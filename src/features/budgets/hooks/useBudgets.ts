import { useQuery } from '@tanstack/react-query'
import { budgetRepo } from '@/repositories'
import { useUIStore } from '@/stores'
import { queryKeys } from '@/lib/queryKeys'
import type { BudgetPeriod } from '@/types'

// ─────────────────────────────────────────────
// useBudgets
// ─────────────────────────────────────────────

/**
 * Fetch active budgets for a given period granularity.
 *
 * Defaults to 'monthly' if no period is provided, which covers the
 * most common use case (monthly budget overview on the dashboard).
 *
 * The `currentPeriod` from Zustand is used for display context (e.g.
 * showing "January 2025" in the header), but the budget query itself
 * filters by period granularity (daily/weekly/monthly/yearly), not
 * by the specific calendar month.
 *
 * @param period - Budget granularity to fetch. Defaults to 'monthly'.
 *
 * @example
 * // Monthly budgets (default — dashboard overview)
 * const { data: budgets = [] } = useBudgets()
 *
 * // Weekly budgets (budget detail screen)
 * const { data: weeklyBudgets = [] } = useBudgets('weekly')
 */
export function useBudgets(period: BudgetPeriod = 'monthly') {
  // currentPeriod is read here for future use in computed fields
  // (e.g. showing progress within the current month).
  // It is NOT included in the query key because the underlying query
  // fetches all budgets of the given period type, not month-specific ones.
  const _currentPeriod = useUIStore(s => s.currentPeriod) // eslint-disable-line @typescript-eslint/no-unused-vars

  return useQuery({
    queryKey: queryKeys.budgets.active(period),
    queryFn: () => budgetRepo.findActiveBudgets(period),
  })
}

// ─────────────────────────────────────────────
// useBudgetForCategory
// ─────────────────────────────────────────────

/**
 * Fetch the single active budget for a specific category.
 * Returns null if no budget is set for this category.
 *
 * Used in the transaction form to show remaining budget while
 * the user is selecting a category for an expense.
 *
 * @example
 * const { data: budget } = useBudgetForCategory('food-cat-uuid')
 * // budget?.amount = 2_000_000, budget?.spent = 450_000
 */
export function useBudgetForCategory(categoryId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.budgets.all(), 'category', categoryId],
    queryFn: () =>
      categoryId
        ? budgetRepo.findBudgetForCategory(categoryId)
        : Promise.resolve(null),
    enabled: categoryId !== null,
  })
}
