import { categoryRepo } from '@/repositories'
import { walletRepo }   from '@/repositories'
import type { Category } from '@/types'
import { cleanupDuplicateCategories } from './cleanupCategories'

// ─────────────────────────────────────────────
// Category tree
// ─────────────────────────────────────────────

interface SeedChild  { name: string; icon: string; color: string }
interface SeedParent { key: string; name: string; icon: string; color: string; type: 'income' | 'expense'; children: SeedChild[] }

const SEED_TREE: SeedParent[] = [
  {
    key: 'makanan', name: 'Makanan & Minuman', icon: '🍔', color: '#F97316', type: 'expense',
    children: [
      { name: 'Sarapan',      icon: '🌅', color: '#F97316' },
      { name: 'Makan Siang',  icon: '🍱', color: '#F97316' },
      { name: 'Makan Malam',  icon: '🌙', color: '#F97316' },
      { name: 'Camilan/Kopi', icon: '☕', color: '#F97316' },
    ],
  },
  {
    key: 'transportasi', name: 'Transportasi', icon: '🚌', color: '#3B82F6', type: 'expense',
    children: [
      { name: 'Kereta',      icon: '🚇', color: '#3B82F6' },
      { name: 'Ojek Online', icon: '🛵', color: '#3B82F6' },
      { name: 'Bensin',      icon: '⛽', color: '#3B82F6' },
      { name: 'Parkir/Tol',  icon: '🅿️', color: '#3B82F6' },
    ],
  },
  {
    key: 'belanja', name: 'Belanja', icon: '🛍️', color: '#8B5CF6', type: 'expense',
    children: [
      { name: 'Belanja Bulanan', icon: '🛒', color: '#8B5CF6' },
      { name: 'Pakaian',         icon: '👕', color: '#8B5CF6' },
      { name: 'Belanja Online',  icon: '📦', color: '#8B5CF6' },
    ],
  },
  {
    key: 'tagihan', name: 'Tagihan', icon: '🧾', color: '#EF4444', type: 'expense',
    children: [
      { name: 'Listrik/Air', icon: '💡', color: '#EF4444' },
      { name: 'Internet',    icon: '📶', color: '#EF4444' },
      { name: 'Asuransi',    icon: '🛡️', color: '#EF4444' },
    ],
  },
  {
    key: 'hiburan', name: 'Hiburan', icon: '🎮', color: '#EC4899', type: 'expense',
    children: [
      { name: 'Streaming',     icon: '📺', color: '#EC4899' },
      { name: 'Nonton/Konser', icon: '🎬', color: '#EC4899' },
      { name: 'Olahraga',      icon: '🏋️', color: '#EC4899' },
    ],
  },
  {
    key: 'kesehatan', name: 'Kesehatan', icon: '❤️', color: '#059669', type: 'expense',
    children: [
      { name: 'Apotek',   icon: '💊', color: '#059669' },
      { name: 'Dokter',   icon: '🏥', color: '#059669' },
      { name: 'Olahraga', icon: '🧘', color: '#059669' },
    ],
  },
  {
    key: 'gaji', name: 'Gaji', icon: '💼', color: '#059669', type: 'income',
    children: [
      { name: 'Gaji Pokok',     icon: '💰', color: '#059669' },
      { name: 'Bonus/Insentif', icon: '🎁', color: '#059669' },
    ],
  },
  {
    key: 'bisnis', name: 'Bisnis', icon: '📈', color: '#0EA5E9', type: 'income',
    children: [
      { name: 'Penjualan', icon: '🛒', color: '#0EA5E9' },
      { name: 'Freelance', icon: '💻', color: '#0EA5E9' },
      { name: 'Investasi', icon: '📊', color: '#0EA5E9' },
    ],
  },
]

/**
 * seedDefaultCategories — Idempotent category tree seeder.
 *
 * Guard: skips entirely if any category already exists.
 * Creates parent categories, then links children via `parent_id`.
 */
export async function seedDefaultCategories(): Promise<void> {
  const existing = await categoryRepo.findAllSorted()
  const existingMap = new Map<string, Category>()
  existing.forEach(c => {
    const key = `${c.type}:${c.name.trim().toLowerCase()}:${c.parent_id || 'root'}`
    existingMap.set(key, c)
  })

  for (const parent of SEED_TREE) {
    const parentKey = `${parent.type}:${parent.name.trim().toLowerCase()}:root`
    let parentRecord = existingMap.get(parentKey)

    if (!parentRecord) {
      parentRecord = await categoryRepo.create({
        name: parent.name, icon: parent.icon, color: parent.color,
        type: parent.type, parent_id: null,
      })
      await categoryRepo['table'].update(parentRecord.id, { is_default: true })
      existingMap.set(parentKey, parentRecord)
    }

    for (const child of parent.children) {
      const childKey = `${parent.type}:${child.name.trim().toLowerCase()}:${parentRecord.id}`
      if (!existingMap.has(childKey)) {
        const childRecord = await categoryRepo.create({
          name: child.name, icon: child.icon, color: child.color,
          type: parent.type, parent_id: parentRecord.id,
        })
        await categoryRepo['table'].update(childRecord.id, { is_default: true })
        existingMap.set(childKey, childRecord)
      }
    }
  }

  console.info(`[wllt.z] ✅ Verified default categories tree.`)
}

// ─────────────────────────────────────────────
// Default wallet seeder
// ─────────────────────────────────────────────

/**
 * seedDefaultWallet — Idempotent default "Cash" wallet seeder.
 *
 * Guard: skips if any active wallet already exists.
 * Creates a single "Cash" wallet so the transaction form is never blocked.
 */
export async function seedDefaultWallet(): Promise<void> {
  const active = await walletRepo.findActive()
  if (active.length > 0) return

  await walletRepo.create({
    name:     'Cash',
    type:     'cash',
    balance:  0,
    icon:     '💵',
    color:    '#3B82F6',
    currency: 'IDR',
    exclude_from_total: false,
  })

  console.info('[wllt.z] ✅ Seeded default Cash wallet.')
}

// ─────────────────────────────────────────────
// Unified bootstrapper — call this once at app start
// ─────────────────────────────────────────────

import { seedDummyData } from './seedDummyData'
export { seedDummyData }

/**
 * bootstrapLocalDB — Runs all seeders sequentially.
 *
 * Designed to be awaited inside `AppInitializer` before React renders
 * the main app, eliminating race conditions between seeding and
 * React Query's initial data fetch.
 *
 * All individual seeders are idempotent — safe to call on every boot.
 */
export async function bootstrapLocalDB(forceSeedDemo = false): Promise<void> {
  await cleanupDuplicateCategories()
  await seedDefaultCategories()
  await seedDefaultWallet()
  if (forceSeedDemo) {
    await seedDummyData()
  }
}


