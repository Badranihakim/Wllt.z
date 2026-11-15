import { db } from '@/db'
import type { Category } from '@/types'

/**
 * cleanupDuplicateCategories
 *
 * Scans the `categories` Dexie table for duplicates (categories having the exact
 * same normalized name, type, and parent status).
 *
 * For any detected duplicates:
 * 1. Designates the canonical category (prefers `is_default` or earliest created).
 * 2. Remaps any transactions and budgets pointing to the duplicate IDs to the canonical ID.
 * 3. Deletes the duplicate category records.
 *
 * This ensures clean, deterministic category trees across local database and sync.
 */
export async function cleanupDuplicateCategories(): Promise<number> {
  try {
    const allCategories = await db.categories.toArray()
    if (!allCategories || allCategories.length === 0) return 0

    // Group categories by key: "type:isChild:normalizedName"
    const groups = new Map<string, Category[]>()

    for (const cat of allCategories) {
      if (cat.is_deleted) continue
      const isChild = Boolean(cat.parent_id)
      const key = `${cat.type}:${isChild}:${cat.name.trim().toLowerCase()}`
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(cat)
    }

    let cleanedCount = 0

    await db.transaction('rw', [db.categories, db.transactions, db.budgets], async () => {
      for (const [, cats] of groups) {
        if (cats.length <= 1) continue

        // Pick canonical: prefer is_default === true, then earliest created_at
        const canonical = cats.slice().sort((a, b) => {
          if (a.is_default && !b.is_default) return -1
          if (!a.is_default && b.is_default) return 1
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        })[0]

        const duplicateIds = cats
          .filter(c => c.id !== canonical.id)
          .map(c => c.id)

        if (duplicateIds.length === 0) continue

        // Remap transactions referencing any duplicate category ID
        for (const dupId of duplicateIds) {
          const txsToUpdate = await db.transactions
            .where('category_id')
            .equals(dupId)
            .toArray()

          for (const tx of txsToUpdate) {
            await db.transactions.update(tx.id, {
              category_id: canonical.id,
              sync_status: 'local_only',
              updated_at: new Date().toISOString(),
            })
          }

          // Remap budgets referencing any duplicate category ID
          const budgetsToUpdate = await db.budgets
            .where('category_id')
            .equals(dupId)
            .toArray()

          for (const b of budgetsToUpdate) {
            await db.budgets.update(b.id, {
              category_id: canonical.id,
              sync_status: 'local_only',
              updated_at: new Date().toISOString(),
            })
          }

          // Remove duplicate category record
          await db.categories.delete(dupId)
          cleanedCount++
        }
      }
    })

    if (cleanedCount > 0) {
      console.info(`[wllt.z] 🧹 Cleaned up ${cleanedCount} duplicate categories from database.`)
    }

    return cleanedCount
  } catch (error) {
    console.warn('[wllt.z] cleanupDuplicateCategories error:', error)
    return 0
  }
}
