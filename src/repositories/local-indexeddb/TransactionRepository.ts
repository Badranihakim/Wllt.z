import { db } from '@/db'
import type {
  Transaction,
  TransactionType,
  CreateTransactionDTO,
  SyncStatus,
} from '@/types'
import { LocalIndexedDBRepository } from './LocalIndexedDBRepository'

/**
 * TransactionRepository — Concrete repository for the `transactions` table.
 *
 * Key domain methods:
 *   - `create(dto)`                  → factory: generates UUID + timestamps
 *   - `findByWallet(walletId)`        → all txns for a wallet
 *   - `findByDateRange(from, to)`     → date-range filter (dashboard period)
 *   - `findByWalletAndPeriod(...)`    → combined wallet + period filter
 *   - `findByType(type)`             → income / expense / transfer / debt
 *   - `getUnsyncedTransactions()`    → pending sync queue
 *
 * Always use the exported `transactionRepo` singleton.
 */
export class TransactionRepository extends LocalIndexedDBRepository<Transaction> {
  constructor() {
    super(db.transactions)
  }

  // ─────────────────────────────────────────────
  // Factory
  // ─────────────────────────────────────────────

  /**
   * Create and persist a new Transaction with auto-generated id and timestamps.
   * Automatically sets sync_status = 'local_only' and is_deleted = false.
   *
   * @example
   * const txn = await transactionRepo.create({
   *   date: '2025-01-15',
   *   title: 'Lunch',
   *   amount: 45000,
   *   type: 'expense',
   *   category_id: 'cat-uuid',
   *   wallet_id: 'wallet-uuid',
   *   to_wallet_id: null,
   *   notes: null,
   *   receipt_url: null,
   * })
   */
  async create(dto: CreateTransactionDTO): Promise<Transaction> {
    const now = new Date().toISOString()
    const transaction: Transaction = {
      ...dto,
      id: crypto.randomUUID(),
      is_deleted: false,
      updated_at: now,
      sync_status: 'local_only' as SyncStatus,
    }
    await this.table.add(transaction)
    return transaction
  }

  // ─────────────────────────────────────────────
  // Domain queries
  // ─────────────────────────────────────────────

  /**
   * Return all non-deleted transactions for a given wallet,
   * sorted by date descending (newest first).
   */
  async findByWallet(walletId: string): Promise<Transaction[]> {
    const rows = await this.table
      .where('wallet_id')
      .equals(walletId)
      .filter(r => !r.is_deleted)
      .toArray()

    // Also include transfers where this wallet is the destination
    const incoming = await this.table
      .where('to_wallet_id')
      .equals(walletId)
      .filter(r => !r.is_deleted && r.type === 'transfer')
      .toArray()

    return [...rows, ...incoming].sort(
      (a, b) => b.date.localeCompare(a.date),
    )
  }

  /**
   * Return all non-deleted transactions within an inclusive date range.
   * Dates are ISO 8601 strings: "YYYY-MM-DD".
   *
   * @example
   * // All transactions in January 2025
   * await transactionRepo.findByDateRange('2025-01-01', '2025-01-31')
   */
  async findByDateRange(from: string, to: string): Promise<Transaction[]> {
    return this.table
      .where('date')
      .between(from, to, true, true) // inclusive bounds
      .filter(r => !r.is_deleted)
      .toArray()
  }

  /**
   * Return non-deleted transactions for a specific wallet within a date range.
   * Uses the compound index `[wallet_id+date]` for efficient querying.
   *
   * @example
   * // BCA wallet, January 2025
   * await transactionRepo.findByWalletAndPeriod(
   *   'bca-wallet-uuid', '2025-01-01', '2025-01-31'
   * )
   */
  async findByWalletAndPeriod(
    walletId: string,
    from: string,
    to: string,
  ): Promise<Transaction[]> {
    // Dexie compound index range query: [wallet_id, date] in [[walletId, from], [walletId, to]]
    return this.table
      .where('[wallet_id+date]')
      .between([walletId, from], [walletId, to], true, true)
      .filter(r => !r.is_deleted)
      .toArray()
  }

  /**
   * Return all non-deleted transactions of a given TransactionType,
   * sorted newest first.
   */
  async findByType(type: TransactionType): Promise<Transaction[]> {
    return this.table
      .where('type')
      .equals(type)
      .filter(r => !r.is_deleted)
      .sortBy('date')
      .then(rows => rows.reverse())
  }

  /**
   * Return transactions by type within a date range.
   * Useful for income/expense summaries on the dashboard.
   */
  async findByTypeAndPeriod(
    type: TransactionType,
    from: string,
    to: string,
  ): Promise<Transaction[]> {
    return this.table
      .where('[type+date]')
      .between([type, from], [type, to], true, true)
      .filter(r => !r.is_deleted)
      .toArray()
  }

  /**
   * Return all transactions with sync_status = 'local_only'.
   * Used by the sync engine to build the push queue.
   */
  async getUnsyncedTransactions(): Promise<Transaction[]> {
    return this.findBySyncStatus('local_only')
  }

  /**
   * Compute the net total for a wallet within a date range.
   * income - expense (transfers and debts are excluded from the net).
   * Returns { income, expense, net }.
   */
  async getSummaryForPeriod(
    walletId: string,
    from: string,
    to: string,
  ): Promise<{ income: number; expense: number; net: number }> {
    const txns = await this.findByWalletAndPeriod(walletId, from, to)

    let income = 0
    let expense = 0

    for (const t of txns) {
      if (t.type === 'income') income += t.amount
      else if (t.type === 'expense') expense += t.amount
    }

    return { income, expense, net: income - expense }
  }
}

/** Singleton instance — import this, not the class. */
export const transactionRepo = new TransactionRepository()
