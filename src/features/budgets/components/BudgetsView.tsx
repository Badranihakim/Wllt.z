import { useState, useCallback, useRef, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  PieChart,
  Plus,
  Check,
  X,
  TrendingUp,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useBudgets } from '@/features/budgets/hooks'
import { useCategories } from '@/features/analytics/hooks'
import { useUIStore, getPreviousPeriod, getNextPeriod } from '@/stores'
import { formatRupiah, formatPeriod } from '@/lib/formatters'
import { budgetRepo } from '@/repositories'
import { queryKeys } from '@/lib/queryKeys'
import type { Budget, Category } from '@/types'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface BudgetWithCategory {
  budget: Budget
  category: Category | undefined
}

// ─────────────────────────────────────────────
// Utilization helpers
// ─────────────────────────────────────────────

/**
 * Compute budget utilization percentage.
 * Returns a value > 100 when over-budget.
 *
 * Formula: (spent / limit) × 100
 */
function getUtilization(budget: Budget): number {
  if (budget.amount === 0) return 0
  return (budget.spent / budget.amount) * 100
}

/**
 * Color-coding State Machine based on utilization %.
 *
 *  < 70%  → emerald (safe)
 *  70-90% → amber   (warning)
 *  ≥ 100% → red     (over-budget, animated glow)
 *  90-100%→ red     (critical)
 */
type BudgetStatus = 'safe' | 'warning' | 'critical' | 'over'

function getBudgetStatus(utilization: number): BudgetStatus {
  if (utilization >= 100) return 'over'
  if (utilization >= 90)  return 'critical'
  if (utilization >= 70)  return 'warning'
  return 'safe'
}

const STATUS_COLORS: Record<BudgetStatus, { bar: string; text: string; glow: string; bg: string }> = {
  safe:     { bar: '#10b981', text: '#059669', glow: 'none',                           bg: 'oklch(0.52 0.17 160 / 10%)' },
  warning:  { bar: '#f59e0b', text: '#d97706', glow: 'none',                           bg: 'oklch(0.75 0.15 80  / 10%)' },
  critical: { bar: '#ef4444', text: '#dc2626', glow: 'none',                           bg: 'oklch(0.58 0.22 22  / 10%)' },
  over:     { bar: '#ef4444', text: '#dc2626', glow: '0 0 16px oklch(0.58 0.22 22 / 50%)', bg: 'oklch(0.58 0.22 22  / 12%)' },
}

// ─────────────────────────────────────────────
// BudgetsView — root
// ─────────────────────────────────────────────

/**
 * BudgetsView — Monthly budget tracker screen.
 *
 * Reads:
 *   - currentPeriod from Zustand (shared period navigator)
 *   - budgets from useBudgets('monthly') via TanStack Query
 *   - categories from useCategories() to resolve names + icons
 *
 * Renders:
 *   1. Period navigator (◀ Mei 2026 ▶)
 *   2. Aggregated summary bar (total spent / total limit)
 *   3. Per-category glass cards with color-coded progress bars
 *   4. Edit dialog for updating a budget limit
 */
