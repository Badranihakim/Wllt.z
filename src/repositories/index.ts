/**
 * repositories/index.ts — Barrel export for all repository singleton instances.
 *
 * Import pattern:
 *   import { transactionRepo, walletRepo } from '@/repositories'
 *
 * These are singleton instances (not classes). Each instance holds a reference
 * to the shared Dexie `db` singleton, so there is no overhead in re-importing.
 *
 * Concrete repository classes are intentionally NOT re-exported here to
 * discourage direct instantiation. Always use the singleton instances.
 */

// ── Local IndexedDB repositories ──────────────────────────────────────────
export { transactionRepo } from './local-indexeddb/TransactionRepository'
export { walletRepo }      from './local-indexeddb/WalletRepository'
export { budgetRepo }      from './local-indexeddb/BudgetRepository'
export { categoryRepo }    from './local-indexeddb/CategoryRepository'

// ── Google Sheets repositories (to be implemented in a future task) ────────
// export { sheetsTransactionRepo } from './google-sheets/SheetsTransactionRepository'
