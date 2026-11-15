import { useState } from 'react'
import { Plus, Trash2, AlertTriangle, X } from 'lucide-react'
import { useWallets, useDeleteWallet } from '@/features/wallet/hooks'
import { useTransactions } from '@/features/transactions/hooks'
import { formatRupiah } from '@/lib/formatters'
import type { Wallet } from '@/types'
import { WalletForm } from './WalletForm'

export function WalletsView() {
  const { data: wallets = [] } = useWallets()
  const { mutate: deleteWallet, isPending: isDeleting } = useDeleteWallet()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [walletToDelete, setWalletToDelete] = useState<Wallet | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data: transactions = [] } = useTransactions()

  // Net worth calculation (excluding hidden wallets)
  const totalBalance = wallets
    .filter(w => !w.exclude_from_total)
    .reduce((sum, w) => sum + w.balance, 0)

  // Total debt from recorded debt transactions
  const totalDebt = transactions
    .filter(t => !t.is_deleted && t.type === 'debt')
    .reduce((sum, t) => sum + t.amount, 0)

  // Grouping
  const cashWallets = wallets.filter(w => w.type === 'cash')
  const bankWallets = wallets.filter(w => w.type === 'bank')
  const eWalletWallets = wallets.filter(w => w.type === 'e-wallet')
  const creditCardWallets = wallets.filter(w => w.type === 'credit-card')
  const cashTotal = cashWallets.reduce((s, w) => s + w.balance, 0)
  const digitalTotal = bankWallets.concat(eWalletWallets).reduce((s, w) => s + w.balance, 0)

  const handleDeleteClick = (wallet: Wallet) => {
    if (wallets.length <= 1) {
      setDeleteError('Minimal harus ada 1 dompet aktif. Anda tidak dapat menghapus dompet terakhir.')
      setWalletToDelete(null)
      return
    }
    setDeleteError(null)
    setWalletToDelete(wallet)
  }

  const handleConfirmDelete = () => {
    if (!walletToDelete) return
    deleteWallet(walletToDelete.id, {
      onSuccess: () => {
        setWalletToDelete(null)
        setDeleteError(null)
      },
      onError: (err: any) => {
        setDeleteError(err?.message || 'Gagal menghapus dompet.')
      },
    })
  }

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
        {/* Delete Warning / Error Notice if single wallet */}
        {deleteError && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-3 text-xs leading-relaxed animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-0.5">Pemberitahuan</p>
              <p>{deleteError}</p>
            </div>
            <button 
              onClick={() => setDeleteError(null)}
              className="text-amber-500 hover:text-amber-700 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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
            <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full text-[11px] font-medium backdrop-blur-sm shadow-sm border border-white/10">
              <span>💳</span>
              <span>{wallets.length} Akun Dompet Terdaftar</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-6 relative z-10">
            <div className="bg-white/20 rounded-2xl p-3 backdrop-blur-md border border-white/10 shadow-sm">
              <p className="text-[11px] text-white/80 mb-0.5">Saldo Bersih</p>
              <p className="text-sm font-semibold">{formatRupiah(totalBalance)}</p>
            </div>
            <div className="bg-white/20 rounded-2xl p-3 backdrop-blur-md border border-white/10 shadow-sm">
              <p className="text-[11px] text-white/80 mb-0.5">Total Kas / Tunai</p>
              <p className="text-sm font-semibold">{formatRupiah(cashTotal)}</p>
            </div>
            <div className="bg-white/20 rounded-2xl p-3 backdrop-blur-md border border-white/10 shadow-sm">
              <p className="text-[11px] text-white/80 mb-0.5">Bank &amp; E-Wallet</p>
              <p className="text-sm font-semibold">{formatRupiah(digitalTotal)}</p>
            </div>
            <div className="bg-white/20 rounded-2xl p-3 backdrop-blur-md border border-white/10 shadow-sm">
              <p className="text-[11px] text-white/80 mb-0.5">Hutang / Pinjaman</p>
              <p className="text-sm font-semibold">{formatRupiah(totalDebt)}</p>
            </div>
          </div>
        </div>

        {/* Wallets List */}
        <div className="flex flex-col gap-8">
          {cashWallets.length > 0 && (
            <WalletGroup title="Tunai" wallets={cashWallets} onDelete={handleDeleteClick} />
          )}
          {bankWallets.length > 0 && (
            <WalletGroup title="Akun Bank" wallets={bankWallets} onDelete={handleDeleteClick} />
          )}
          {eWalletWallets.length > 0 && (
            <WalletGroup title="E-Wallet" wallets={eWalletWallets} onDelete={handleDeleteClick} />
          )}
          {creditCardWallets.length > 0 && (
            <WalletGroup title="Kartu Kredit" wallets={creditCardWallets} onDelete={handleDeleteClick} />
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {walletToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 text-center mb-1">
              Hapus Dompet?
            </h3>
            <p className="text-xs text-slate-500 text-center mb-6 leading-relaxed">
              Apakah Anda yakin ingin menghapus dompet <strong className="text-slate-800">{walletToDelete.name}</strong> dengan saldo <strong className="text-slate-800">{formatRupiah(walletToDelete.balance)}</strong>?
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setWalletToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-md shadow-rose-200"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function WalletGroup({ 
  title, 
  wallets, 
  onDelete 
}: { 
  title: string
  wallets: Wallet[]
  onDelete: (wallet: Wallet) => void 
}) {
  return (
    <section>
      <h3 className="text-base font-bold text-slate-900 mb-3 ml-1">{title}</h3>
      <div className="flex flex-col gap-3">
        {wallets.map(wallet => (
          <div key={wallet.id} className="glass rounded-3xl p-4 flex items-center justify-between border border-white shadow-sm bg-white/70 backdrop-blur-xl group hover:shadow-md transition-all">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-xl shadow-sm border border-slate-100 bg-white text-slate-700">
                {wallet.icon}
              </div>
              <div className="truncate">
                <h4 className="font-bold text-slate-900 text-sm truncate">{wallet.name}</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                  {wallet.type.replace('-', ' ')} • {wallet.currency}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-medium mb-0.5">Saldo Saat Ini</p>
                <p className="font-bold text-slate-900 text-sm">{formatRupiah(wallet.balance)}</p>
              </div>
              <button
                type="button"
                onClick={() => onDelete(wallet)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors active:scale-90"
                title={`Hapus dompet ${wallet.name}`}
                aria-label={`Hapus dompet ${wallet.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

