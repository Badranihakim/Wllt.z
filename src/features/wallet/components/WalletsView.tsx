import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useWallets } from '@/features/wallet/hooks'
import { formatRupiah } from '@/lib/formatters'
import type { Wallet } from '@/types'
import { WalletForm } from './WalletForm'

export function WalletsView() {
  const { data: wallets = [] } = useWallets()
  const [isFormOpen, setIsFormOpen] = useState(false)

  // Net worth calculation (excluding hidden wallets)
  const totalBalance = wallets
    .filter(w => !w.exclude_from_total)
    .reduce((sum, w) => sum + w.balance, 0)

  // Grouping
  const cashWallets = wallets.filter(w => w.type === 'cash')
  const bankWallets = wallets.filter(w => w.type === 'bank')
  const eWalletWallets = wallets.filter(w => w.type === 'e-wallet')
  const creditCardWallets = wallets.filter(w => w.type === 'credit-card')

  if (isFormOpen) {
    return <WalletForm onClose={() => setIsFormOpen(false)} />
  }

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-[#F8FAFC]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#F8FAFC]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="w-6" /> {/* Spacer */}
        <h1 className="text-lg font-bold text-slate-900">Dompet Saya</h1>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="text-slate-900 p-1 active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>
      </header>

      <main className="px-5 flex flex-col gap-8 mt-2">
        {/* Total Balance Card */}
        <div className="rounded-3xl p-6 text-white shadow-xl relative overflow-hidden" 
             style={{ 
               background: 'linear-gradient(135deg, #38BDF8 0%, #34D399 100%)',
               boxShadow: '0 10px 30px -5px rgba(56, 189, 248, 0.4)'
             }}>
          <div className="text-center relative z-10">
            <p className="text-xs font-medium text-white/80 mb-1 flex items-center justify-center gap-1">
              Total Saldo (IDR) <span className="text-[10px] opacity-70">⇌</span>
            </p>
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              {formatRupiah(totalBalance)}
            </h2>
            <div className="inline-flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full text-[11px] font-medium backdrop-blur-sm shadow-sm border border-white/10">
              <span>↑ +126.5%</span>
              <span className="opacity-80 ml-1">(+Rp479.937) 30 hari terakhir</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-6 relative z-10">
            <div className="bg-white/20 rounded-2xl p-3 backdrop-blur-md border border-white/10 shadow-sm">
              <p className="text-[11px] text-white/80 mb-0.5">Saldo Bersih</p>
              <p className="text-sm font-semibold">{formatRupiah(totalBalance)}</p>
            </div>
            <div className="bg-white/20 rounded-2xl p-3 backdrop-blur-md border border-white/10 shadow-sm">
              <p className="text-[11px] text-white/80 mb-0.5">Hutang Aktif</p>
              <p className="text-sm font-semibold">Rp 3.177.465</p>
            </div>
            <div className="bg-white/20 rounded-2xl p-3 backdrop-blur-md border border-white/10 shadow-sm">
              <p className="text-[11px] text-white/80 mb-0.5">Tabungan Aktif</p>
              <p className="text-sm font-semibold">Rp 0</p>
            </div>
            <div className="bg-white/20 rounded-2xl p-3 backdrop-blur-md border border-white/10 shadow-sm">
              <p className="text-[11px] text-white/80 mb-0.5">Pembayaran Mendatang</p>
              <p className="text-sm font-semibold">Rp 0</p>
            </div>
          </div>
        </div>

        {/* Wallets List */}
        <div className="flex flex-col gap-8">
          {cashWallets.length > 0 && (
            <WalletGroup title="Tunai" wallets={cashWallets} />
          )}
          {bankWallets.length > 0 && (
            <WalletGroup title="Akun Bank" wallets={bankWallets} />
          )}
          {eWalletWallets.length > 0 && (
            <WalletGroup title="E-Wallet" wallets={eWalletWallets} />
          )}
          {creditCardWallets.length > 0 && (
            <WalletGroup title="Kartu Kredit" wallets={creditCardWallets} />
          )}
        </div>
      </main>
    </div>
  )
}

function WalletGroup({ title, wallets }: { title: string, wallets: Wallet[] }) {
  return (
    <section>
      <h3 className="text-base font-bold text-slate-900 mb-3 ml-1">{title}</h3>
      <div className="flex flex-col gap-3">
        {wallets.map(wallet => (
          <div key={wallet.id} className="glass rounded-3xl p-4 flex items-center justify-between border border-white shadow-sm bg-white/70 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-sm border border-slate-100 bg-white text-slate-700">
                {wallet.icon}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{wallet.name}</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                  {wallet.type.replace('-', ' ')} • {wallet.currency}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-medium mb-0.5">Saldo Saat Ini</p>
              <p className="font-bold text-slate-900 text-sm">{formatRupiah(wallet.balance)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
