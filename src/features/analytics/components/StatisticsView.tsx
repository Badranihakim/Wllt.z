import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { ChevronLeft, ChevronRight, Search, ChevronDown, TrendingUp, ArrowRightLeft, Activity } from 'lucide-react'
import { transactionRepo, categoryRepo, walletRepo } from '@/repositories'
import { queryKeys } from '@/lib/queryKeys'
import { formatRupiah } from '@/lib/formatters'
import type { Category, Transaction, Wallet } from '@/types'

type TimeRange = 'weekly' | 'monthly' | 'yearly' | 'all'

export function StatisticsView() {
  const [range, setRange] = useState<TimeRange>('monthly')
  const [offset, setOffset] = useState(0)
  const [txType, setTxType] = useState<'income' | 'expense'>('expense')

  // Calculate dates based on range and offset
  const { from, to, label } = useMemo(() => {
    const now = new Date()
    let fromDate = new Date()
    let toDate = new Date()
    let label = ''

    const pad = (n: number) => String(n).padStart(2, '0')

    if (range === 'weekly') {
      fromDate.setDate(now.getDate() - now.getDay() + 1 + (offset * 7)) // Start of week (Monday)
      toDate = new Date(fromDate)
      toDate.setDate(fromDate.getDate() + 6)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']
      if (fromDate.getMonth() === toDate.getMonth()) {
        label = `${months[fromDate.getMonth()]} ${fromDate.getDate()} - ${toDate.getDate()}`
      } else {
        label = `${months[fromDate.getMonth()]} ${fromDate.getDate()} - ${months[toDate.getMonth()]} ${toDate.getDate()}`
      }
    } else if (range === 'monthly') {
      fromDate.setMonth(now.getMonth() + offset, 1)
      toDate = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 0)
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
      label = `${months[fromDate.getMonth()]} ${fromDate.getFullYear()}`
    } else if (range === 'yearly') {
      fromDate.setFullYear(now.getFullYear() + offset, 0, 1)
      toDate = new Date(fromDate.getFullYear(), 11, 31)
      label = `${fromDate.getFullYear()}`
    } else {
      fromDate = new Date(2000, 0, 1) // all time
      toDate = new Date()
      label = 'Semua Rentang Waktu'
    }

    return {
      from: `${fromDate.getFullYear()}-${pad(fromDate.getMonth() + 1)}-${pad(fromDate.getDate())}`,
      to: `${toDate.getFullYear()}-${pad(toDate.getMonth() + 1)}-${pad(toDate.getDate())}`,
      label
    }
  }, [range, offset])

  const { data: transactions = [] } = useQuery({
    queryKey: ['statistics', 'transactions', from, to],
    queryFn: () => transactionRepo.findByDateRange(from, to)
  })

  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.categories.all(),
    queryFn: () => categoryRepo.findAll()
  })

  const categoryMap = useMemo(() => {
    return categories.reduce((acc, cat) => {
      acc[cat.id] = cat
      return acc
    }, {} as Record<string, Category>)
  }, [categories])

  const chartData = useMemo(() => {
    const filteredTx = transactions.filter(t => t.type === txType)
    const grouped = filteredTx.reduce((acc, t) => {
      if (!acc[t.category_id]) acc[t.category_id] = { amount: 0, count: 0 }
      acc[t.category_id].amount += t.amount
      acc[t.category_id].count += 1
      return acc
    }, {} as Record<string, { amount: number, count: number }>)

    return Object.entries(grouped)
      .map(([categoryId, data]) => {
        const cat = categoryMap[categoryId]
        return {
          name: cat?.name || 'Lainnya',
          value: data.amount,
          count: data.count,
          color: cat?.color || (txType === 'expense' ? '#ef4444' : '#10b981'),
          icon: cat?.icon || '📦'
        }
      })
      .sort((a, b) => b.value - a.value)
  }, [transactions, categoryMap, txType])

  const totalAmount = chartData.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-[#F8FAFC]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#F8FAFC]/90 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="w-6" /> {/* Spacer */}
        <h1 className="text-base font-bold text-slate-900">Statistik</h1>
        <button className="w-6 flex justify-end">
           <div className="w-1 h-1 bg-slate-800 rounded-full shadow-[0_4px_0_var(--color-slate-800),0_8px_0_var(--color-slate-800)] -translate-y-2" />
        </button>
      </header>

      <main className="flex flex-col mt-2">
        {/* Time Range Filter */}
        <div className="flex items-center justify-center px-6">
          <div className="flex items-center justify-between bg-white rounded-full px-1 py-1 shadow-sm border border-slate-50 w-full max-w-[340px] overflow-x-auto no-scrollbar">
            {(['weekly', 'monthly', 'yearly', 'all'] as const).map(r => (
              <button
                key={r}
                onClick={() => { setRange(r); setOffset(0) }}
                className={`px-4 py-1.5 text-[11px] font-bold rounded-full transition-all whitespace-nowrap shrink-0 ${
                  range === r 
                    ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-slate-800' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {r === 'weekly' ? 'Mingguan' : 
                 r === 'monthly' ? 'Bulanan' : 
                 r === 'yearly' ? 'Tahunan' : 'Rentang'}
              </button>
            ))}
          </div>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center justify-between px-6 mt-6">
          <button 
            onClick={() => setOffset(o => o - 1)}
            disabled={range === 'all'}
            className="p-2 text-slate-800 active:scale-90 transition-transform disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold text-slate-800 tracking-wide">{label}</span>
            {range === 'monthly' && (
              <span className="text-[10px] text-slate-400 font-medium">
                (1 {label.split(' ')[0]} - 31 {label.split(' ')[0]})
              </span>
            )}
          </div>

          <button 
            onClick={() => setOffset(o => o + 1)}
            disabled={range === 'all'}
            className="p-2 text-slate-800 active:scale-90 transition-transform disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Income / Expense Toggle */}
        <div className="flex bg-white/60 p-1 rounded-2xl mx-5 mt-6 border border-slate-100 shadow-sm">
          <button 
            onClick={() => setTxType('income')}
            className={`flex-1 py-3 text-[13px] font-bold rounded-xl transition-all ${
              txType === 'income' 
                ? 'bg-white text-emerald-500 shadow-[0_2px_12px_rgba(16,185,129,0.15)] border border-emerald-50' 
                : 'text-slate-400'
            }`}
          >
            Pemasukan
          </button>
          <button 
            onClick={() => setTxType('expense')}
            className={`flex-1 py-3 text-[13px] font-bold rounded-xl transition-all ${
              txType === 'expense' 
                ? 'bg-white text-red-500 shadow-[0_2px_12px_rgba(239,68,68,0.12)] border border-red-50' 
                : 'text-slate-400'
            }`}
          >
            Pengeluaran
          </button>
        </div>

        {/* Donut Chart & Mini Legend Card */}
        <section className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-50 mx-5 mt-6 flex items-center justify-between">
          {chartData.length > 0 ? (
            <>
              {/* Left: Donut Chart */}
              <div className="w-[160px] h-[160px] relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] font-medium text-slate-400 mb-0.5">Total</span>
                  <span className="text-[13px] font-black text-slate-800 tracking-tight">
                    {formatRupiah(totalAmount, true)}
                  </span>
                </div>
              </div>

              {/* Right: Mini Legend */}
              <div className="flex-1 pl-4 flex flex-col gap-2.5">
                {chartData.slice(0, 6).map((item, i) => {
                  const percentage = totalAmount > 0 ? Math.round((item.value / totalAmount) * 100) : 0
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] font-semibold text-slate-600 flex-1 truncate">{item.name}</span>
                      <span className="text-[10px] font-medium text-slate-400 shrink-0">{percentage}%</span>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="w-full h-[160px] flex flex-col items-center justify-center text-center">
              <span className="text-3xl mb-2">📭</span>
              <p className="text-[13px] text-slate-400 font-medium">Tidak ada data</p>
            </div>
          )}
        </section>

        {/* Custom Legend List (Progress Bar Style) */}
        {chartData.length > 0 && (
          <div className="px-5 mt-6 flex flex-col gap-3">
            {chartData.map((item, i) => {
              const percentage = totalAmount > 0 ? Math.round((item.value / totalAmount) * 100) : 0
              return (
                <div key={i} className="bg-white px-4 py-4 rounded-[28px] shadow-sm border border-slate-50 flex items-center gap-4">
                  <div 
                    className="w-[46px] h-[46px] rounded-[18px] flex items-center justify-center text-xl shrink-0 border border-slate-50"
                    style={{ backgroundColor: `${item.color}15`, color: item.color }}
                  >
                    {item.icon}
                  </div>
                  
                  <div className="flex-1 flex justify-between items-center pr-1">
                    <span className="text-[13px] font-bold text-slate-700 w-[35%] truncate pr-2">{item.name}</span>
                    
                    <div className="w-[30%] h-1.5 bg-slate-100 rounded-full overflow-hidden mx-2">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%`, backgroundColor: item.color }} 
                      />
                    </div>
                    
                    <div className="w-[35%] flex flex-col items-end">
                      <span className="text-[13px] font-bold text-slate-700">{percentage}%</span>
                      <span className="text-[10px] font-semibold text-slate-400 mt-0.5">{formatRupiah(item.value, true)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Monthly Insights Card (Only shown on 'monthly' range AND 'expense' type) */}
        {range === 'monthly' && txType === 'expense' && chartData.length > 0 && (
          <section className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-50 mx-5 mt-6 mb-6 relative z-10">
             <div className="flex justify-between items-center mb-5">
                <div className="flex-1 pl-2">
                   <p className="text-[10px] font-bold text-slate-400 mb-1">Rata-rata Harian</p>
                   <p className="text-[15px] font-black text-slate-800">{formatRupiah(totalAmount / 30, true)}</p>
                </div>
                <div className="w-[1px] h-8 bg-slate-100 mx-4" />
                <div className="flex-1 text-right pr-2">
                   <p className="text-[10px] font-bold text-slate-400 mb-1">Total Proyeksi</p>
                   <p className="text-[15px] font-black text-slate-800">{formatRupiah(totalAmount * 1.2, true)}</p>
                </div>
             </div>
             <div className="bg-sky-50/70 rounded-2xl p-3.5 flex items-center gap-3 border border-sky-100/50">
                <div className="w-[18px] h-[18px] rounded-full border-[1.5px] border-sky-300 text-sky-500 flex items-center justify-center text-[9px] font-bold shrink-0">i</div>
                <p className="text-[11px] font-semibold text-sky-600">Berdasarkan kebiasaan belanja Anda bulan ini.</p>
             </div>
          </section>
        )}

        {/* Activity Heatmap */}
        {range !== 'all' && (
          <ActivityHeatmap transactions={transactions} from={from} to={to} txType={txType} range={range} categoryMap={categoryMap} />
        )}

        {/* Trend Charts */}
        <TrendCharts range={range} />

        {/* Top Expenses */}
        {chartData.length > 0 && <TopExpenses chartData={chartData} />}

        {/* Transaction Log */}
        <TransactionLog transactions={transactions} categoryMap={categoryMap} />

      </main>
    </div>
  )
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function TrendCharts({ range }: { range: TimeRange }) {
  // Mock Data for Charts
  const comparisonData = useMemo(() => Array.from({ length: 31 }, (_, i) => ({
    day: i + 1,
    current: Math.random() * 500000 + 100000 * (i/10),
    previous: Math.random() * 400000 + 50000 * (i/10)
  })), [])

  const netBalanceData = useMemo(() => {
    let balance = 5000000
    return Array.from({ length: 31 }, (_, i) => {
      balance += (Math.random() * 400000) - 200000
      return { day: i + 1, balance, target: 4500000 }
    })
  }, [])

  const monthlySummaryData = useMemo(() => ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'].map((m, i) => ({
    month: m,
    income: i < 5 ? Math.random() * 5000000 + 2000000 : 0,
    expense: i < 5 ? Math.random() * 4000000 + 1000000 : 0
  })), [])

  return (
    <div className="flex flex-col gap-6 mx-5 mt-6 mb-2">
      
      {range === 'yearly' && (
        <section className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 shadow-sm border border-white/50">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-[15px] font-bold text-slate-800">Ringkasan Bulanan</h2>
            <div className="text-right">
              <p className="text-[10px] font-bold text-emerald-500">Rata2 In: Rp3.886.092</p>
              <p className="text-[10px] font-bold text-red-400">Rata2 Out: Rp2.087.160</p>
            </div>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySummaryData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                <YAxis hide />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="income" fill="#34d399" radius={[4, 4, 4, 4]} barSize={8} />
                <Bar dataKey="expense" fill="#f87171" radius={[4, 4, 4, 4]} barSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 shadow-sm border border-white/50">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-[15px] font-bold text-slate-800">Perbandingan {range === 'yearly' ? 'Tahunan' : 'Bulanan'}</h2>
          <div className="bg-red-50 text-red-500 text-[10px] px-2 py-1 rounded-lg font-bold flex items-center gap-1">
             <TrendingUp className="w-3 h-3" /> 80.8%
          </div>
        </div>
        <p className="text-[11px] text-slate-400 font-medium mb-6">Pengeluaran lebih tinggi dari biasanya.</p>
        
        <div className="flex items-center gap-3 mb-6">
           <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1"><ArrowRightLeft className="w-3 h-3" /> Bandingkan</span>
           <div className="flex bg-slate-100 p-0.5 rounded-lg">
              <button className="bg-white shadow-sm p-1.5 rounded-md"><Activity className="w-3 h-3 text-slate-700" /></button>
              <button className="p-1.5 rounded-md"><div className="w-3 h-3 border-l-2 border-b-2 border-slate-400" /></button>
           </div>
        </div>

        <div className="h-[140px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={comparisonData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#cbd5e1' }} tickCount={4} />
              <Tooltip />
              <Area type="monotone" dataKey="current" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCurrent)" />
              <Line type="monotone" dataKey="previous" stroke="#94a3b8" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 shadow-sm border border-white/50">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-[15px] font-bold text-slate-800">Tren Saldo Bersih</h2>
          <div className="bg-emerald-50 text-emerald-600 text-[10px] px-2 py-1 rounded-lg font-bold">
             Rp100.517
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-6">
           <span className="text-[11px] font-bold text-slate-400">Saldo Bersih</span>
           <div className="flex items-center gap-3">
             <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1"><ArrowRightLeft className="w-3 h-3" /> Bandingkan</span>
             <div className="flex bg-slate-100 p-0.5 rounded-lg">
                <button className="bg-white shadow-sm p-1.5 rounded-md"><Activity className="w-3 h-3 text-slate-700" /></button>
                <button className="p-1.5 rounded-md"><div className="w-3 h-3 border-l-2 border-b-2 border-slate-400" /></button>
             </div>
           </div>
        </div>

        <div className="h-[140px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={netBalanceData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#cbd5e1' }} tickCount={4} />
              <Tooltip />
              <Area type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
              <Line type="monotone" dataKey="target" stroke="#ef4444" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

    </div>
  )
}

