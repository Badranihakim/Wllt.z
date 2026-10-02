import { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { TrendingUp, ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { useTransactions } from '@/features/transactions/hooks'
import { useUIStore } from '@/stores'
import { formatRupiah } from '@/lib/formatters'

interface WeeklyBucket {
  name: string
  income: number
  expense: number
}

export function DashboardCashFlowChart() {
  const currentPeriod = useUIStore(s => s.currentPeriod)
  const activeWalletId = useUIStore(s => s.activeWalletId)
  const { data: rawTransactions = [], isLoading } = useTransactions()

  const { chartData, totalIncome, totalExpense } = useMemo(() => {
    // Filter transactions by current month and active wallet
    const filtered = rawTransactions.filter(t => {
      if (t.is_deleted) return false
      if (!t.date.startsWith(currentPeriod)) return false
      if (activeWalletId && t.wallet_id !== activeWalletId && t.to_wallet_id !== activeWalletId) return false
      return true
    })

    const buckets: Record<string, WeeklyBucket> = {
      w1: { name: 'Mgg 1', income: 0, expense: 0 },
      w2: { name: 'Mgg 2', income: 0, expense: 0 },
      w3: { name: 'Mgg 3', income: 0, expense: 0 },
      w4: { name: 'Mgg 4', income: 0, expense: 0 },
      w5: { name: 'Mgg 5', income: 0, expense: 0 },
    }

    let sumInc = 0
    let sumExp = 0

    filtered.forEach(tx => {
      const day = parseInt(tx.date.slice(8, 10), 10) || 1
      let bucketKey = 'w1'
      if (day <= 7) bucketKey = 'w1'
      else if (day <= 14) bucketKey = 'w2'
      else if (day <= 21) bucketKey = 'w3'
      else if (day <= 28) bucketKey = 'w4'
      else bucketKey = 'w5'

      if (tx.type === 'income') {
        buckets[bucketKey].income += tx.amount
        sumInc += tx.amount
      } else if (tx.type === 'expense') {
        buckets[bucketKey].expense += tx.amount
        sumExp += tx.amount
      }
    })

    // If week 5 has no data, only show 4 weeks
    const dataList = [buckets.w1, buckets.w2, buckets.w3, buckets.w4]
    if (buckets.w5.income > 0 || buckets.w5.expense > 0) {
      dataList.push(buckets.w5)
    }

    return {
      chartData: dataList,
      totalIncome: sumInc,
      totalExpense: sumExp,
    }
  }, [rawTransactions, currentPeriod, activeWalletId])

  const netCashFlow = totalIncome - totalExpense
  const hasData = totalIncome > 0 || totalExpense > 0

  return (
    <div
      className="p-5 rounded-3xl transition-all duration-200 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full"
      style={{ background: 'var(--surface-2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl text-sm"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
          >
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Tren Arus Kas
            </h3>
            <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
              Pemasukan vs Pengeluaran per Minggu
            </p>
          </div>
        </div>

        {/* Cashflow Net Status Pill */}
        <div
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{
            background: netCashFlow >= 0 ? 'oklch(0.52 0.17 160 / 12%)' : 'oklch(0.58 0.22 22 / 12%)',
            color: netCashFlow >= 0 ? 'var(--income)' : 'var(--expense)',
          }}
        >
          {netCashFlow >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          <span>{netCashFlow >= 0 ? 'Surplus' : 'Defisit'} {formatRupiah(Math.abs(netCashFlow), true)}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative flex-1 w-full min-h-[220px] pt-1 flex flex-col justify-center">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            Memuat grafik...
          </div>
        ) : !hasData ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-xs text-slate-400 gap-1">
            <span>📊</span>
            <span>Belum ada transaksi di bulan ini.</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0 0 0 / 6%)" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'var(--text-faint)' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'var(--text-faint)' }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const inc = Number(payload[0]?.value) || 0
                  const exp = Number(payload[1]?.value) || 0
                  return (
                    <div
                      className="rounded-2xl p-3 shadow-lg border border-slate-100 dark:border-slate-800 text-xs"
                      style={{ background: 'var(--surface-1)' }}
                    >
                      <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                        {payload[0]?.payload?.name}
                      </p>
                      <div className="flex items-center justify-between gap-4 text-emerald-600 font-semibold">
                        <span>Pemasukan:</span>
                        <span>+{formatRupiah(inc)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-red-500 font-semibold">
                        <span>Pengeluaran:</span>
                        <span>-{formatRupiah(exp)}</span>
                      </div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="income" name="Pemasukan" fill="#10B981" radius={[5, 5, 0, 0]} maxBarSize={28} />
              <Bar dataKey="expense" name="Pengeluaran" fill="#EF4444" radius={[5, 5, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer Legend */}
      <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-slate-500">Pemasukan:</span>
          <span className="font-bold text-emerald-600">+{formatRupiah(totalIncome, true)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="text-slate-500">Pengeluaran:</span>
          <span className="font-bold text-red-500">-{formatRupiah(totalExpense, true)}</span>
        </div>
      </div>
    </div>
  )
}
