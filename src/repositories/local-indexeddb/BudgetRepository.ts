import { db } from '@/db'
import type { Budget, BudgetPeriod, CreateBudgetDTO, SyncStatus } from '@/types'
import { LocalIndexedDBRepository } from './LocalIndexedDBRepository'

/**
 * BudgetRepository — Concrete repository for the `budgets` table.
 *
 * Key domain methods:
 *   - `create(dto)`                     → factory: generates UUID + timestamps
 *   - `findByCategory(categoryId)`      → budgets for a specific category
 *   - `findActiveBudgets(period)`       → non-deleted budgets for a period type
 *   - `findBudgetForCategory(id)`       → single active budget for a category
 *   - `updateSpent(budgetId, spent)`    → update cached spending amount
 *   - `recalculateAllSpent(spentMap)`   → bulk-update spent amounts after sync
 *
 * Always use the exported `budgetRepo` singleton.
 */
export class BudgetRepository extends LocalIndexedDBRepository<Budget> {
  constructor() {
    super(db.budgets)
  }

  // ─────────────────────────────────────────────
  // Factory
  // ─────────────────────────────────────────────

  /**
   * Create and persist a new Budget with auto-generated id and timestamps.
   * `spent` is initialized to 0 — it's kept up to date by `updateSpent()`.
   *
   * @example
   * const budget = await budgetRepo.create({
   *   category_id: 'food-cat-uuid',
   *   wallet_id: null,      // null = applies to all wallets
   *   amount: 2_000_000,
   *   period: 'monthly',
   *   starts_at: '2025-01-01',
   * })
   */
  async create(dto: CreateBudgetDTO): Promise<Budget> {
    const now = new Date().toISOString()
    const budget: Budget = {
      ...dto,
      id: crypto.randomUUID(),
      spent: 0,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      sync_status: 'local_only' as SyncStatus,
    }
    await this.table.add(budget)
    return budget
  }

  // ─────────────────────────────────────────────
  // Domain queries
  // ─────────────────────────────────────────────

  /**
   * Return all non-deleted budgets linked to a specific category.
   */
  async findByCategory(categoryId: string): Promise<Budget[]> {
    return this.table
      .where('category_id')
      .equals(categoryId)
      .filter(b => !b.is_deleted)
      .toArray()
  }

  /**
   * Return all non-deleted budgets for a given period granularity.
   * Results are sorted by amount descending (largest budget first).
   *
   * @example
   * // All monthly budgets for the budget overview screen
   * await budgetRepo.findActiveBudgets('monthly')
   */
  async findActiveBudgets(period: BudgetPeriod): Promise<Budget[]> {
    return this.table
      .where('period')
      .equals(period)
      .filter(b => !b.is_deleted)
      .toArray()
      .then(rows => rows.sort((a, b) => b.amount - a.amount))
  }

  /**
   * Return the single active budget for a category (most recent starts_at).
   * Returns null if no budget exists for this category.
   *
   * Used by the transaction form to show budget remaining.
   */
  async findBudgetForCategory(categoryId: string): Promise<Budget | null> {
    const budgets = await this.findByCategory(categoryId)
    if (budgets.length === 0) return null

    // Return the budget with the most recent start date
    return budgets.sort((a, b) =>
      b.starts_at.localeCompare(a.starts_at),
    )[0]
  }

  // ─────────────────────────────────────────────
  // Spent tracking
  // ─────────────────────────────────────────────

  /**
   * Update the cached `spent` amount for a single budget.
   * Called after every transaction create/update/delete to keep
   * progress bars accurate without re-scanning all transactions.
   *
   * @param budgetId - UUID of the budget to update
   * @param spent    - New absolute spent amount (not a delta)
   *
   * @throws {Error} if the budget does not exist
   */
  async updateSpent(budgetId: string, spent: number): Promise<Budget> {
    const budget = await this.table.get(budgetId)
    if (!budget) {
      throw new Error(`BudgetRepository: budget "${budgetId}" not found`)
    }

    const updated: Budget = {
      ...budget,
      spent,
      updated_at: new Date().toISOString(),
      // Note: we do NOT change sync_status here because `spent` is a
      // computed/cached field that is NOT synced to Google Sheets.
    }

    await this.table.put(updated)
    return updated
  }

  /**
   * Bulk-update `spent` amounts for multiple budgets in one transaction.
   * Used by the sync engine and on-open recalculation pass.
   *
   * @param spentMap - Map of { [budgetId]: spentAmount }
   *
   * @example
   * await budgetRepo.recalculateAllSpent({
   *   'budget-uuid-1': 450_000,
   *   'budget-uuid-2': 1_200_000,
   * })
   */
  async recalculateAllSpent(spentMap: Record<string, number>): Promise<void> {
    const ids = Object.keys(spentMap)
    if (ids.length === 0) return

    const budgets = await this.table.where('id').anyOf(ids).toArray()

    const updated = budgets.map(b => ({
      ...b,
      spent: spentMap[b.id] ?? b.spent,
      updated_at: new Date().toISOString(),
    }))

    await this.table.bulkPut(updated)
  }

  /**
   * Compute utilization percentage for a budget (0–100+).
   * Returns a value > 100 if over-budget.
   */
  getBudgetUtilization(budget: Budget): number {
    if (budget.amount === 0) return 0
    return Math.round((budget.spent / budget.amount) * 100)
  }
}

/** Singleton instance — import this, not the class. */
export const budgetRepo = new BudgetRepository()
