/**
 * types/index.ts — Barrel export for all shared domain types.
 *
 * Import from here: import type { Transaction, Wallet } from '@/types'
 * Feature-specific types live in: src/features/<feature>/types.ts
 */
export type {
  // Literal / Enum types
  TransactionType,
  SyncStatus,
  BudgetPeriod,
  WalletType,

  // Entity interfaces
  Transaction,
  Category,
  Wallet,
  Budget,
  Settings,

  // Utility / DTO types
  ManagedFields,
  CreateTransactionDTO,
  CreateCategoryDTO,
  CreateWalletDTO,
  CreateBudgetDTO,
  UpdateDTO,
} from './financial'
