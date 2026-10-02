import { useState, useMemo } from 'react'
import { Search, X, ChevronLeft, ChevronRight, SlidersHorizontal, Sparkles, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useTransactions } from '@/features/transactions/hooks'
import { useDeleteTransaction } from '@/features/transactions/hooks'
import { useWallets } from '@/features/wallet/hooks'
import { useCategories } from '@/features/analytics/hooks'
import { useUIStore } from '@/stores'
import { seedDummyData } from '@/lib/seedDummyData'
import { useDebugMode } from '@/lib/debug'
import { TransactionItem } from './TransactionItem'
import { groupByDate, formatPeriod, formatRupiah } from '@/lib/formatters'
import type { Transaction } from '@/types'

// ─────────────────────────────────────────────
// Period navigator helpers
// ─────────────────────────────────────────────

function shiftPeriod(period: string, delta: -1 | 1): string {
  const [year, month] = period.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function isCurrentMonth(period: string): boolean {
  const now = new Date()
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return period === current
}

// ─────────────────────────────────────────────
// Type filter config
// ─────────────────────────────────────────────

type TypeFilter = 'all' | 'expense' | 'income' | 'transfer'

const TYPE_FILTERS: Array<{ value: TypeFilter; label: string; icon: string }> = [
  { value: 'all',      label: 'Semua',       icon: '⚡' },
  { value: 'expense',  label: 'Keluar',      icon: '💸' },
  { value: 'income',   label: 'Masuk',       icon: '💰' },
  { value: 'transfer', label: 'Transfer',    icon: '↔️' },
]

// ─────────────────────────────────────────────
// SummaryStrip — totals bar
// ─────────────────────────────────────────────

interface SummaryStripProps {
  transactions: Transaction[]
}

function SummaryStrip({ transactions }: SummaryStripProps) {
  const income   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense  = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const net      = income - expense

  return (
    <div
      className="mx-4 mb-3 grid grid-cols-3 overflow-hidden rounded-2xl"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--glass-border)' }}
    >
      {/* Income */}
      <div className="flex flex-col items-center px-2 py-3">
        <span className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
          Masuk
        </span>
        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--income)' }}>
          {formatRupiah(income, true)}
        </span>
      </div>

      {/* Dividers */}
      <div
        className="flex flex-col items-center px-2 py-3"
        style={{ borderLeft: '1px solid var(--glass-border)', borderRight: '1px solid var(--glass-border)' }}
      >
        <span className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
          Keluar
        </span>
        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--expense)' }}>
          {formatRupiah(expense, true)}
        </span>
      </div>

      {/* Net */}
      <div className="flex flex-col items-center px-2 py-3">
        <span className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
          Selisih
        </span>
        <span
          className="text-sm font-bold tabular-nums"
          style={{ color: net >= 0 ? 'var(--income)' : 'var(--expense)' }}
        >
          {net >= 0 ? '+' : '−'}{formatRupiah(Math.abs(net), true)}
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// DateSection header
// ─────────────────────────────────────────────

interface DateSectionHeaderProps {
  label: string
  count: number
}

function DateSectionHeader({ label, count }: DateSectionHeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-1.5"
      style={{ background: 'var(--surface-3)' }}
    >
      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{ background: 'var(--surface-2)', color: 'var(--text-faint)' }}
      >
        {count}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────

interface EmptyStateProps {
  hasFilters: boolean
  onPullDemo?: () => void
  isPulling?: boolean
}

