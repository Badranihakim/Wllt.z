import Dexie, { type EntityTable } from 'dexie'
import type { Transaction, Category, Wallet, Budget, Settings } from '@/types'

/**
 * WlltDatabase — Dexie.js v4 typed database class.
 *
 * Schema conventions:
 *   &id     → primary key (UUID string, client-generated)
 *   [a+b]   → compound index
 *   *field  → multi-entry index (array values)
 *
 * All tables include `is_deleted` to support soft deletes and two-way
 * sync with Google Sheets. Never call Dexie's `.delete()` on records
 * directly — always go through the Repository layer which sets is_deleted.
 *
 * Version history:
 *   v1 — initial schema (transactions, categories, wallets, budgets, settings)
 */
export class WlltDatabase extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>
  categories!: EntityTable<Category, 'id'>
  wallets!: EntityTable<Wallet, 'id'>
  budgets!: EntityTable<Budget, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor() {
    super('wllt_db')

    this.version(1).stores({
      /**
       * transactions
       *   &id                — primary key (UUID)
       *   date               — for date-range queries
       *   type               — filter by TransactionType
       *   category_id        — join / filter by category
       *   wallet_id          — filter by wallet
       *   to_wallet_id       — for transfer queries
       *   sync_status        — find unsynced records
       *   is_deleted         — soft-delete filter
       *   [wallet_id+date]   — compound: wallet transactions by date
       *   [type+date]        — compound: typed transactions by date
       */
      transactions: '&id, date, type, category_id, wallet_id, to_wallet_id, sync_status, is_deleted, [wallet_id+date], [type+date]',

      /**
       * categories
       *   &id    — primary key (UUID)
       *   type   — 'income' | 'expense' filter
       *   name   — search / sort by name
       */
      categories: '&id, type, name, is_deleted, sync_status',

      /**
       * wallets
       *   &id          — primary key (UUID)
       *   is_archived  — hide archived wallets in UI
       *   name         — sort / search by name
       */
      wallets: '&id, name, type, is_archived, is_deleted, sync_status',

      /**
       * budgets
       *   &id           — primary key (UUID)
       *   category_id   — look up budget for a category
       *   wallet_id     — filter budgets by wallet
       *   period        — daily/weekly/monthly/yearly filter
       */
      budgets: '&id, category_id, wallet_id, period, is_deleted, sync_status',

      /**
       * settings — singleton record (id = 'default')
       */
      settings: '&id',
    })

    /**
     * Version 2 — Add `parent_id` index to categories for two-level
     * category hierarchy (main category → sub-categories).
     *
     * Existing categories without parent_id get `undefined` (treated as null
     * by Dexie) — they become top-level categories automatically.
     */
    this.version(2).stores({
      categories: '&id, type, name, is_deleted, sync_status, parent_id',
    })

    /**
     * Version 3 — Multi-Wallet Framework upgrade
     *
     * Menambahkan `exclude_from_total` ke indeks tabel wallets.
     * Membersihkan tipe data lama agar sesuai dengan `WalletType` yang lebih ketat.
     */
    this.version(3).stores({
      wallets: '&id, name, type, exclude_from_total, is_archived, is_deleted, sync_status',
    }).upgrade(tx => {
      return tx.table('wallets').toCollection().modify(wallet => {
        // Migrasi tipe data lama
        if (wallet.type === 'credit') wallet.type = 'credit-card'
        else if (wallet.type === 'investment') wallet.type = 'bank'
        else if (wallet.type === 'other' || !wallet.type) wallet.type = 'cash'
        
        // Berikan nilai default agar tidak bernilai undefined pada data lama
        if (wallet.exclude_from_total === undefined) {
          wallet.exclude_from_total = false
        }
      })
    })
  }
}

/** Singleton database instance — import and use this everywhere. */
export const db = new WlltDatabase()

