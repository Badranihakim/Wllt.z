import { db } from '@/db'
import { categoryRepo, walletRepo, budgetRepo, transactionRepo } from '@/repositories'
import { seedDefaultCategories } from './seedDefaultData'
import type { Wallet, Budget, Transaction, Category } from '@/types'

/**
 * Helper to format date string as YYYY-MM-DD
 */
function formatDate(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

/**
 * seedDummyData — Fills the database with rich, realistic dummy data.
 *
 * Covers:
 * - 6 wallets across cash, bank, e-wallet, and credit-card
 * - Budgets for major expense categories
 * - Diverse transactions (Income, Expense, Transfer) across current & previous month
 *
 * @param force If true, clears existing wallets, budgets, and transactions before seeding.
 * @returns true if data was seeded, false if skipped because data already exists.
 */
export async function seedDummyData(force = false): Promise<boolean> {
  // Ensure default categories exist first
  await seedDefaultCategories()

  const existingTxns = await db.transactions.toArray()
  if (!force && existingTxns.length > 0) {
    return false
  }

  // If force is requested, clean up transactions, budgets, and wallets
  if (force) {
    await db.transactions.clear()
    await db.budgets.clear()
    await db.wallets.clear()
  } else {
    // If not force, but transactions are empty, remove empty/initial wallets
    await db.wallets.clear()
    await db.budgets.clear()
  }

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const prevMonthDate = new Date(currentYear, currentMonth - 2, 1)
  const prevYear = prevMonthDate.getFullYear()
  const prevMonth = prevMonthDate.getMonth() + 1

  const currentPeriod = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
  const prevPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`

  // ── Step 1: Create Wallets ────────────────────────────────────────────────
  const walletDefinitions = [
    {
      name: 'BCA Prioritas',
      type: 'bank' as const,
      icon: '🏦',
      color: '#0066AE',
      balance: 14_850_000,
      currency: 'IDR',
      exclude_from_total: false,
    },
    {
      name: 'Mandiri Livin',
      type: 'bank' as const,
      icon: '🏧',
      color: '#F59E0B',
      balance: 8_200_000,
      currency: 'IDR',
      exclude_from_total: false,
    },
    {
      name: 'Tunai Fisik',
      type: 'cash' as const,
      icon: '💵',
      color: '#10B981',
      balance: 750_000,
      currency: 'IDR',
      exclude_from_total: false,
    },
    {
      name: 'GoPay',
      type: 'e-wallet' as const,
      icon: '📱',
      color: '#00AED6',
      balance: 420_000,
      currency: 'IDR',
      exclude_from_total: false,
    },
    {
      name: 'OVO Cash',
      type: 'e-wallet' as const,
      icon: '💳',
      color: '#4C3494',
      balance: 250_000,
      currency: 'IDR',
      exclude_from_total: false,
    },
    {
      name: 'BCA Everyday Card',
      type: 'credit-card' as const,
      icon: '💳',
      color: '#EF4444',
      balance: -1_450_000,
      currency: 'IDR',
      exclude_from_total: false,
    },
  ]

  const walletMap = new Map<string, Wallet>()
  for (const wDef of walletDefinitions) {
    const created = await walletRepo.create(wDef)
    walletMap.set(wDef.name, created)
  }

  const bca = walletMap.get('BCA Prioritas')!
  const mandiri = walletMap.get('Mandiri Livin')!
  const cash = walletMap.get('Tunai Fisik')!
  const gopay = walletMap.get('GoPay')!
  const ovo = walletMap.get('OVO Cash')!
  const cc = walletMap.get('BCA Everyday Card')!

  // ── Step 2: Fetch Categories for Mapping ──────────────────────────────────
  const allCategories = await categoryRepo.findAll()
  const catByName = new Map<string, Category>()
  for (const c of allCategories) {
    catByName.set(c.name.toLowerCase(), c)
  }

  const getCatId = (name: string, fallbackParent?: string): string => {
    const found = catByName.get(name.toLowerCase())
    if (found) return found.id
    if (fallbackParent) {
      const parent = catByName.get(fallbackParent.toLowerCase())
      if (parent) return parent.id
    }
    return allCategories[0]?.id || 'default'
  }

  // ── Step 3: Raw Transaction Data List ─────────────────────────────────────
  interface RawTx {
    date: string
    title: string
    amount: number
    type: 'income' | 'expense' | 'transfer'
    catName: string
    catFallback?: string
    walletId: string
    toWalletId?: string
    notes?: string
  }

  const rawTxList: RawTx[] = [
    // --- Current Month Income ---
    {
      date: formatDate(currentYear, currentMonth, 1),
      title: 'Gaji Pokok Bulanan',
      amount: 16_500_000,
      type: 'income',
      catName: 'Gaji Pokok',
      catFallback: 'Gaji',
      walletId: bca.id,
      notes: 'Transfer payroll PT Teknologi Nusantara',
    },
    {
      date: formatDate(currentYear, currentMonth, 10),
      title: 'Project Freelance UI/UX',
      amount: 4_500_000,
      type: 'income',
      catName: 'Freelance',
      catFallback: 'Bisnis',
      walletId: bca.id,
      notes: 'Pembayaran termin 2 redesign web',
    },
    {
      date: formatDate(currentYear, currentMonth, 15),
      title: 'Bonus Kinerja Kuartal',
      amount: 3_000_000,
      type: 'income',
      catName: 'Bonus/Insentif',
      catFallback: 'Gaji',
      walletId: mandiri.id,
      notes: 'Bonus performa tim Q3',
    },
    {
      date: formatDate(currentYear, currentMonth, 20),
      title: 'Hasil Dividen Reksadana',
      amount: 650_000,
      type: 'income',
      catName: 'Investasi',
      catFallback: 'Bisnis',
      walletId: mandiri.id,
      notes: 'Dividen berkala Bibit',
    },

    // --- Current Month Transfers ---
    {
      date: formatDate(currentYear, currentMonth, 1),
      title: 'Tarik Tunai ATM BCA',
      amount: 1_000_000,
      type: 'transfer',
      catName: 'transfer',
      walletId: bca.id,
      toWalletId: cash.id,
      notes: 'Uang saku tunai dompet',
    },
    {
      date: formatDate(currentYear, currentMonth, 3),
      title: 'Top Up GoPay',
      amount: 500_000,
      type: 'transfer',
      catName: 'transfer',
      walletId: bca.id,
      toWalletId: gopay.id,
      notes: 'Top up bulanan transportasi & makan',
    },
    {
      date: formatDate(currentYear, currentMonth, 8),
      title: 'Top Up OVO Cash',
      amount: 350_000,
      type: 'transfer',
      catName: 'transfer',
      walletId: bca.id,
      toWalletId: ovo.id,
      notes: 'Untuk Grab & belanja merchant',
    },

    // --- Current Month Expenses: Makanan & Minuman ---
    {
      date: formatDate(currentYear, currentMonth, 2),
      title: 'Sarapan Bubur Ayam Senayan',
      amount: 28_000,
      type: 'expense',
      catName: 'Sarapan',
      catFallback: 'Makanan & Minuman',
      walletId: cash.id,
    },
    {
      date: formatDate(currentYear, currentMonth, 3),
      title: 'Makan Siang Nasi Padang Garuda',
      amount: 48_000,
      type: 'expense',
      catName: 'Makan Siang',
      catFallback: 'Makanan & Minuman',
      walletId: gopay.id,
    },
    {
      date: formatDate(currentYear, currentMonth, 4),
      title: 'Kopi Kenangan & Roti',
      amount: 42_000,
      type: 'expense',
      catName: 'Camilan/Kopi',
      catFallback: 'Makanan & Minuman',
      walletId: gopay.id,
    },
    {
      date: formatDate(currentYear, currentMonth, 6),
      title: 'Makan Malam Sushi Tei',
      amount: 285_000,
      type: 'expense',
      catName: 'Makan Malam',
      catFallback: 'Makanan & Minuman',
      walletId: cc.id,
      notes: 'Weekend dinner',
    },
    {
      date: formatDate(currentYear, currentMonth, 8),
      title: 'Starbucks Caramel Macchiato',
      amount: 68_000,
      type: 'expense',
      catName: 'Camilan/Kopi',
      catFallback: 'Makanan & Minuman',
      walletId: ovo.id,
    },
    {
      date: formatDate(currentYear, currentMonth, 11),
      title: 'Warteg Bahari Makan Siang',
      amount: 32_000,
      type: 'expense',
      catName: 'Makan Siang',
      catFallback: 'Makanan & Minuman',
      walletId: cash.id,
    },
    {
      date: formatDate(currentYear, currentMonth, 13),
      title: 'Cafe Batavia Dinner Bareng Teman',
      amount: 195_000,
      type: 'expense',
      catName: 'Makan Malam',
      catFallback: 'Makanan & Minuman',
      walletId: gopay.id,
    },
    {
      date: formatDate(currentYear, currentMonth, 16),
      title: 'Makan Siang HokBen Hemat',
      amount: 55_000,
      type: 'expense',
      catName: 'Makan Siang',
      catFallback: 'Makanan & Minuman',
      walletId: gopay.id,
    },
    {
      date: formatDate(currentYear, currentMonth, 19),
      title: 'Kopi Janji Jiwa Sore',
      amount: 30_000,
      type: 'expense',
      catName: 'Camilan/Kopi',
      catFallback: 'Makanan & Minuman',
      walletId: ovo.id,
    },
    {
      date: formatDate(currentYear, currentMonth, 22),
      title: 'Family Dinner Steak 21',
      amount: 420_000,
      type: 'expense',
      catName: 'Makan Malam',
      catFallback: 'Makanan & Minuman',
      walletId: cc.id,
      notes: 'Rayakan anniversary',
    },
    {
      date: formatDate(currentYear, currentMonth, 24),
      title: 'Sarapan Lontong Sayur',
      amount: 22_000,
      type: 'expense',
      catName: 'Sarapan',
      catFallback: 'Makanan & Minuman',
      walletId: cash.id,
    },
    {
      date: formatDate(currentYear, currentMonth, 25),
      title: 'Makan Siang Bakso Solo',
      amount: 35_000,
      type: 'expense',
      catName: 'Makan Siang',
      catFallback: 'Makanan & Minuman',
      walletId: gopay.id,
    },

    // --- Current Month Expenses: Transportasi ---
    {
      date: formatDate(currentYear, currentMonth, 2),
      title: 'Isi Bensin Pertamax Full',
      amount: 250_000,
      type: 'expense',
      catName: 'Bensin',
      catFallback: 'Transportasi',
      walletId: mandiri.id,
      notes: 'SPBU Pertamina Kuningan',
    },
    {
      date: formatDate(currentYear, currentMonth, 5),
      title: 'GoRide ke Stasiun Gambir',
      amount: 24_000,
      type: 'expense',
      catName: 'Ojek Online',
      catFallback: 'Transportasi',
      walletId: gopay.id,
    },
    {
      date: formatDate(currentYear, currentMonth, 7),
      title: 'Top Up Kartu Flazz KRL / MRT',
      amount: 150_000,
      type: 'expense',
      catName: 'Kereta',
      catFallback: 'Transportasi',
      walletId: bca.id,
    },
    {
      date: formatDate(currentYear, currentMonth, 12),
      title: 'GrabCar Bandara Soetta',
      amount: 165_000,
      type: 'expense',
      catName: 'Ojek Online',
      catFallback: 'Transportasi',
      walletId: ovo.id,
    },
    {
      date: formatDate(currentYear, currentMonth, 17),
      title: 'Tol Dalam Kota & Parkir Mall',
      amount: 45_000,
      type: 'expense',
      catName: 'Parkir/Tol',
      catFallback: 'Transportasi',
      walletId: mandiri.id,
    },
    {
      date: formatDate(currentYear, currentMonth, 21),
      title: 'Isi Bensin Pertamax',
      amount: 200_000,
      type: 'expense',
      catName: 'Bensin',
      catFallback: 'Transportasi',
      walletId: mandiri.id,
    },

    // --- Current Month Expenses: Belanja ---
    {
      date: formatDate(currentYear, currentMonth, 3),
      title: 'Belanja Bulanan Superindo',
      amount: 1_250_000,
      type: 'expense',
      catName: 'Belanja Bulanan',
      catFallback: 'Belanja',
      walletId: cc.id,
      notes: 'Kebutuhan dapur & sembako 2 pekan',
    },
    {
      date: formatDate(currentYear, currentMonth, 9),
      title: 'Kemeja Kantor Uniqlo',
      amount: 399_000,
      type: 'expense',
      catName: 'Pakaian',
      catFallback: 'Belanja',
      walletId: cc.id,
    },
    {
      date: formatDate(currentYear, currentMonth, 14),
      title: 'Belanja Alat Rumah Tokopedia',
      amount: 285_000,
      type: 'expense',
      catName: 'Belanja Online',
      catFallback: 'Belanja',
      walletId: gopay.id,
    },
    {
      date: formatDate(currentYear, currentMonth, 23),
      title: 'Sepatu Olahraga Running',
      amount: 699_000,
      type: 'expense',
      catName: 'Pakaian',
      catFallback: 'Belanja',
      walletId: cc.id,
    },

    // --- Current Month Expenses: Tagihan ---
    {
      date: formatDate(currentYear, currentMonth, 2),
      title: 'Token Listrik PLN',
      amount: 500_000,
      type: 'expense',
      catName: 'Listrik/Air',
      catFallback: 'Tagihan',
      walletId: bca.id,
    },
    {
      date: formatDate(currentYear, currentMonth, 5),
      title: 'Internet Fiber Indihome 50Mbps',
      amount: 415_000,
      type: 'expense',
      catName: 'Internet',
      catFallback: 'Tagihan',
      walletId: bca.id,
    },
    {
      date: formatDate(currentYear, currentMonth, 10),
      title: 'Premi Asuransi Prudential',
      amount: 650_000,
      type: 'expense',
      catName: 'Asuransi',
      catFallback: 'Tagihan',
      walletId: bca.id,
    },

    // --- Current Month Expenses: Hiburan & Kesehatan ---
    {
      date: formatDate(currentYear, currentMonth, 4),
      title: 'Netflix Premium & Spotify Family',
      amount: 240_000,
      type: 'expense',
      catName: 'Streaming',
      catFallback: 'Hiburan',
      walletId: cc.id,
    },
    {
      date: formatDate(currentYear, currentMonth, 12),
      title: 'Nonton Bioskop IMAX XXI & Popcorn',
      amount: 135_000,
      type: 'expense',
      catName: 'Nonton/Konser',
      catFallback: 'Hiburan',
      walletId: gopay.id,
    },
    {
      date: formatDate(currentYear, currentMonth, 7),
      title: 'Vitamin D3 & Suplemen Kimia Farma',
      amount: 185_000,
      type: 'expense',
      catName: 'Apotek',
      catFallback: 'Kesehatan',
      walletId: gopay.id,
    },
    {
      date: formatDate(currentYear, currentMonth, 18),
      title: 'Konsultasi Dokter Halodoc',
      amount: 95_000,
      type: 'expense',
      catName: 'Dokter',
      catFallback: 'Kesehatan',
      walletId: ovo.id,
    },

    // --- Previous Month Historical Records (for comparisons & charts) ---
    {
      date: formatDate(prevYear, prevMonth, 1),
      title: 'Gaji Pokok Bulan Lalu',
      amount: 16_500_000,
      type: 'income',
      catName: 'Gaji Pokok',
      catFallback: 'Gaji',
      walletId: bca.id,
    },
    {
      date: formatDate(prevYear, prevMonth, 4),
      title: 'Belanja Bulanan Lalu',
      amount: 1_450_000,
      type: 'expense',
      catName: 'Belanja Bulanan',
      catFallback: 'Belanja',
      walletId: cc.id,
    },
    {
      date: formatDate(prevYear, prevMonth, 12),
      title: 'Tagihan Listrik & Internet Bulan Lalu',
      amount: 890_000,
      type: 'expense',
      catName: 'Listrik/Air',
      catFallback: 'Tagihan',
      walletId: bca.id,
    },
    {
      date: formatDate(prevYear, prevMonth, 18),
      title: 'Makan Bareng Keluarga',
      amount: 520_000,
      type: 'expense',
      catName: 'Makan Malam',
      catFallback: 'Makanan & Minuman',
      walletId: cc.id,
    },
    {
      date: formatDate(prevYear, prevMonth, 25),
      title: 'Bensin & Transportasi Bulan Lalu',
      amount: 450_000,
      type: 'expense',
      catName: 'Bensin',
      catFallback: 'Transportasi',
      walletId: mandiri.id,
    },
  ]

  // Insert all transactions
  const createdTransactions: Transaction[] = []
  for (const item of rawTxList) {
    const category_id = item.type === 'transfer'
      ? 'transfer'
      : getCatId(item.catName, item.catFallback)

    const txn = await transactionRepo.create({
      title: item.title,
      amount: item.amount,
      type: item.type,
      category_id,
      wallet_id: item.walletId,
      to_wallet_id: item.toWalletId || null,
      date: item.date,
      notes: item.notes || null,
      receipt_url: null,
    })
    createdTransactions.push(txn)
  }

  // ── Step 4: Create Monthly Budgets ───────────────────────────────────────
  const budgetConfigs = [
    { catName: 'Makanan & Minuman', amount: 3_000_000 },
    { catName: 'Transportasi',      amount: 1_200_000 },
    { catName: 'Belanja',           amount: 2_800_000 },
    { catName: 'Tagihan',           amount: 1_800_000 },
    { catName: 'Hiburan',           amount: 1_000_000 },
    { catName: 'Kesehatan',         amount: 600_000   },
  ]

  // Map category IDs to their parent ID
  const parentMap = new Map<string, string>() // childCatId -> parentCatId
  for (const c of allCategories) {
    if (c.parent_id) {
      parentMap.set(c.id, c.parent_id)
    }
  }

  for (const bCfg of budgetConfigs) {
    const cat = catByName.get(bCfg.catName.toLowerCase())
    if (!cat) continue

    // Calculate spent by summing expense transactions in the current period
    const spent = createdTransactions
      .filter(t => {
        if (t.type !== 'expense') return false
        if (!t.date.startsWith(currentPeriod)) return false
        const tParent = parentMap.get(t.category_id) || t.category_id
        return tParent === cat.id
      })
      .reduce((sum, t) => sum + t.amount, 0)

    const budgetRecord: Budget = {
      id: crypto.randomUUID(),
      category_id: cat.id,
      wallet_id: null,
      amount: bCfg.amount,
      period: currentPeriod,
      spent,
      starts_at: `${currentPeriod}-01`,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'local_only',
    }
    await budgetRepo.save(budgetRecord)
  }

  // Also seed previous period budgets
  for (const bCfg of budgetConfigs) {
    const cat = catByName.get(bCfg.catName.toLowerCase())
    if (!cat) continue

    const spent = createdTransactions
      .filter(t => {
        if (t.type !== 'expense') return false
        if (!t.date.startsWith(prevPeriod)) return false
        const tParent = parentMap.get(t.category_id) || t.category_id
        return tParent === cat.id
      })
      .reduce((sum, t) => sum + t.amount, 0)

    const budgetRecord: Budget = {
      id: crypto.randomUUID(),
      category_id: cat.id,
      wallet_id: null,
      amount: bCfg.amount,
      period: prevPeriod,
      spent,
      starts_at: `${prevPeriod}-01`,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'local_only',
    }
    await budgetRepo.save(budgetRecord)
  }

  console.info(`[wllt.z] ✅ Dummy data successfully seeded for ${currentPeriod} and ${prevPeriod}!`)
  return true
}

/**
 * clearAllData — Clears all transactions, budgets, and custom wallets.
 * Restores a single default Cash wallet so features are not blocked.
 */
export async function clearAllData(): Promise<void> {
  await db.transactions.clear()
  await db.budgets.clear()
  await db.wallets.clear()

  await walletRepo.create({
    name: 'Cash',
    type: 'cash',
    balance: 0,
    icon: '💵',
    color: '#3B82F6',
    currency: 'IDR',
    exclude_from_total: false,
  })

  console.info('[wllt.z] 🧹 All demo data cleared. Restored default Cash wallet.')
}

/**
 * exportAllData — Exports all database records (wallets, budgets, transactions, categories)
 * as a downloadable JSON file.
 */
export async function exportAllData(): Promise<void> {
  const [wallets, budgets, transactions, categories] = await Promise.all([
    db.wallets.toArray(),
    db.budgets.toArray(),
    db.transactions.toArray(),
    db.categories.toArray(),
  ])

  const payload = {
    appName: 'wllt.z',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    stats: {
      walletsCount: wallets.length,
      budgetsCount: budgets.length,
      transactionsCount: transactions.length,
      categoriesCount: categories.length,
    },
    data: {
      wallets,
      budgets,
      transactions,
      categories,
    },
  }

  const jsonStr = JSON.stringify(payload, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wlltz-demo-data-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

