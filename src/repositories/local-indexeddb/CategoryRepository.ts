import { db } from '@/db'
import type { Category, CreateCategoryDTO, SyncStatus } from '@/types'
import { LocalIndexedDBRepository } from './LocalIndexedDBRepository'

/**
 * CategoryRepository — Concrete repository for the `categories` table.
 *
 * Supports a two-level hierarchy:
 *   - Top-level (main) categories have `parent_id = null`
 *   - Sub-categories have `parent_id = <parent UUID>`
 *
 * Always use the exported `categoryRepo` singleton — do not instantiate directly.
 */
export class CategoryRepository extends LocalIndexedDBRepository<Category> {
  constructor() {
    super(db.categories)
  }

  // ─────────────────────────────────────────────
  // Factory
  // ─────────────────────────────────────────────

  /**
   * Create and persist a new Category with auto-generated id and timestamps.
   * Defaults `parent_id` to `null` (top-level) if not provided in the DTO.
   *
   * @example
   * // Top-level category
   * const cat = await categoryRepo.create({
   *   name: 'Makanan & Minuman',
   *   icon: '🍔',
   *   color: '#F97316',
   *   type: 'expense',
   *   parent_id: null,
   * })
   *
   * // Sub-category
   * const sub = await categoryRepo.create({
   *   name: 'Sarapan',
   *   icon: '🌅',
   *   color: '#F97316',
   *   type: 'expense',
   *   parent_id: cat.id,
   * })
   */
  async create(dto: CreateCategoryDTO): Promise<Category> {
    const now = new Date().toISOString()
    const category: Category = {
      parent_id: null,  // default — may be overridden by dto spread below
      ...dto,
      id: crypto.randomUUID(),
      is_default: false,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      sync_status: 'local_only' as SyncStatus,
    }
    await this.table.add(category)
    return category
  }

  // ─────────────────────────────────────────────
  // Domain queries
  // ─────────────────────────────────────────────

  /**
   * Return all non-deleted TOP-LEVEL categories of the given type.
   * Top-level = `parent_id` is null or undefined (pre-migration records).
   */
  async findTopLevelByType(type: 'income' | 'expense'): Promise<Category[]> {
    const all = await this.findByType(type)
    return all.filter(c => c.parent_id == null)
  }

  /**
   * Return all non-deleted sub-categories of the given parent.
   */
  async findByParent(parentId: string): Promise<Category[]> {
    return this.table
      .where('parent_id')
      .equals(parentId)
      .filter(c => !c.is_deleted)
      .toArray()
  }

  /**
   * Return all non-deleted categories of the given type (income or expense).
   * Includes both top-level and sub-categories.
   */
  async findByType(type: 'income' | 'expense'): Promise<Category[]> {
    return this.table
      .where('type')
      .equals(type)
      .filter(c => !c.is_deleted)
      .toArray()
  }

  /**
   * Return the seeded default categories (is_default = true).
   * These are shown as suggestions when the user has no custom categories.
   */
  async findDefaults(): Promise<Category[]> {
    return this.table
      .filter(c => c.is_default && !c.is_deleted)
      .toArray()
  }

  /**
   * Return all non-deleted categories sorted alphabetically by name.
   */
  async findAllSorted(): Promise<Category[]> {
    const all = await this.findAll()
    return all
      .filter(c => !c.is_deleted)
      .sort((a, b) => a.name.localeCompare(b.name))
  }
}

/** Singleton instance — import this, not the class. */
export const categoryRepo = new CategoryRepository()