export function BudgetsView() {
  const currentPeriod    = useUIStore(s => s.currentPeriod)
  const setCurrentPeriod = useUIStore(s => s.setCurrentPeriod)

  const { data: budgets  = [], isLoading: budgetsLoading  } = useBudgets(currentPeriod)
  const { data: categories = [], isLoading: catsLoading  } = useCategories()

  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null)

  const isLoading = budgetsLoading || catsLoading

  // Left-Join Pattern: Map all main expense categories to budgets
  let budgetsWithCategory: BudgetWithCategory[] = []
  
  if (!isLoading) {
    const mainExpenseCategories = categories.filter(c => c.type === 'expense' && c.parent_id === null)
    
    budgetsWithCategory = mainExpenseCategories.map(category => {
      // Find real budget for the current period
      const existingBudget = budgets.find(b => b.category_id === category.id && (b.period === currentPeriod || b.period === 'monthly'))
      
      if (existingBudget) {
        return { budget: existingBudget, category }
      }
      
      // Virtual budget for missing ones
      return {
        budget: {
          id: `virtual-${category.id}`,
          category_id: category.id,
          wallet_id: null,
          amount: 0,
          period: currentPeriod,
          spent: 0,
          starts_at: new Date().toISOString(),
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sync_status: 'local_only',
        },
        category
      }
    })
  }

  // Aggregated totals
  const totalLimit = budgetsWithCategory.reduce((s, b) => s + b.budget.amount, 0)
  const totalSpent = budgetsWithCategory.reduce((s, b) => s + b.budget.spent,  0)
  const totalUtil  = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0
  const totalStatus = getBudgetStatus(totalUtil)

  return (
    <div className="min-h-full pb-4">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between px-4 pt-6 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Anggaran<span style={{ color: 'var(--accent)' }}> Bulanan</span>
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Kendali pengeluaranmu</p>
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full glass"
          style={{ border: '1.5px solid var(--accent-dim)' }}
        >
          <PieChart className="h-4 w-4" style={{ color: 'var(--accent)' }} />
        </div>
      </div>

      {/* ── Period Navigator ── */}
      <div className="mx-4 mt-2">
        <PeriodNavigator
          currentPeriod={currentPeriod}
          onPrev={() => setCurrentPeriod(getPreviousPeriod(currentPeriod))}
          onNext={() => setCurrentPeriod(getNextPeriod(currentPeriod))}
        />
      </div>

      {/* ── Aggregated Summary ── */}
      {!isLoading && budgetsWithCategory.length > 0 && (
        <div className="mx-4 mt-3">
          <SummaryCard
            totalSpent={totalSpent}
            totalLimit={totalLimit}
            utilization={totalUtil}
            status={totalStatus}
          />
        </div>
      )}

      {/* ── Budget Card List ── */}
      <div className="mt-4 px-4 space-y-3">
        {isLoading ? (
          <BudgetsSkeletonList />
        ) : budgetsWithCategory.length === 0 ? (
          <EmptyBudgetsState />
        ) : (
          budgetsWithCategory.map(({ budget, category }) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              category={category}
              onEdit={() => setEditingBudgetId(budget.id)}
            />
          ))
        )}
      </div>

      {/* ── Edit Budget Dialog ── */}
      {editingBudgetId && (
        <EditBudgetDialog
          budgetId={editingBudgetId}
          budget={budgetsWithCategory.find(b => b.budget.id === editingBudgetId)!.budget}
          category={budgetsWithCategory.find(b => b.budget.id === editingBudgetId)!.category}
          onClose={() => setEditingBudgetId(null)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// PeriodNavigator
// ─────────────────────────────────────────────

interface PeriodNavigatorProps {
  currentPeriod: string
  onPrev: () => void
  onNext: () => void
}

function PeriodNavigator({ currentPeriod, onPrev, onNext }: PeriodNavigatorProps) {
  return (
    <div
      className="flex items-center justify-between rounded-2xl px-4 py-2.5"
      style={{ background: 'var(--surface-3)' }}
    >
      <button
        onClick={onPrev}
        aria-label="Bulan sebelumnya"
        className="rounded-lg p-1 transition-colors active:scale-90"
        style={{ color: 'var(--text-muted)' }}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        {formatPeriod(currentPeriod, 'long')}
      </span>

      <button
        onClick={onNext}
        aria-label="Bulan berikutnya"
        className="rounded-lg p-1 transition-colors active:scale-90"
        style={{ color: 'var(--text-muted)' }}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
// SummaryCard — Aggregated totals
// ─────────────────────────────────────────────

interface SummaryCardProps {
  totalSpent: number
  totalLimit: number
  utilization: number
  status: BudgetStatus
}

function SummaryCard({ totalSpent, totalLimit, utilization, status }: SummaryCardProps) {
  const colors   = STATUS_COLORS[status]
  const barWidth = Math.min(utilization, 100)
  const remaining = totalLimit - totalSpent

  return (
    <div
      className="glass rounded-3xl p-5"
      style={{ boxShadow: '0 4px 24px oklch(0 0 0 / 8%), 0 1px 4px oklch(0 0 0 / 4%)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Total Anggaran Bulanan
          </p>
          <p className="mt-0.5 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {formatRupiah(totalLimit)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full px-3 py-1"
          style={{ background: colors.bg }}>
          <TrendingUp className="h-3 w-3" style={{ color: colors.text }} />
          <span className="text-xs font-bold" style={{ color: colors.text }}>
            {Math.round(utilization)}%
          </span>
        </div>
      </div>

      {/* Aggregated progress bar */}
      <div className="relative h-2.5 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--surface-3)' }}>
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${barWidth}%`,
            background: colors.bar,
            boxShadow: colors.glow,
          }}
        />
      </div>

      <div className="mt-2.5 flex justify-between">
        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
          Terpakai: <span className="font-semibold" style={{ color: colors.text }}>{formatRupiah(totalSpent)}</span>
        </span>
        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
          Sisa: <span className="font-semibold" style={{ color: remaining >= 0 ? 'var(--income)' : 'var(--expense)' }}>
            {remaining < 0 ? '−' : ''}{formatRupiah(Math.abs(remaining))}
          </span>
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// BudgetCard — per-category glass card
// ─────────────────────────────────────────────

interface BudgetCardProps {
  budget: Budget
  category: Category | undefined
  onEdit: () => void
}

function BudgetCard({ budget, category, onEdit }: BudgetCardProps) {
  const utilization = getUtilization(budget)
  const status      = getBudgetStatus(utilization)
  const colors      = STATUS_COLORS[status]
  const barWidth    = Math.min(utilization, 100)
  const remaining   = budget.amount - budget.spent
  const isOver      = remaining < 0

  return (
    <div
      className="glass rounded-2xl p-4 transition-all duration-200"
      style={{
        boxShadow: status === 'over'
          ? `0 0 0 1.5px oklch(0.58 0.22 22 / 30%), ${colors.glow}, 0 4px 16px oklch(0 0 0 / 6%)`
          : '0 2px 12px oklch(0 0 0 / 6%)',
      }}
    >
      {/* ── Card header ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Category icon */}
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
            style={{ background: category?.color ? `${category.color}22` : 'var(--accent-dim)' }}
          >
            <span role="img" aria-label={category?.name ?? 'Kategori'}>
              {category?.icon ?? '📦'}
            </span>
          </div>

          {/* Category name + status badge */}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {category?.name ?? 'Kategori'}
            </p>
            {status === 'over' && (
              <span
                className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: 'oklch(0.58 0.22 22 / 15%)', color: 'var(--expense)' }}
              >
                Over-budget!
              </span>
            )}
            {status === 'warning' && (
              <span
                className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: 'oklch(0.75 0.15 80 / 15%)', color: '#d97706' }}
              >
                Hampir habis
              </span>
            )}
          </div>
        </div>

        {/* Edit button */}
        <button
          id={`edit-budget-${budget.id}`}
          aria-label={`Edit anggaran ${category?.name ?? ''}`}
          onClick={onEdit}
          className="ml-2 shrink-0 flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-150 active:scale-90"
          style={{
            background: 'var(--surface-3)',
            color: 'var(--text-muted)',
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Progress bar ── */}
      <div className="relative h-2 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--surface-3)' }}>
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${barWidth}%`,
            background: colors.bar,
            boxShadow: colors.glow,
            ...(status === 'over' ? { animation: 'budget-pulse 2s ease-in-out infinite' } : {}),
          }}
        />
      </div>

      {/* ── Amount labels ── */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
          Sisa{' '}
          <span
            className="font-bold"
            style={{ color: isOver ? 'var(--expense)' : colors.text }}
          >
            {isOver ? '−' : ''}{formatRupiah(Math.abs(remaining))}
          </span>
        </span>
        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
          dari{' '}
          <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {formatRupiah(budget.amount)}
          </span>
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// EditBudgetDialog — bottom-sheet input
// ─────────────────────────────────────────────

interface EditBudgetDialogProps {
  budgetId: string
  budget: Budget
  category: Category | undefined
  onClose: () => void
}

function EditBudgetDialog({ budget, category, onClose }: EditBudgetDialogProps) {
  const queryClient = useQueryClient()
  const inputRef    = useRef<HTMLInputElement>(null)
  const currentPeriod = useUIStore(s => s.currentPeriod)

  // Display value in plain IDR number (no formatting while editing)
  const [inputValue, setInputValue] = useState<string>(String(budget.amount))
  const [isSaving, setIsSaving]     = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const handleSave = useCallback(async () => {
    const parsed = parseInt(inputValue.replace(/\D/g, ''), 10)
    if (isNaN(parsed) || parsed <= 0) {
      setError('Masukkan jumlah yang valid')
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const budgetToSave = budget.id.startsWith('virtual-') 
        ? { ...budget, id: crypto.randomUUID(), amount: parsed, period: currentPeriod }
        : { ...budget, amount: parsed, period: currentPeriod }

      await budgetRepo.save(budgetToSave)
      // Invalidate TanStack Query cache to trigger refetch
      await queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all() })
      onClose()
    } catch (err) {
      setError('Gagal menyimpan. Coba lagi.')
      console.error('[EditBudgetDialog] save error:', err)
    } finally {
      setIsSaving(false)
    }
  }, [inputValue, budget, queryClient, onClose])

  // Format display while typing (dots as thousands separator)
  const handleInput = (raw: string) => {
    // Strip non-digits
    const digits = raw.replace(/\D/g, '')
    setInputValue(digits)
    if (error) setError(null)
  }

  const displayAmount = inputValue
    ? parseInt(inputValue, 10).toLocaleString('id-ID')
    : ''

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'oklch(0 0 0 / 35%)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[430px] rounded-t-3xl p-6"
        style={{
          background: 'var(--surface-2)',
          boxShadow: '0 -8px 40px oklch(0 0 0 / 16%)',
          animation: 'sheet-slide-up 0.28s cubic-bezier(0.34, 1.26, 0.64, 1) forwards',
        }}
        role="dialog"
        aria-label={`Edit anggaran ${category?.name ?? 'kategori'}`}
      >
        {/* Handle bar */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full" style={{ background: 'var(--surface-3)' }} />

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl"
            style={{ background: category?.color ? `${category.color}22` : 'var(--accent-dim)' }}
          >
            {category?.icon ?? '📦'}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Atur Limit Anggaran
            </p>
            <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              {category?.name ?? 'Kategori'}
            </p>
          </div>
        </div>

        {/* Amount input */}
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 mb-2"
          style={{
            background: 'var(--surface-1)',
            border: `1.5px solid ${error ? 'var(--expense)' : 'var(--glass-border-active)'}`,
          }}
        >
          <span className="text-base font-semibold shrink-0" style={{ color: 'var(--text-muted)' }}>Rp</span>
          <input
            ref={inputRef}
            id={`budget-amount-input-${budget.id}`}
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={displayAmount}
            onChange={e => handleInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="flex-1 bg-transparent text-xl font-bold outline-none"
            style={{ color: 'var(--text-primary)' }}
            aria-label="Jumlah limit anggaran"
          />
          {inputValue && (
            <button
              aria-label="Hapus input"
              onClick={() => setInputValue('')}
              className="rounded-full p-1 transition-colors"
              style={{ color: 'var(--text-faint)' }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {error && (
          <p className="mb-3 text-xs font-medium" style={{ color: 'var(--expense)' }}>
            {error}
          </p>
        )}

        {/* Quick amount chips */}
        <div className="flex flex-wrap gap-2 mb-5">
          {[100_000, 250_000, 500_000, 1_000_000, 2_000_000].map(preset => (
            <button
              key={preset}
              onClick={() => setInputValue(String(preset))}
              className="rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-95"
              style={{
                background: inputValue === String(preset) ? 'var(--accent)' : 'var(--accent-dim)',
                color: inputValue === String(preset) ? '#fff' : 'var(--accent)',
              }}
            >
              {formatRupiah(preset, true)}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl py-3.5 text-sm font-semibold transition-all active:scale-98"
            style={{
              background: 'var(--surface-3)',
              color: 'var(--text-secondary)',
            }}
          >
            Batal
          </button>
          <button
            id={`save-budget-${budget.id}`}
            onClick={handleSave}
            disabled={isSaving || !inputValue}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              boxShadow: '0 4px 16px var(--accent-glow)',
            }}
          >
            {isSaving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Simpan
          </button>
        </div>
      </div>

      <style>{`
        @keyframes sheet-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes budget-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
      `}</style>
    </>
  )
}

// ─────────────────────────────────────────────
// EmptyBudgetsState
// ─────────────────────────────────────────────

function EmptyBudgetsState() {
  const openAddTransaction = useUIStore(s => s.openAddTransaction)

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
      {/* Illustrated empty icon */}
      <div
        className="flex h-20 w-20 items-center justify-center rounded-3xl text-4xl"
        style={{
          background: 'var(--accent-dim)',
          boxShadow: '0 8px 32px var(--accent-glow)',
        }}
      >
        📊
      </div>

      <div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Belum Ada Anggaran
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-faint)' }}>
          Tambahkan transaksi pengeluaran dan atur batas limit<br />untuk mulai melacak anggaran bulananmu.
        </p>
      </div>

      <button
        onClick={openAddTransaction}
        className="flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-white transition-all active:scale-95"
        style={{
          background: 'var(--accent)',
          boxShadow: '0 4px 16px var(--accent-glow)',
        }}
      >
        <Plus className="h-4 w-4" />
        Tambah Transaksi
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
// BudgetsSkeletonList — Loading placeholder
// ─────────────────────────────────────────────

function BudgetsSkeletonList() {
  return (
    <>
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="glass rounded-2xl p-4 animate-pulse"
          style={{ opacity: 1 - i * 0.15 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl" style={{ background: 'var(--surface-3)' }} />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-28 rounded-full" style={{ background: 'var(--surface-3)' }} />
              <div className="h-2.5 w-16 rounded-full" style={{ background: 'var(--surface-3)' }} />
            </div>
          </div>
          <div className="h-2 w-full rounded-full" style={{ background: 'var(--surface-3)' }} />
          <div className="mt-2 flex justify-between">
            <div className="h-2.5 w-24 rounded-full" style={{ background: 'var(--surface-3)' }} />
            <div className="h-2.5 w-20 rounded-full" style={{ background: 'var(--surface-3)' }} />
          </div>
        </div>
      ))}
    </>
  )
}
