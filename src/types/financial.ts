/**
 * financial.ts — Core domain types for wllt.z
 *
 * These types are shared across the entire application.
 * Feature-specific types live in: src/features/<feature>/types.ts
 */

// ─────────────────────────────────────────────
// Literal / Enum Types
// ─────────────────────────────────────────────

/** The nature of a financial transaction. */
export type TransactionType = 'income' | 'expense' | 'transfer' | 'debt'

/** Tracks whether a local record has been pushed to Google Sheets. */
export type SyncStatus = 'local_only' | 'syncing' | 'synced' | 'failed'

/** Supported budget period granularities. */
export type BudgetPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | string

/** Wallet / account types. */
export type WalletType = 'bank' | 'e-wallet' | 'cash' | 'credit-card'

// ─────────────────────────────────────────────
// Core Entity Interfaces
// ─────────────────────────────────────────────

/**
 * A single financial transaction (income, expense, transfer, or debt).
 * Primary key is a client-generated UUID to support offline creation.
 */
export interface Transaction {
  /** UUID — generated client-side via crypto.randomUUID() */
  id: string

  /** ISO 8601 date string, e.g. "2025-01-15" */
  date: string

  /** Short human-readable title, e.g. "Lunch at warung" */
  title: string

  /** Monetary amount in the smallest currency unit (e.g. cents / rupiah) */
  amount: number

  type: TransactionType

  /** References Category.id */
  category_id: string

  /** References Wallet.id (source wallet for transfers/expenses, destination for income) */
  wallet_id: string

  /**
   * For 'transfer' type: the destination wallet ID.
   * Null for all other transaction types.
   */
  to_wallet_id: string | null

  /** Optional free-text notes */
  notes: string | null

  /** URL to a receipt image stored in Google Drive or locally as a blob URL */
  receipt_url: string | null

  /**
   * Soft-delete flag. Records are never hard-deleted so that the sync
   * engine can propagate deletions to Google Sheets.
   */
  is_deleted: boolean

  /** ISO 8601 timestamp of last local modification */
  updated_at: string

  sync_status: SyncStatus
}

/**
 * A transaction category (e.g. Food, Transport, Salary).
 * Categories are user-owned and synced to Google Sheets.
 */
export interface Category {
  id: string
  name: string

  /** Emoji or icon identifier (e.g. "🍔" or a lucide icon name) */
  icon: string

  /** Hex color string, e.g. "#FF6B6B" */
  color: string

  /** Whether this category applies to income or expense transactions */
  type: Extract<TransactionType, 'income' | 'expense'>

  /**
   * Parent category ID for the two-level hierarchy.
   * null  → top-level ("main") category shown as a circle icon
   * string → sub-category chip shown below its parent
   */
  parent_id: string | null

  /** True for seeded default categories that cannot be deleted */
  is_default: boolean

  is_deleted: boolean
  created_at: string
  updated_at: string
  sync_status: SyncStatus
}

/**
 * A wallet / account (e.g. BCA, GoPay, Cash).
 */
export interface Wallet {
  id: string
  name: string
  type: WalletType

  /** ISO 4217 currency code, e.g. "IDR", "USD" */
  currency: string

  /** Current balance in smallest currency unit */
  balance: number

  /** Hex color for UI accent */
  color: string

  /** Emoji or lucide icon name */
  icon: string

  /** Metadata opsional untuk ikon, misalnya URL logo bank */
  icon_metadata?: string

  /** Apakah saldo dompet ini dikecualikan dari total kekayaan (net worth) */
  exclude_from_total: boolean

  /** Archived wallets are hidden from main UI but kept for historical records */
  is_archived: boolean

  is_deleted: boolean
  created_at: string
  updated_at: string
  sync_status: SyncStatus
}

/**
 * A spending budget for a specific category and time period.
 */
export interface Budget {
  id: string

  /** References Category.id */
  category_id: string

  /**
   * References Wallet.id. Null means the budget spans all wallets.
   */
  wallet_id: string | null

  /** Budget limit amount in smallest currency unit */
  amount: number

  period: BudgetPeriod

  /**
   * Amount already spent in the current period.
   * Computed and cached locally; not stored in Google Sheets.
   */
  spent: number

  /** ISO 8601 date when this budget becomes active */
  starts_at: string

  is_deleted: boolean
  created_at: string
  updated_at: string
  sync_status: SyncStatus
}

/**
 * Per-user application settings.
 * Stored as a single record in the 'settings' table (id = 'default').
 */
export interface Settings {
  /** Always "default" — singleton record */
  id: 'default'

  /** UI color theme */
  theme: 'light' | 'dark' | 'system'

  /** Display currency, ISO 4217, e.g. "IDR" */
  currency: string

  /** UI locale, e.g. "id-ID", "en-US" */
  language: string

  /**
   * Google Sheets spreadsheet ID that this user's data is synced to.
   * Null until the user has authenticated and created/linked their sheet.
   */
  google_sheets_id: string | null

  /** ISO 8601 timestamp of the last successful sync */
  last_synced_at: string | null

  /** Whether automatic background sync is enabled */
  sync_enabled: boolean
}

// ─────────────────────────────────────────────
// Utility / DTO Types
// ─────────────────────────────────────────────

/**
 * Fields automatically managed by the data layer.
 * Omit these when creating a new entity.
 */
export type ManagedFields = 'id' | 'is_deleted' | 'created_at' | 'updated_at' | 'sync_status' | 'spent'

/** DTO for creating a new Transaction — id and timestamps are auto-generated. */
export type CreateTransactionDTO = Omit<Transaction, ManagedFields>

/**
 * DTO for creating a new Category.
 * `parent_id` is included — pass null for top-level, parent UUID for sub-categories.
 */
export type CreateCategoryDTO = Omit<Category, ManagedFields | 'is_default'>

/** DTO for creating a new Wallet. */
export type CreateWalletDTO = Omit<Wallet, ManagedFields | 'is_archived'>

/** DTO for creating a new Budget. */
export type CreateBudgetDTO = Omit<Budget, ManagedFields>

/** Partial update DTO — id is required, all other fields optional. */
export type UpdateDTO<T extends { id: string }> = Pick<T, 'id'> & Partial<Omit<T, 'id'>>