function ActivityHeatmap({ transactions, from, to, txType, range, categoryMap }: { transactions: Transaction[], from: string, to: string, txType: 'income' | 'expense', range: TimeRange, categoryMap: Record<string, Category> }) {
  const [selectedBlock, setSelectedBlock] = useState<{ label: string, dateStr: string, txs: Transaction[] } | null>(null)

  const { blocks, maxAmount } = useMemo(() => {
    const startDate = new Date(from)
    const endDate = new Date(to)
    
    if (range === 'yearly') {
       const weeks = []
       const yearStart = new Date(startDate.getFullYear(), 0, 1)
       
       const weeklyExp = Array.from({ length: 53 }, () => ({ amount: 0, txs: [] as Transaction[] }))
       transactions.forEach(t => {
         if (t.type === txType) {
           const txDate = new Date(t.date)
           const diff = txDate.getTime() - yearStart.getTime()
           let weekNum = Math.floor(diff / (1000 * 60 * 60 * 24 * 7))
           if (weekNum > 52) weekNum = 52
           weeklyExp[weekNum].amount += t.amount
           weeklyExp[weekNum].txs.push(t)
         }
       })
       
       let maxAmount = 1
       weeklyExp.forEach(v => {
         if (v.amount > maxAmount) maxAmount = v.amount
       })
       
       for(let i=0; i<53; i++) {
         weeks.push({
           label: `${i + 1}`,
           dateStr: '', // We don't have a single date string for a week right now
           amount: weeklyExp[i].amount,
           txs: weeklyExp[i].txs,
           isCurrentMonth: true 
         })
       }
       return { blocks: weeks, maxAmount }
    } else {
      // Find the start of the week for the first day (Monday start)
      const startDay = startDate.getDay()
      const offset = startDay === 0 ? 6 : startDay - 1
      
      const calendarStart = new Date(startDate)
      calendarStart.setDate(startDate.getDate() - offset)

      const calendarEnd = new Date(endDate)
      const endDay = calendarEnd.getDay()
      const endOffset = endDay === 0 ? 0 : 7 - endDay
      calendarEnd.setDate(calendarEnd.getDate() + endOffset)

      const dailyExp = transactions.reduce((acc, t) => {
        if (t.type === txType) {
          const d = t.date.split('T')[0]
          if (!acc[d]) acc[d] = { amount: 0, txs: [] }
          acc[d].amount += t.amount
          acc[d].txs.push(t)
        }
        return acc
      }, {} as Record<string, { amount: number, txs: Transaction[] }>)

      let maxAmount = 1 
      Object.values(dailyExp).forEach(v => {
        if (v.amount > maxAmount) maxAmount = v.amount
      })

      const days = []
      let current = new Date(calendarStart)
      while (current <= calendarEnd) {
        const pad = (n: number) => String(n).padStart(2, '0')
        const dateStr = `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`
        const dayData = dailyExp[dateStr] || { amount: 0, txs: [] }
        days.push({
          label: `${current.getDate()}`,
          dateStr: dateStr,
          amount: dayData.amount,
          txs: dayData.txs,
          isCurrentMonth: current >= startDate && current <= endDate
        })
        current.setDate(current.getDate() + 1)
      }

      return { blocks: days, maxAmount }
    }
  }, [transactions, from, to, txType, range])

  return (
    <>
      <section className={`bg-white rounded-[32px] p-6 shadow-sm border border-slate-50 mx-5 mt-6`}>
        <h2 className="text-[15px] font-bold text-slate-800 mb-4">{range === 'yearly' ? 'Aktivitas Mingguan' : 'Peta Aktivitas'}</h2>
        <div className={`grid ${range === 'yearly' ? 'grid-cols-10' : 'grid-cols-7'} gap-1.5`}>
          {range !== 'yearly' && ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={`head-${i}`} className="text-center text-[10px] font-bold text-slate-400 mb-1">{d}</div>
          ))}
          {blocks.map((block, i) => {
            const intensity = block.amount > 0 ? 0.2 + (block.amount / maxAmount) * 0.8 : 0
            const baseColor = txType === 'expense' ? '239, 68, 68' : '16, 185, 129' // red or emerald
            return (
              <div 
                key={i} 
                onClick={() => block.amount > 0 && setSelectedBlock(block)}
                className={`aspect-square rounded-[10px] flex flex-col items-start justify-between p-1.5 ${!block.isCurrentMonth ? 'opacity-20' : ''} ${block.amount > 0 ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
                style={{
                  backgroundColor: block.amount > 0 ? `rgba(${baseColor}, ${intensity})` : '#F8FAFC',
                }}
              >
                 <span className={`text-[8px] font-bold ${block.amount > 0 ? 'text-white' : 'text-slate-500 opacity-50'}`}>
                   {block.label}
                 </span>
                 {range === 'monthly' && block.amount > 0 && (
                   <span className="text-[7px] font-bold text-white opacity-90 self-end tracking-tighter">
                     {block.amount >= 1000000 ? (block.amount / 1000000).toFixed(1) + 'M' : (block.amount / 1000).toFixed(0) + 'K'}
                   </span>
                 )}
              </div>
            )
          })}
        </div>
        <div className="flex justify-end items-center gap-1.5 mt-5">
           <span className="text-[10px] text-slate-400 font-medium mr-1">Sedikit</span>
           <div className="w-2.5 h-2.5 rounded bg-slate-100" />
           <div className={`w-2.5 h-2.5 rounded ${txType === 'expense' ? 'bg-red-200' : 'bg-emerald-200'}`} />
           <div className={`w-2.5 h-2.5 rounded ${txType === 'expense' ? 'bg-red-400' : 'bg-emerald-400'}`} />
           <div className={`w-2.5 h-2.5 rounded ${txType === 'expense' ? 'bg-red-500' : 'bg-emerald-500'}`} />
           <div className={`w-2.5 h-2.5 rounded ${txType === 'expense' ? 'bg-red-600' : 'bg-emerald-600'}`} />
           <span className="text-[10px] text-slate-400 font-medium ml-1">Banyak</span>
        </div>
      </section>

      {selectedBlock && (
        <ExpenseDetailModal 
          block={selectedBlock}
          categoryMap={categoryMap}
          txType={txType}
          onClose={() => setSelectedBlock(null)}
        />
      )}
    </>
  )
}

function ExpenseDetailModal({ block, categoryMap, txType, onClose }: { block: any, categoryMap: Record<string, Category>, txType: 'income' | 'expense', onClose: () => void }) {
  const { data: wallets = [] } = useQuery({ queryKey: queryKeys.wallets.all(), queryFn: () => walletRepo.findAll() })
  const walletMap = useMemo(() => wallets.reduce((acc, w) => ({ ...acc, [w.id]: w }), {} as Record<string, Wallet>), [wallets])

  const groupedTxs = useMemo(() => {
     const groups: Record<string, Transaction[]> = {}
     block.txs.forEach((t: Transaction) => {
        const d = t.date.split('T')[0]
        if (!groups[d]) groups[d] = []
        groups[d].push(t)
     })
     return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
  }, [block.txs])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F8FAFC] animate-in slide-in-from-bottom-4 duration-300">
      <header className="sticky top-0 z-10 bg-[#F8FAFC]/90 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-slate-100">
        <button onClick={onClose} className="p-2 -ml-2 text-slate-800 active:scale-95 transition-transform">
           <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
        </button>
        <div className="flex flex-col items-center">
           <h1 className="text-base font-bold text-slate-900">Detail {txType === 'expense' ? 'Pengeluaran' : 'Pemasukan'}</h1>
           <span className="text-[10px] font-semibold text-slate-400">{block.dateStr || `Minggu ke-${block.label}`}</span>
        </div>
        <div className="w-6" />
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="flex items-center justify-between mb-5">
           <h2 className="text-[15px] font-bold text-slate-800">Transaksi Terakhir</h2>
           <span className="text-[11px] font-bold text-slate-400">Lihat Semua</span>
        </div>

        {groupedTxs.map(([dateStr, txs]) => {
           const dObj = new Date(dateStr)
           const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
           const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']
           const dateLabel = `${days[dObj.getDay()]}, ${dObj.getDate()} ${months[dObj.getMonth()]} ${dObj.getFullYear()}`
           const dayTotal = txs.reduce((sum, t) => sum + t.amount, 0)
           
           return (
             <div key={dateStr} className="mb-6">
               <div className="flex justify-between items-end mb-3 px-1">
                 <h3 className="text-[12px] font-bold text-slate-600">{dateLabel}</h3>
                 <span className={`text-[12px] font-bold ${txType === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                   {txType === 'expense' ? '-' : '+'}{formatRupiah(dayTotal, true)}
                 </span>
               </div>

               <div className="flex flex-col gap-3">
                 {txs.map((t, i) => {
                    const cat = categoryMap[t.category_id]
                    const w = walletMap[t.wallet_id]
                    const time = new Date(t.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')
                    return (
                      <div key={i} className="bg-white p-4 rounded-[24px] shadow-sm border border-slate-50 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="w-[42px] h-[42px] rounded-[14px] flex items-center justify-center text-xl border border-slate-50" style={{ backgroundColor: `${cat?.color || '#94a3b8'}15` }}>
                               {cat?.icon || '📦'}
                            </div>
                            <div className="flex flex-col">
                               <span className="text-[13px] font-bold text-slate-800 mb-1">{t.note || cat?.name || 'Transaksi'}</span>
                               <div className="flex items-center gap-1.5 text-slate-400">
                                  <span className="text-[10px]">💼</span>
                                  <span className="text-[11px] font-semibold">{w?.name || 'Dompet Utama'}</span>
                               </div>
                            </div>
                         </div>
                         <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-slate-400 mb-1.5">{time}</span>
                            <span className={`text-[13px] font-bold ${txType === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                              {txType === 'expense' ? '-' : '+'}{formatRupiah(t.amount, true)}
                            </span>
                         </div>
                      </div>
                    )
                 })}
               </div>
             </div>
           )
        })}
      </div>
    </div>
  )
}

function TopExpenses({ chartData }: { chartData: any[] }) {
  return (
    <section className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-50 mx-5 mt-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[15px] font-bold text-slate-800">Pengeluaran Terbesar</h2>
        <div className="flex gap-2">
          <button className="bg-slate-50 text-slate-600 text-[10px] px-3 py-1.5 rounded-full font-bold flex items-center gap-1">
             Kategori <ChevronDown className="w-3 h-3" />
          </button>
          <button className="bg-slate-50 text-slate-600 text-[10px] px-3 py-1.5 rounded-full font-bold flex items-center gap-1">
             Top 5 <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {chartData.slice(0, 5).map((item, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-400 shrink-0">
              {i + 1}
            </div>
            <div className="flex-1 flex flex-col">
              <span className="text-[13px] font-bold text-slate-700">{item.name}</span>
              <span className="text-[11px] text-slate-400 font-medium">{item.count} transaksi</span>
            </div>
            <span className="text-[13px] font-bold text-slate-800">{formatRupiah(item.value, true)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function TransactionLog({ transactions, categoryMap }: { transactions: Transaction[], categoryMap: Record<string, Category> }) {
  // Sort transactions by date descending
  const sortedTx = useMemo(() => {
    return [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions])

  return (
    <section className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-50 mx-5 mt-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[15px] font-bold text-slate-800">Log Transaksi</h2>
        <button className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
          Lihat Semua <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="bg-slate-50 rounded-[18px] px-4 py-3.5 mb-5 flex items-center gap-3 border border-slate-100">
        <Search className="w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Cari transaksi..." className="bg-transparent text-[12px] font-medium outline-none w-full placeholder-slate-400" />
      </div>

      <div className="flex gap-2 mb-6">
        <button className="bg-white border border-slate-100 text-slate-600 text-[10px] px-3 py-1.5 rounded-full font-bold flex items-center gap-1 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
           Semua <ChevronDown className="w-3 h-3" />
        </button>
        <button className="bg-white border border-slate-100 text-slate-600 text-[10px] px-3 py-1.5 rounded-full font-bold flex items-center gap-1 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
           Semua Dompet <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {sortedTx.slice(0, 8).map((t, i) => {
          const dateObj = new Date(t.date)
          const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}`
          const cat = categoryMap[t.category_id]
          const isIncome = t.type === 'income'
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="text-[10px] font-semibold text-slate-400 w-[34px] shrink-0 text-center">{dateStr}</span>
              <div 
                className="w-[34px] h-[34px] rounded-xl flex items-center justify-center text-sm shrink-0 border border-slate-50"
                style={{ backgroundColor: `${cat?.color || '#94a3b8'}15` }}
              >
                {cat?.icon || '🍔'}
              </div>
              <span className="text-[12px] font-semibold text-slate-700 flex-1 truncate pr-2">{t.note || cat?.name || 'Transaksi'}</span>
              <span className={`text-[12px] font-bold shrink-0 ${isIncome ? 'text-emerald-500' : 'text-slate-800'}`}>
                {isIncome ? '+' : '-'}{formatRupiah(t.amount, true)}
              </span>
            </div>
          )
        })}
        {sortedTx.length === 0 && (
          <div className="text-center py-4 text-[12px] text-slate-400 font-medium">Tidak ada transaksi.</div>
        )}
      </div>

      {sortedTx.length > 0 && (
        <button className="w-full mt-6 py-3.5 border border-slate-100 bg-slate-50/50 rounded-2xl text-[12px] font-bold text-slate-600 active:scale-95 transition-transform">
          Lihat Semua Transaksi
        </button>
      )}
    </section>
  )
}
