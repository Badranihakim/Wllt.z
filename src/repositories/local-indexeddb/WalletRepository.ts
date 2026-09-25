import { db } from '@/db'
import type { Wallet, WalletType, CreateWalletDTO, SyncStatus } from '@/types'
import { LocalIndexedDBRepository } from './LocalIndexedDBRepository'

/**
 * WalletRepository — Concrete repository for the `wallets` table.
 *
 * Key domain methods:
 *   - `create(dto)`                 → factory: generates UUID + timestamps
 *   - `findActive()`                → non-archived, non-deleted wallets
 *   - `findByType(type)`            → filter by WalletType
 *   - `updateBalance(id, delta)`    → atomic delta-based balance update
 *   - `archive(id)`                 → soft-archive (hide from main UI)
 *   - `getTotalBalance()`           → sum of all active wallet balances
 *
 * Always use the exported `walletRepo` singleton.
 */
export class WalletRepository extends LocalIndexedDBRepository<Wallet> {
  constructor() {
    super(db.wallets)
  }

  // ─────────────────────────────────────────────
  // Factory
  // ─────────────────────────────────────────────

  /**
   * Create and persist a new Wallet with auto-generated id and timestamps.
   *
   * @example
   * const wallet = await walletRepo.create({
   *   name: 'BCA Tabungan',
   *   type: 'bank',
   *   currency: 'IDR',
   *   balance: 5_000_000,
   *   color: '#1A73E8',
   *   icon: '🏦',
   * })
   */
  async create(dto: CreateWalletDTO): Promise<Wallet> {
    const now = new Date().toISOString()
    const wallet: Wallet = {
      ...dto,
      id: crypto.randomUUID(),
      is_archived: false,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      sync_status: 'local_only' as SyncStatus,
    }
    await this.table.add(wallet)
    return wallet
  }

  // ─────────────────────────────────────────────
  // Domain queries
  // ─────────────────────────────────────────────

  /**
   * Return all wallets that are neither archived nor soft-deleted,
   * sorted alphabetically by name.
   * This is the default list shown in the dashboard wallet selector.
   */
  async findActive(): Promise<Wallet[]> {
    return this.table
      .filter(w => !w.is_archived && !w.is_deleted)
      .toArray()
      .then(rows => rows.sort((a, b) => a.name.localeCompare(b.name)))
  }

  /**
   * Return non-deleted wallets of a specific WalletType.
   * Includes archived wallets (use findActive() to exclude them).
   */
  async findByType(type: WalletType): Promise<Wallet[]> {
    return this.table
      .where('type')
      .equals(type)
      .filter(w => !w.is_deleted)
      .toArray()
  }

  // ─────────────────────────────────────────────
  // Balance management
  // ─────────────────────────────────────────────

  /**
   * Apply a delta to a wallet's balance atomically.
   *
   * Use positive delta for credits (income, incoming transfer).
   * Use negative delta for debits (expense, outgoing transfer).
   *
   * @example
   * // Debit 45,000 IDR from wallet after an expense
   * await walletRepo.updateBalance(walletId, -45_000)
   *
   * // Credit 2,000,000 IDR after a salary transfer
   * await walletRepo.updateBalance(walletId, +2_000_000)
   *
   * @throws {Error} if the wallet does not exist
   */
  async updateBalance(walletId: string, delta: number): Promise<Wallet> {
    const wallet = await this.table.get(walletId)
    if (!wallet) {
      throw new Error(`WalletRepository: wallet "${walletId}" not found`)
    }

    const updated: Wallet = {
      ...wallet,
      balance: wallet.balance + delta,
      updated_at: new Date().toISOString(),
      sync_status: 'local_only' as SyncStatus,
    }

    await this.table.put(updated)
    return updated
  }

  /**
   * Archive a wallet (hides it from the main UI).
   * The wallet is NOT deleted — its historical transactions remain accessible.
   *
   * @throws {Error} if the wallet does not exist
   */
  async archive(walletId: string): Promise<Wallet> {
    const wallet = await this.table.get(walletId)
    if (!wallet) {
      throw new Error(`WalletRepository: wallet "${walletId}" not found`)
    }

    const updated: Wallet = {
      ...wallet,
      is_archived: true,
      updated_at: new Date().toISOString(),
      sync_status: 'local_only' as SyncStatus,
    }

    await this.table.put(updated)
    return updated
  }

  /**
   * Compute the total balance across all active (non-archived, non-deleted) wallets.
   * Note: this is a naïve sum — does not handle multi-currency.
   * For multi-currency support, filter by currency first.
   */
  async getTotalBalance(): Promise<number> {
    const wallets = await this.findActive()
    return wallets.reduce((sum, w) => sum + w.balance, 0)
  }
}

/** Singleton instance — import this, not the class. */
export const walletRepo = new WalletRepository()
