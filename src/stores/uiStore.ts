import { create } from 'zustand'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

/** The primary navigation tabs of the app. */
export type ActiveTab =
  | 'dashboard'
  | 'transactions'
  | 'wallets'
  | 'budgets'
  | 'settings'
  | 'analytics'

/**
 * UIState — Global UI state for the wllt.z app.
 *
 * Rules:
 * - This store holds ONLY UI concerns (visibility, selections, navigation).
 * - No domain data (transactions, wallets, etc.) lives here.
 * - Domain data lives in TanStack Query cache (server state) or repositories.
 * - `currentPeriod` uses "YYYY-MM" string format for easy localStorage serialization.
 */
export interface UIState {
  // ── Dashboard wallet filter ────────────────────────────────────────────
  /**
   * The currently selected wallet ID for dashboard filtering.
   * null = "All Wallets" aggregated view.
   */
  activeWalletId: string | null

  // ── Period filter ──────────────────────────────────────────────────────
  /**
   * The currently viewed month/period in "YYYY-MM" format.
   * Drives all time-based aggregations (totals, charts, budgets).
   * Defaults to the current calendar month.
   */
  currentPeriod: string

  // ── Transaction modal ──────────────────────────────────────────────────
  /** True when the Add Transaction bottom sheet / modal is open. */
  isAddTransactionOpen: boolean

  /**
   * The transaction ID currently being edited.
   * null = no transaction is being edited.
   * When set, the edit modal opens with pre-filled form data.
   */
  editingTransactionId: string | null

  // ── Wallet modal ───────────────────────────────────────────────────────
  /** True when the Add Wallet bottom sheet / modal is open. */
  isAddWalletOpen: boolean

  // ── Primary navigation ─────────────────────────────────────────────────
  /** The currently active bottom navigation tab. */
  activeTab: ActiveTab

  // ── Sync status indicator ──────────────────────────────────────────────
  /** True while the Google Sheets sync is in progress. */
  isSyncing: boolean

  /**
   * The latest sync error message, or null if the last sync was successful.
   * Displayed as a toast / snackbar in the UI.
   */
  lastSyncError: string | null

  // ── Search / filter (transaction list) ────────────────────────────────
  /** Current search query in the transactions list. Empty string = no filter. */
  transactionSearchQuery: string

  // ── Actions ───────────────────────────────────────────────────────────
  setActiveWallet: (id: string | null) => void
  setCurrentPeriod: (period: string) => void

  openAddTransaction: () => void
  closeAddTransaction: () => void
  openEditTransaction: (id: string) => void
  closeEditTransaction: () => void

  openAddWallet: () => void
  closeAddWallet: () => void

  setActiveTab: (tab: ActiveTab) => void

  setSyncing: (syncing: boolean) => void
  setSyncError: (error: string | null) => void

  setTransactionSearchQuery: (query: string) => void

  /** Navigate to a tab AND close any open modals. Safe to call from anywhere. */
  navigateTo: (tab: ActiveTab) => void

  /** Reset all filter/search state back to defaults (useful on tab switch). */
  resetFilters: () => void
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Returns the current calendar month as a "YYYY-MM" string.
 * Example: "2025-01"
 */
function getCurrentPeriod(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────

export const useUIStore = create<UIState>((set) => ({
  // ── Initial state ──────────────────────────────────────────────────────
  activeWalletId: null,
  currentPeriod: getCurrentPeriod(),

  isAddTransactionOpen: false,
  editingTransactionId: null,

  isAddWalletOpen: false,

  activeTab: 'dashboard',

  isSyncing: false,
  lastSyncError: null,

  transactionSearchQuery: '',

  // ── Actions ───────────────────────────────────────────────────────────

  setActiveWallet: (id) =>
    set({ activeWalletId: id }),

  setCurrentPeriod: (period) =>
    set({ currentPeriod: period }),

  // Transaction modal
  openAddTransaction: () =>
    set({ isAddTransactionOpen: true, editingTransactionId: null }),

  closeAddTransaction: () =>
    set({ isAddTransactionOpen: false }),

  openEditTransaction: (id) =>
    set({ isAddTransactionOpen: true, editingTransactionId: id }),

  closeEditTransaction: () =>
    set({ isAddTransactionOpen: false, editingTransactionId: null }),

  // Wallet modal
  openAddWallet: () =>
    set({ isAddWalletOpen: true }),

  closeAddWallet: () =>
    set({ isAddWalletOpen: false }),

  // Navigation
  setActiveTab: (tab) =>
    set({ activeTab: tab }),

  // Sync
  setSyncing: (syncing) =>
    set({ isSyncing: syncing }),

  setSyncError: (error) =>
    set({ lastSyncError: error }),

  // Search
  setTransactionSearchQuery: (query) =>
    set({ transactionSearchQuery: query }),

  // Compound actions
  navigateTo: (tab) =>
    set({
      activeTab: tab,
      isAddTransactionOpen: false,
      isAddWalletOpen: false,
      editingTransactionId: null,
    }),

  resetFilters: () =>
    set({
      activeWalletId: null,
      currentPeriod: getCurrentPeriod(),
      transactionSearchQuery: '',
    }),
}))

// ─────────────────────────────────────────────
// Derived selectors (pure functions, no re-render cost)
// ─────────────────────────────────────────────

/**
 * Derive the start and end ISO date strings for the current period.
 * Use in hooks that query the repository by date range.
 *
 * @example
 * const { from, to } = getPeriodDateRange('2025-01')
 * // { from: '2025-01-01', to: '2025-01-31' }
 */
export function getPeriodDateRange(period: string): { from: string; to: string } {
  const [year, month] = period.split('-').map(Number)
  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0) // day 0 of next month = last day of current month

  const pad = (n: number) => String(n).padStart(2, '0')

  return {
    from: `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`,
    to: `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}`,
  }
}

/**
 * Navigate to the previous month from a "YYYY-MM" period string.
 *
 * @example
 * getPreviousPeriod('2025-01') // '2024-12'
 */
export function getPreviousPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number)
  const d = new Date(year, month - 2, 1) // month-2 because Date months are 0-indexed
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Navigate to the next month from a "YYYY-MM" period string.
 *
 * @example
 * getNextPeriod('2024-12') // '2025-01'
 */
export function getNextPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number)
  const d = new Date(year, month, 1) // month is already 0-indexed offset +1 here
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
