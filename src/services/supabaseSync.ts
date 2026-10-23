import { supabase } from '@/lib/supabase'
import { db } from '@/db'
import type { Wallet, Category, Transaction, Budget } from '@/types'

/**
 * supabaseSync — Two-way synchronization service between local IndexedDB and Supabase Cloud.
 */
export const supabaseSync = {
  /**
   * Pull all records for the user from Supabase and merge into IndexedDB.
   * If cloud is empty, pushes local bootstrap data up to the cloud.
   */
  async syncAll(userId: string): Promise<boolean> {
    if (!navigator.onLine) {
      console.info('[supabaseSync] Offline, skipping cloud sync.')
      return false
    }

    try {
      // 1. Fetch Wallets
      const { data: cloudWallets, error: walletErr } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)

      // 2. Fetch Categories
      const { data: cloudCats, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)

      // 3. Fetch Transactions
      const { data: cloudTxs, error: txErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)

      // 4. Fetch Budgets
      const { data: cloudBudgets, error: budgetErr } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)

      if (walletErr || catErr || txErr || budgetErr) {
        console.warn('[supabaseSync] Info/status during fetch:', { walletErr, catErr, txErr, budgetErr })
      }

      // Check if cloud has existing data
      const hasCloudData = (cloudWallets && cloudWallets.length > 0) || (cloudCats && cloudCats.length > 0)

      if (hasCloudData) {
        // Populate local IndexedDB from cloud
        if (cloudWallets && cloudWallets.length > 0) {
          const wallets: Wallet[] = cloudWallets.map(w => ({
            id: w.id,
            name: w.name,
            type: w.type,
            currency: w.currency,
            balance: Number(w.balance),
            color: w.color,
            icon: w.icon,
            icon_metadata: w.icon_metadata,
            exclude_from_total: w.exclude_from_total,
            is_archived: w.is_archived,
            is_deleted: w.is_deleted,
            created_at: w.created_at,
            updated_at: w.updated_at,
            sync_status: 'synced',
          }))
          await db.wallets.bulkPut(wallets)
        }

        if (cloudCats && cloudCats.length > 0) {
          const categories: Category[] = cloudCats.map(c => ({
            id: c.id,
            name: c.name,
            icon: c.icon,
            color: c.color,
            type: c.type,
            parent_id: c.parent_id,
            is_default: c.is_default,
            is_deleted: c.is_deleted,
            created_at: c.created_at,
            updated_at: c.updated_at,
            sync_status: 'synced',
          }))
          await db.categories.bulkPut(categories)
        }

        if (cloudTxs && cloudTxs.length > 0) {
          const transactions: Transaction[] = cloudTxs.map(t => ({
            id: t.id,
            date: t.date,
            title: t.title,
            amount: Number(t.amount),
            type: t.type,
            category_id: t.category_id,
            wallet_id: t.wallet_id,
            to_wallet_id: t.to_wallet_id,
            notes: t.notes,
            receipt_url: t.receipt_url,
            is_deleted: t.is_deleted,
            created_at: t.created_at,
            updated_at: t.updated_at,
            sync_status: 'synced',
          }))
          await db.transactions.bulkPut(transactions)
        }

        if (cloudBudgets && cloudBudgets.length > 0) {
          const budgets: Budget[] = cloudBudgets.map(b => ({
            id: b.id,
            category_id: b.category_id,
            wallet_id: b.wallet_id,
            amount: Number(b.amount),
            period: b.period,
            spent: Number(b.spent),
            starts_at: b.starts_at,
            is_deleted: b.is_deleted,
            created_at: b.created_at,
            updated_at: b.updated_at,
            sync_status: 'synced',
          }))
          await db.budgets.bulkPut(budgets)
        }
      } else {
        // Cloud is empty for this user, push local data to cloud
        await this.pushLocalToCloud(userId)
      }

      return true
    } catch (err) {
      console.error('[supabaseSync] Error during syncAll:', err)
      return false
    }
  },

  /**
   * Push local records to Supabase.
   */
  async pushLocalToCloud(userId: string): Promise<void> {
    if (!navigator.onLine) return

    try {
      const [localWallets, localCats, localTxs, localBudgets] = await Promise.all([
        db.wallets.toArray(),
        db.categories.toArray(),
        db.transactions.toArray(),
        db.budgets.toArray(),
      ])

      if (localWallets.length > 0) {
        const payload = localWallets.map(w => ({
          id: w.id,
          user_id: userId,
          name: w.name,
          type: w.type,
          currency: w.currency,
          balance: w.balance,
          color: w.color,
          icon: w.icon,
          icon_metadata: w.icon_metadata,
          exclude_from_total: w.exclude_from_total,
          is_archived: w.is_archived,
          is_deleted: w.is_deleted,
          created_at: w.created_at,
          updated_at: w.updated_at,
        }))
        await supabase.from('wallets').upsert(payload)
      }

      if (localCats.length > 0) {
        const payload = localCats.map(c => ({
          id: c.id,
          user_id: userId,
          name: c.name,
          icon: c.icon,
          color: c.color,
          type: c.type,
          parent_id: c.parent_id,
          is_default: c.is_default,
          is_deleted: c.is_deleted,
          created_at: c.created_at,
          updated_at: c.updated_at,
        }))
        await supabase.from('categories').upsert(payload)
      }

      if (localTxs.length > 0) {
        const payload = localTxs.map(t => ({
          id: t.id,
          user_id: userId,
          date: t.date,
          title: t.title,
          amount: t.amount,
          type: t.type,
          category_id: t.category_id,
          wallet_id: t.wallet_id,
          to_wallet_id: t.to_wallet_id,
          notes: t.notes,
          receipt_url: t.receipt_url,
          is_deleted: t.is_deleted,
          created_at: t.created_at || t.updated_at || new Date().toISOString(),
          updated_at: t.updated_at,
        }))
        await supabase.from('transactions').upsert(payload)
      }

      if (localBudgets.length > 0) {
        const payload = localBudgets.map(b => ({
          id: b.id,
          user_id: userId,
          category_id: b.category_id,
          wallet_id: b.wallet_id,
          amount: b.amount,
          period: b.period,
          spent: b.spent,
          starts_at: b.starts_at,
          is_deleted: b.is_deleted,
          created_at: b.created_at,
          updated_at: b.updated_at,
        }))
        await supabase.from('budgets').upsert(payload)
      }
    } catch (err) {
      console.warn('[supabaseSync] pushLocalToCloud error:', err)
    }
  },

  /**
   * Upsert a single transaction to Supabase Cloud
   */
  async syncTransaction(userId: string, tx: Transaction): Promise<void> {
    if (!navigator.onLine) return
    try {
      await supabase.from('transactions').upsert({
        id: tx.id,
        user_id: userId,
        date: tx.date,
        title: tx.title,
        amount: tx.amount,
        type: tx.type,
        category_id: tx.category_id,
        wallet_id: tx.wallet_id,
        to_wallet_id: tx.to_wallet_id,
        notes: tx.notes,
        receipt_url: tx.receipt_url,
        is_deleted: tx.is_deleted,
        created_at: tx.created_at || tx.updated_at || new Date().toISOString(),
        updated_at: tx.updated_at,
      })
    } catch (err) {
      console.warn('[supabaseSync] syncTransaction failed:', err)
    }
  },

  /**
   * Upsert a single wallet to Supabase Cloud
   */
  async syncWallet(userId: string, wallet: Wallet): Promise<void> {
    if (!navigator.onLine) return
    try {
      await supabase.from('wallets').upsert({
        id: wallet.id,
        user_id: userId,
        name: wallet.name,
        type: wallet.type,
        currency: wallet.currency,
        balance: wallet.balance,
        color: wallet.color,
        icon: wallet.icon,
        icon_metadata: wallet.icon_metadata,
        exclude_from_total: wallet.exclude_from_total,
        is_archived: wallet.is_archived,
        is_deleted: wallet.is_deleted,
        created_at: wallet.created_at,
        updated_at: wallet.updated_at,
      })
    } catch (err) {
      console.warn('[supabaseSync] syncWallet failed:', err)
    }
  },

  /**
   * Upsert a single budget to Supabase Cloud
   */
  async syncBudget(userId: string, budget: Budget): Promise<void> {
    if (!navigator.onLine) return
    try {
      await supabase.from('budgets').upsert({
        id: budget.id,
        user_id: userId,
        category_id: budget.category_id,
        wallet_id: budget.wallet_id,
        amount: budget.amount,
        period: budget.period,
        spent: budget.spent,
        starts_at: budget.starts_at,
        is_deleted: budget.is_deleted,
        created_at: budget.created_at,
        updated_at: budget.updated_at,
      })
    } catch (err) {
      console.warn('[supabaseSync] syncBudget failed:', err)
    }
  },
}
