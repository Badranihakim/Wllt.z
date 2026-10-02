import { useState, useMemo } from 'react'
import { Target, ChevronRight, CheckCircle2, Plus, X, Check, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useBudgets } from '@/features/budgets/hooks'
import { useCategories } from '@/features/analytics/hooks'
import { useTransactions } from '@/features/transactions/hooks'
import { useUIStore } from '@/stores'
import { formatRupiah } from '@/lib/formatters'
import { budgetRepo } from '@/repositories'
import { queryKeys } from '@/lib/queryKeys'
import type { Budget } from '@/types'

export function DashboardBudgetProgress() {
  const queryClient = useQueryClient()
  const navigateTo = useUIStore(s => s.navigateTo)
  const currentPeriod = useUIStore(s => s.currentPeriod)

  const { data: rawBudgets = [], isLoading: isLoadingBudgets } = useBudgets(currentPeriod)
  const { data: categories = [], isLoading: isLoadingCats } = useCategories()
  const { data: transactions = [] } = useTransactions()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCatId, setSelectedCatId] = useState<string>('')
  const [inputLimit, setInputLimit] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const categoryMap = useMemo(() => {
    return new Map(categories.map(c => [c.id, c]))
  }, [categories])

  const expenseCategories = useMemo(() => {
    return categories.filter(c => c.type === 'expense' && c.parent_id === null)
  }, [categories])

  // Map subcategory ID to parent category ID for accurate transaction spending rollup
  const parentMap = useMemo(() => {
    const map = new Map<string, string>()
    categories.forEach(c => {
      if (c.parent_id) map.set(c.id, c.parent_id)
    })
    return map
  }, [categories])

  // Live spent amount per top-level category in currentPeriod
  const liveSpentMap = useMemo(() => {
    const map = new Map<string, number>()
    transactions.forEach(t => {
      if (t.is_deleted || t.type !== 'expense') return
      if (!t.date.startsWith(currentPeriod)) return
      const topCatId = parentMap.get(t.category_id) || t.category_id
      map.set(topCatId, (map.get(topCatId) || 0) + t.amount)
    })
    return map
  }, [transactions, currentPeriod, parentMap])

  // Active budgets with amount > 0
  const topBudgets = useMemo(() => {
    return rawBudgets
      .filter(b => !b.is_deleted && b.amount > 0)
      .map(b => {
        const liveSpent = liveSpentMap.get(b.category_id)
        return {
          ...b,
          spent: liveSpent !== undefined ? liveSpent : b.spent,
        }
      })
      .sort((a, b) => {
        const pctA = a.amount > 0 ? a.spent / a.amount : 0
        const pctB = b.amount > 0 ? b.spent / b.amount : 0
        return pctB - pctA
      })
      .slice(0, 4)
  }, [rawBudgets, liveSpentMap])

  const isLoading = isLoadingBudgets || isLoadingCats

  // Open modal prefilled for a given category or first available
  const handleOpenAdd = (categoryId?: string, currentAmount?: number) => {
    const targetCatId = categoryId || expenseCategories[0]?.id || ''
    setSelectedCatId(targetCatId)
    setInputLimit(currentAmount ? String(currentAmount) : '')
    setSaveError(null)
    setIsModalOpen(true)
  }

  // Handle saving new or updated budget
  const handleSaveBudget = async () => {
    const parsed = parseInt(inputLimit.replace(/\D/g, ''), 10)
    if (!selectedCatId) {
      setSaveError('Pilih kategori terlebih dahulu')
      return
    }
    if (isNaN(parsed) || parsed <= 0) {
      setSaveError('Masukkan jumlah limit yang valid')
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const existing = rawBudgets.find(
        b => b.category_id === selectedCatId && (b.period === currentPeriod || b.period === 'monthly')
      )

      const budgetToSave: Budget = existing
        ? { ...existing, amount: parsed, period: currentPeriod }
        : {
            id: crypto.randomUUID(),
            category_id: selectedCatId,
            wallet_id: null,
            amount: parsed,
            period: currentPeriod,
            spent: liveSpentMap.get(selectedCatId) || 0,
            starts_at: `${currentPeriod}-01`,
            is_deleted: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sync_status: 'local_only',
          }

      await budgetRepo.save(budgetToSave)
      await queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all() })
      setIsModalOpen(false)
    } catch (err) {
      console.error('[DashboardBudgetProgress] Failed to save budget:', err)
      setSaveError('Gagal menyimpan anggaran. Silakan coba lagi.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div
        className="p-5 rounded-3xl transition-all duration-200 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full"
        style={{ background: 'var(--surface-2)' }}
      >
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl text-sm"
                style={{ background: 'oklch(0.85 0.14 85 / 15%)', color: '#D97706' }}
              >
                <Target className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Target Anggaran
                </h3>
                <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
                  Realisasi Pengeluaran per Kategori
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenAdd()}
                title="Atur / Tambah Anggaran"
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => navigateTo('budgets')}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                <span>Kelola</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List of Budgets */}
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Memuat data anggaran...
            </div>
          ) : topBudgets.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-2">
              <div className="h-10 w-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xl">
                🎯
              </div>
              <p className="text-xs font-medium text-slate-500">
                Belum ada anggaran bulanan yang disetel.
              </p>
              <button
                type="button"
                onClick={() => handleOpenAdd()}
                className="mt-1 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                style={{ background: 'var(--accent)', color: '#ffffff' }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Atur Anggaran</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {topBudgets.map(b => {
                const cat = categoryMap.get(b.category_id)
                const percentage = b.amount > 0 ? Math.round((b.spent / b.amount) * 100) : 0
                const isOver = percentage >= 100
                const isWarning = percentage >= 75 && !isOver

                const barColor = isOver
                  ? 'bg-red-500'
                  : isWarning
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'

                const badgeColor = isOver
                  ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:border-red-900/60'
                  : isWarning
                  ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/60'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/60'

                return (
                  <div
                    key={b.id}
                    onClick={() => handleOpenAdd(b.category_id, b.amount)}
                    className="space-y-1.5 p-2 -mx-2 rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                    title="Klik untuk mengubah limit anggaran"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{cat?.icon || '📦'}</span>
                        <span className="font-bold truncate text-slate-800 dark:text-slate-200">
                          {cat?.name || 'Kategori'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-slate-500">
                          {formatRupiah(b.spent, true)} / {formatRupiah(b.amount, true)}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${badgeColor}`}>
                          {percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer Info */}
        {topBudgets.length > 0 && (
          <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Terpantau otomatis dari transaksi harian Anda</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick Budget Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => !isSaving && setIsModalOpen(false)}
          />

          <div
            className="relative w-full max-w-md rounded-3xl p-6 shadow-2xl transition-all"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--glass-border)' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-base"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                >
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    Atur Limit Anggaran
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                    Pilih kategori dan tentukan batas pengeluaran
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Selector */}
            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-slate-500">
                Kategori Pengeluaran
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                {expenseCategories.map(cat => {
                  const isSelected = selectedCatId === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCatId(cat.id)
                        // If this category already has a budget, populate its amount
                        const existing = rawBudgets.find(
                          b => b.category_id === cat.id && (b.period === currentPeriod || b.period === 'monthly')
                        )
                        if (existing && existing.amount > 0) {
                          setInputLimit(String(existing.amount))
                        }
                      }}
                      className="flex items-center gap-2 p-2 rounded-xl text-left text-xs font-semibold transition-all border cursor-pointer"
                      style={{
                        background: isSelected ? 'var(--accent-dim)' : 'var(--surface-2)',
                        borderColor: isSelected ? 'var(--accent)' : 'var(--glass-border)',
                        color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                      }}
                    >
                      <span className="text-base">{cat.icon}</span>
                      <span className="truncate">{cat.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Amount Input */}
            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-slate-500">
                Batas Anggaran Bulanan
              </label>
              <div
                className="flex items-center gap-3 rounded-2xl px-4 py-3 border"
                style={{
                  background: 'var(--surface-2)',
                  borderColor: saveError ? 'var(--expense)' : 'var(--glass-border)',
                }}
              >
                <span className="text-sm font-bold text-slate-400">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={
                    inputLimit
                      ? parseInt(inputLimit.replace(/\D/g, ''), 10).toLocaleString('id-ID')
                      : ''
                  }
                  onChange={e => {
                    setInputLimit(e.target.value.replace(/\D/g, ''))
                    if (saveError) setSaveError(null)
                  }}
                  className="flex-1 bg-transparent text-lg font-bold outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
                {inputLimit && (
                  <button
                    type="button"
                    onClick={() => setInputLimit('')}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {saveError && (
                <p className="mt-1.5 text-xs font-medium text-red-500">{saveError}</p>
              )}
            </div>

            {/* Quick Amount Chips */}
            <div className="flex flex-wrap gap-1.5 mb-6">
              {[250_000, 500_000, 1_000_000, 2_000_000, 5_000_000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setInputLimit(String(val))}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer"
                  style={{
                    background: inputLimit === String(val) ? 'var(--accent)' : 'var(--surface-2)',
                    color: inputLimit === String(val) ? '#ffffff' : 'var(--text-muted)',
                    borderColor: 'var(--glass-border)',
                  }}
                >
                  {formatRupiah(val, true)}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 rounded-2xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                style={{ background: 'var(--surface-3)' }}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSaving || !inputLimit}
                onClick={handleSaveBudget}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                style={{ background: 'var(--accent)', color: '#ffffff' }}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Simpan Anggaran</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
