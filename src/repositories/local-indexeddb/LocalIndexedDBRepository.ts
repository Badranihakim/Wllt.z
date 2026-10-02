import type { Table } from 'dexie'
import { getDatabase } from '@/db'
import type { IRepository } from '../interfaces/IRepository'
import type { SyncStatus } from '@/types'

export type TableName = 'transactions' | 'categories' | 'wallets' | 'budgets' | 'settings'

/** Minimum shape every persisted entity must have. */
export interface BaseEntity {
  id: string
  is_deleted: boolean
  updated_at: string
  sync_status: SyncStatus
}

export abstract class LocalIndexedDBRepository<T extends BaseEntity>
  implements IRepository<T>
{
  private _tableName: TableName

  constructor(tableNameOrTable: TableName | Table<T, any, any>) {
    if (typeof tableNameOrTable === 'string') {
      this._tableName = tableNameOrTable
    } else {
      this._tableName = ((tableNameOrTable as any)?.name || 'transactions') as TableName
    }
  }

  protected get table(): Table<T, any, any> {
    return (getDatabase() as any)[this._tableName]
  }

  // ─────────────────────────────────────────────
  // IRepository implementation
  // ─────────────────────────────────────────────

  /**
   * Find a single non-deleted record by UUID.
   * Returns null if not found or soft-deleted.
   */
  async findById(id: string): Promise<T | null> {
    const record = await this.table.get(id)
    if (!record || record.is_deleted) return null
    return record
  }

  /**
   * Return all non-deleted records.
   */
  async findAll(): Promise<T[]> {
    return this.table.filter(r => !r.is_deleted).toArray()
  }

  /**
   * Upsert a record (add if new, update if existing).
   * Automatically marks sync_status as 'local_only' and stamps updated_at.
   */
  async save(entity: T): Promise<T> {
    const now = new Date().toISOString()
    const toSave: T = {
      ...entity,
      updated_at: now,
      sync_status: 'local_only' as SyncStatus,
    }
    await this.table.put(toSave)
    return toSave
  }

  /**
   * Soft-delete a record by setting is_deleted = true.
   * The record remains in IndexedDB so the sync engine can propagate
   * the deletion to Google Sheets.
   */
  async delete(id: string): Promise<void> {
    const record = await this.table.get(id)
    if (!record) return

    await this.table.put({
      ...record,
      is_deleted: true,
      updated_at: new Date().toISOString(),
      sync_status: 'local_only' as SyncStatus,
    })
  }

  // ─────────────────────────────────────────────
  // Extended helpers
  // ─────────────────────────────────────────────

  /**
   * Find non-deleted records matching all provided key-value pairs.
   * For complex queries, use `this.table` directly in a subclass.
   *
   * @example
   * // Find all expense transactions
   * this.findWhere({ type: 'expense' })
   */
  protected async findWhere(query: Partial<T>): Promise<T[]> {
    return this.table
      .filter(record => {
        if (record.is_deleted) return false
        return (Object.keys(query) as Array<keyof T>).every(
          key => record[key] === query[key],
        )
      })
      .toArray()
  }

  /**
   * Upsert multiple records in a single IndexedDB transaction.
   * More efficient than calling save() in a loop.
   */
  async bulkSave(entities: T[]): Promise<T[]> {
    const now = new Date().toISOString()
    const toSave = entities.map(e => ({
      ...e,
      updated_at: now,
      sync_status: 'local_only' as SyncStatus,
    }))
    await this.table.bulkPut(toSave)
    return toSave
  }

  /**
   * Count non-deleted records in the table.
   */
  async count(): Promise<number> {
    return this.table.filter(r => !r.is_deleted).count()
  }

  /**
   * Return all records whose sync_status matches the provided value.
   * Used by the sync engine to find records that need to be pushed.
   *
   * @example
   * // Find everything that hasn't been synced yet
   * repo.findBySyncStatus('local_only')
   */
  async findBySyncStatus(status: SyncStatus): Promise<T[]> {
    return this.table
      .where('sync_status')
      .equals(status)
      .toArray()
  }

  /**
   * Mark a set of records as synced after a successful push to Google Sheets.
   * Called by the sync engine — not intended for UI code.
   */
  async markAsSynced(ids: string[]): Promise<void> {
    const now = new Date().toISOString()
    await this.table.where('id').anyOf(ids).modify((item: any) => {
      item.sync_status = 'synced'
      item.updated_at = now
    })
  }

  /**
   * Permanently hard-delete a record. Use with extreme caution —
   * only for purging test data or on explicit user request after sync.
   * Prefer `delete()` (soft delete) in all normal flows.
   */
  async hardDelete(id: string): Promise<void> {
    await this.table.delete(id)
  }
}