function EmptyState({ hasFilters, onPullDemo, isPulling }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="text-5xl">{hasFilters ? '🔍' : '📭'}</span>
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {hasFilters ? 'Tidak ada transaksi ditemukan' : 'Belum ada transaksi'}
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-faint)' }}>
          {hasFilters
            ? 'Coba ubah filter atau kata kunci pencarian'
            : 'Ketuk tombol + untuk mencatat transaksi atau tarik data demo'}
        </p>
      </div>
      {!hasFilters && onPullDemo && (
        <button
          type="button"
          onClick={onPullDemo}
          disabled={isPulling}
          className="mt-2 flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-50"
          style={{ background: 'var(--accent)', boxShadow: '0 4px 12px var(--accent-glow)' }}
        >
          {isPulling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          <span>Tarik Data Demo</span>
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// LoadingSkeleton
// ─────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-1 px-4 pt-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <div
            className="h-10 w-10 flex-shrink-0 rounded-xl animate-pulse"
            style={{ background: 'var(--surface-3)' }}
          />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-3 w-2/3 rounded-full animate-pulse" style={{ background: 'var(--surface-3)' }} />
            <div className="h-2.5 w-1/3 rounded-full animate-pulse" style={{ background: 'var(--surface-3)' }} />
          </div>
          <div className="h-3.5 w-16 rounded-full animate-pulse" style={{ background: 'var(--surface-3)' }} />
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// TransactionsView — main view component
// ─────────────────────────────────────────────

/**
 * TransactionsView — Full transaction history for the active period.
 *
 * Features:
 *  - Period navigator (prev/next month)
 *  - Real-time search by title
 *  - Type filter chips (All / Expense / Income / Transfer)
 *  - Wallet filter (dropdown)
 *  - Summary strip (in / out / net)
 *  - Grouped list by date with date section headers
 *  - Inline delete confirmation per row
 */
export function TransactionsView() {
  const queryClient = useQueryClient()
  const isDebug = useDebugMode()
  // ── Zustand ─────────────────────────────────────────────────────────
  const currentPeriod    = useUIStore(s => s.currentPeriod)
  const setCurrentPeriod = useUIStore(s => s.setCurrentPeriod)

  // ── Local filter state ───────────────────────────────────────────────
  const [search,       setSearch]       = useState('')
  const [typeFilter,   setTypeFilter]   = useState<TypeFilter>('all')
  const [walletFilter, setWalletFilter] = useState<string>('all')
  const [showFilters,  setShowFilters]  = useState(false)
  const [isPullingDemo, setIsPullingDemo] = useState(false)

  const handlePullDemo = async () => {
    setIsPullingDemo(true)
    try {
      await seedDummyData(true)
      await queryClient.invalidateQueries()
    } catch (err) {
      console.error('[TransactionsView] Failed to pull demo data:', err)
    } finally {
      setIsPullingDemo(false)
    }
  }

  // ── Data hooks ───────────────────────────────────────────────────────
  const { data: rawTransactions = [], isLoading } = useTransactions()
  const { data: wallets = [] }                    = useWallets()
  const { data: mainCategories = [] }             = useCategories()

  // ── Delete mutation ──────────────────────────────────────────────────
  const { mutate: deleteTxn, variables: deletingId } = useDeleteTransaction()

  // ── Client-side filter pipeline ──────────────────────────────────────
  const filtered = useMemo(() => {
    let result = rawTransactions

    // Search by title
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(t => t.title.toLowerCase().includes(q))
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(t => t.type === typeFilter)
    }

    // Wallet filter
    if (walletFilter !== 'all') {
      result = result.filter(t =>
        t.wallet_id === walletFilter || t.to_wallet_id === walletFilter,
      )
    }

    return result
  }, [rawTransactions, search, typeFilter, walletFilter])

  // ── Group by date ────────────────────────────────────────────────────
  const groups = useMemo(() => groupByDate(filtered), [filtered])

  // ── Category lookup map ──────────────────────────────────────────────
  const catMap = useMemo(() => {
    const m = new Map<string, { icon: string; name: string }>()
    mainCategories.forEach(c => m.set(c.id, { icon: c.icon, name: c.name }))
    return m
  }, [mainCategories])

  // ── Derived ─────────────────────────────────────────────────────────
  const hasFilters = search.trim() !== '' || typeFilter !== 'all' || walletFilter !== 'all'

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--surface-1)' }}>

      {/* ── Header ── */}
      <div className="flex-shrink-0 px-4 pb-3 pt-4">

        {/* Title + period navigator */}
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Riwayat
          </h1>

          {/* Month navigator */}
          <div
            className="flex items-center gap-1 rounded-2xl px-1 py-1"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--glass-border)' }}
          >
            <button
              type="button"
              onClick={() => setCurrentPeriod(shiftPeriod(currentPeriod, -1))}
              className="no-tap-highlight flex h-7 w-7 items-center justify-center rounded-xl transition-all active:scale-90"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="min-w-[90px] text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatPeriod(currentPeriod, 'long')}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPeriod(shiftPeriod(currentPeriod, 1))}
              disabled={isCurrentMonth(currentPeriod)}
              className="no-tap-highlight flex h-7 w-7 items-center justify-center rounded-xl transition-all active:scale-90 disabled:opacity-30"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Bulan berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search + filter toggle */}
        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div
            className="flex flex-1 items-center gap-2 rounded-2xl px-3 py-2.5"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--glass-border)' }}
          >
            <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-faint)' }} />
            <input
              type="search"
              placeholder="Cari transaksi..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ color: 'var(--text-faint)' }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter toggle button */}
          <button
            type="button"
            onClick={() => setShowFilters(s => !s)}
            className="no-tap-highlight flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-xl transition-all active:scale-90"
            style={{
              background: showFilters || hasFilters ? 'var(--accent-dim)' : 'var(--surface-2)',
              color:      showFilters || hasFilters ? 'var(--accent)'     : 'var(--text-muted)',
              border:     showFilters || hasFilters ? '1px solid var(--accent)' : '1px solid var(--glass-border)',
            }}
            aria-label="Filter transaksi"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* ── Expandable filter panel ── */}
        {showFilters && (
          <div className="mt-3 flex flex-col gap-2">
            {/* Type filter chips */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              {TYPE_FILTERS.map(f => {
                const isActive = typeFilter === f.value
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setTypeFilter(f.value)}
                    className="no-tap-highlight flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-95"
                    style={{
                      background: isActive ? 'var(--accent-dim)' : 'var(--surface-3)',
                      color:      isActive ? 'var(--accent)'     : 'var(--text-muted)',
                      border:     isActive ? '1px solid var(--accent)' : '1px solid transparent',
                    }}
                  >
                    <span>{f.icon}</span>
                    {f.label}
                  </button>
                )
              })}
            </div>

            {/* Wallet filter */}
            {wallets.length > 1 && (
              <div
                className="relative flex items-center rounded-2xl px-3 py-2"
                style={{ background: 'var(--surface-3)', border: '1px solid var(--glass-border)' }}
              >
                <select
                  value={walletFilter}
                  onChange={e => setWalletFilter(e.target.value)}
                  className="w-full cursor-pointer appearance-none bg-transparent text-xs font-semibold outline-none pr-5"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <option value="all">🏦 Semua Dompet</option>
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                  ))}
                </select>
                <ChevronRight
                  className="pointer-events-none absolute right-3 h-3 w-3 rotate-90"
                  style={{ color: 'var(--text-faint)' }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Summary strip ── */}
      {!isLoading && rawTransactions.length > 0 && (
        <SummaryStrip transactions={filtered.length > 0 ? filtered : rawTransactions} />
      )}

      {/* ── Transaction list ── */}
      <div
        className="flex-1 overflow-y-auto scrollbar-none rounded-t-3xl"
        style={{ background: 'var(--surface-0)' }}
      >
        {isLoading ? (
          <LoadingSkeleton />
        ) : groups.length === 0 ? (
          <EmptyState
            hasFilters={hasFilters}
            onPullDemo={isDebug ? handlePullDemo : undefined}
            isPulling={isPullingDemo}
          />
        ) : (
          <div className="pb-6">
            {groups.map(group => (
              <div key={group.dateKey}>
                {/* Date section header */}
                <DateSectionHeader label={group.label} count={group.items.length} />

                {/* Transaction rows */}
                <div
                  className="mx-3 my-1 overflow-hidden rounded-2xl"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--glass-border)',
                    boxShadow: '0 1px 4px oklch(0 0 0 / 4%)',
                  }}
                >
                  {group.items.map((txn, idx) => {
                    const cat = catMap.get(txn.category_id)
                    return (
                      <div key={txn.id}>
                        {idx > 0 && (
                          <div
                            className="mx-4 h-px"
                            style={{ background: 'var(--glass-border)' }}
                          />
                        )}
                        <TransactionItem
                          transaction={txn}
                          categoryIcon={cat?.icon}
                          categoryName={cat?.name}
                          onDelete={id => deleteTxn(id)}
                          isDeleting={deletingId === txn.id}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
