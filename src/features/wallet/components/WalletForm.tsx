import { useState, type FormEvent } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { useCreateWallet } from '@/features/wallet/hooks'
import type { WalletType } from '@/types'

const WALLET_TYPE_OPTIONS: Array<{ value: WalletType; label: string; icon: string }> = [
  { value: 'bank',       label: 'Bank',        icon: '🏦' },
  { value: 'e-wallet',   label: 'E-Wallet',    icon: '📱' },
  { value: 'cash',       label: 'Kas',         icon: '💵' },
  { value: 'credit-card',label: 'Kartu Kredit',icon: '💳' },
]

const ICON_PRESETS = [
  '💳', '🏦', '💵', '📱', '💰', '🪙', '📈', '🏧', '💹', '🗂️', '🧾', '⭐'
]

interface WalletFormProps {
  onClose: () => void
}

export function WalletForm({ onClose }: WalletFormProps) {
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [type, setType] = useState<WalletType>('bank')
  const [excludeFromTotal, setExcludeFromTotal] = useState(false)
  const [icon, setIcon] = useState('🏦')
  // We'll use a preset color for simplicity for now
  const color = '#3B82F6'

  const { mutate: createWallet, isPending } = useCreateWallet()

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault()
    if (!name.trim()) return

    const numericBalance = Number(balance.replace(/[^0-9]/g, '')) || 0

    createWallet({
      name: name.trim(),
      type,
      balance: numericBalance,
      icon,
      color,
      currency: 'IDR',
      exclude_from_total: excludeFromTotal,
    }, {
      onSuccess: () => {
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#F8FAFC] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 bg-[#F8FAFC]">
        <button onClick={onClose} className="p-2 -ml-2 text-slate-700 active:scale-95 transition-transform">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-slate-900">Tambah Dompet Baru</h1>
        <button 
          onClick={handleSubmit} 
          disabled={isPending || !name.trim()} 
          className="p-2 -mr-2 text-slate-700 disabled:opacity-50 active:scale-95 transition-transform"
        >
          <Check className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-8 pb-24">
        
        {/* Detail Dompet */}
        <section className="flex flex-col gap-5">
          <h2 className="text-base font-bold text-slate-900">Detail Dompet</h2>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-500">Nama Dompet</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="misal: BCA, GoPay, Tunai"
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-500">Mata Uang Dompet</label>
            <div className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 flex items-center justify-between text-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm">🌎</div>
                <div>
                  <div className="font-bold text-sm">IDR</div>
                  <div className="text-[11px] text-slate-500">Indonesian Rupiah</div>
                </div>
              </div>
              <span className="text-slate-400">›</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-500">Saldo Awal</label>
            <input 
              type="text"
              inputMode="numeric"
              value={balance}
              onChange={e => {
                const val = e.target.value.replace(/[^0-9]/g, '')
                setBalance(val)
              }}
              placeholder="0"
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold text-lg"
            />
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <label className="text-sm font-medium text-slate-500">Tipe</label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5">
              {WALLET_TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setType(opt.value)
                    setIcon(opt.icon)
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap font-medium transition-all ${
                    type === opt.value 
                      ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-500/20' 
                      : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  <span className={type === opt.value ? 'text-white/80' : 'text-slate-400'}>{opt.icon}</span>
                  <span className="text-sm">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Toggles */}
        <section className="flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 flex items-center justify-between shadow-sm">
            <div className="pr-4">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Kecualikan dari Total</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Saldo dompet ini tidak dihitung ke total saldo utama. Transaksi yang menggunakan dompet ini juga akan dikecualikan dari statistik.
              </p>
            </div>
            {/* Toggle Switch */}
            <button 
              type="button"
              onClick={() => setExcludeFromTotal(!excludeFromTotal)}
              className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ease-in-out shrink-0 ${excludeFromTotal ? 'bg-slate-700' : 'bg-slate-200'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${excludeFromTotal ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>


        </section>

        {/* Icon (Simplified) */}
        <section className="flex flex-col gap-4 mb-10">
          <label className="text-sm font-medium text-slate-500">Ikon Umum</label>
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
            <div className="flex flex-wrap gap-4 justify-between">
              {ICON_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setIcon(preset)}
                  className={`w-12 h-12 flex items-center justify-center text-2xl rounded-full transition-all ${
                    icon === preset 
                      ? 'border-2 border-slate-800 bg-slate-50' 
                      : 'border border-transparent hover:bg-slate-50'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
