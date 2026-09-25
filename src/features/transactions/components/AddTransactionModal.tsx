import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import { Camera, X, Delete, Check, FileText, NotebookPen, ChevronDown, Plus } from 'lucide-react'
import { useUIStore } from '@/stores'
import { useCreateTransaction } from '@/features/transactions/hooks'
import { useWallets } from '@/features/wallet/hooks'
import { useCategories, useCategoryChildren } from '@/features/analytics/hooks'
import { evalCalcExpr, displayExpr, buildExpr } from '@/lib/calcEngine'
import type { TransactionType } from '@/types'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const TYPE_OPTIONS: Array<{ value: TransactionType; label: string }> = [
  { value: 'expense',  label: 'Pengeluaran' },
  { value: 'income',   label: 'Pemasukan'   },
  { value: 'transfer', label: 'Transfer'    },
]

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function toDateInputVal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toTimeInputVal(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getDateLabel(d: Date) {
  return d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })
}

function getTimeLabel(d: Date) {
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// ─────────────────────────────────────────────
// KeyButton
// ─────────────────────────────────────────────

type KeyVariant = 'default' | 'danger' | 'dark' | 'muted' | 'datetime' | 'operator-active'

interface KeyButtonProps {
  onPress: () => void
  children: React.ReactNode
  variant?: KeyVariant
}

function KeyButton({ onPress, children, variant = 'default' }: KeyButtonProps) {
  const styles: Record<KeyVariant, { bg: string; color: string; shadow?: string }> = {
    default:          { bg: 'var(--surface-2)',          color: 'var(--text-primary)', shadow: '0 1px 3px oklch(0 0 0 / 8%)' },
    danger:           { bg: 'oklch(0.97 0.01 22)',       color: 'var(--expense)' },
    dark:             { bg: 'oklch(0.18 0.02 250)',      color: 'white' },
    muted:            { bg: 'var(--surface-3)',          color: 'var(--text-muted)' },
    datetime:         { bg: 'var(--surface-3)',          color: 'var(--text-secondary)' },
    'operator-active':{ bg: 'var(--accent-dim)',         color: 'var(--accent)' },
  }

  const s = styles[variant]

  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onPress() }}
      onTouchStart={e => { e.preventDefault(); onPress() }}
      className="no-tap-highlight flex select-none items-center justify-center rounded-2xl text-base font-semibold transition-all duration-100 active:scale-90 active:opacity-60"
      style={{
        background: s.bg,
        color: s.color,
        boxShadow: s.shadow,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {children}
    </button>
  )
}

// ─────────────────────────────────────────────
// OperatorPanel — replaces keypad when +−×÷ pressed
// ─────────────────────────────────────────────

interface OperatorPanelProps {
  onOp: (op: string) => void
  onDone: () => void
}

function OperatorPanel({ onOp, onDone }: OperatorPanelProps) {
  const ops = [
    { symbol: '+', label: 'Tambah',   display: '+' },
    { symbol: '-', label: 'Kurang',   display: '−' },
    { symbol: '*', label: 'Kali',     display: '×' },
    { symbol: '/', label: 'Bagi',     display: '÷' },
  ]

  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Pilih Operator
      </p>
      <div className="grid grid-cols-4 gap-2" style={{ gridTemplateRows: '52px' }}>
        {ops.map(op => (
          <button
            key={op.symbol}
            type="button"
            onMouseDown={e => { e.preventDefault(); onOp(op.symbol) }}
            onTouchStart={e => { e.preventDefault(); onOp(op.symbol) }}
            className="no-tap-highlight flex items-center justify-center rounded-2xl text-xl font-bold transition-all active:scale-90"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)', height: '52px' }}
          >
            {op.display}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onDone}
        className="no-tap-highlight w-full rounded-2xl py-3.5 text-sm font-bold transition-all active:scale-[0.98]"
        style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}
      >
        Batalkan
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
// DatePickerPanel
// ─────────────────────────────────────────────

interface DatePickerPanelProps {
  date: Date
  onChange: (d: Date) => void
  onDone: () => void
}

function DatePickerPanel({ date, onChange, onDone }: DatePickerPanelProps) {
  const handleDate = (e: ChangeEvent<HTMLInputElement>) => {
    const [y, m, d] = e.target.value.split('-').map(Number)
    const next = new Date(date)
    next.setFullYear(y, m - 1, d)
    onChange(next)
  }

  const handleTime = (e: ChangeEvent<HTMLInputElement>) => {
    const [h, min] = e.target.value.split(':').map(Number)
    const next = new Date(date)
    next.setHours(h, min, 0, 0)
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Pilih Tanggal & Waktu
      </p>
      <div className="flex gap-2">
        <input
          type="date"
          value={toDateInputVal(date)}
          onChange={handleDate}
          className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold outline-none"
          style={{ background: 'var(--surface-3)', color: 'var(--text-primary)', border: '1.5px solid var(--accent)' }}
        />
        <input
          type="time"
          value={toTimeInputVal(date)}
          onChange={handleTime}
          className="w-28 rounded-2xl px-3 py-3 text-sm font-semibold outline-none"
          style={{ background: 'var(--surface-3)', color: 'var(--text-primary)', border: '1.5px solid var(--accent)' }}
        />
      </div>
      <button
        type="button"
        onClick={onDone}
        className="no-tap-highlight w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all active:scale-[0.98]"
        style={{ background: 'var(--accent)', boxShadow: '0 4px 12px var(--accent-glow)' }}
      >
        Selesai
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
// AddTransactionModal — main component
// ─────────────────────────────────────────────

type BottomPanel = 'keypad' | 'operator' | 'date'

/**
 * AddTransactionModal — Full-screen premium bottom sheet for adding transactions.
 *
 * Features:
 *  - Two-level category tree: main category circles + sub-category chips
 *  - Safe inline calculator engine (no eval()) with +−×÷ support
 *  - Custom numeric keypad replacing native keyboard for amount
 *  - Receipt photo upload (blob: URL, Google Drive deferred to sync engine)
 *  - Date + time picker panel
 */
export function AddTransactionModal() {
  const isOpen  = useUIStore(s => s.isAddTransactionOpen)
  const onClose = useUIStore(s => s.closeAddTransaction)

  // ── Amount & calculator ─────────────────────────────────────────────
  /** The expression string, e.g. "50000", "50000 + 15000", "0" */
  const [expr,         setExpr]         = useState('0')

  // ── Transaction fields ──────────────────────────────────────────────
  const [txnType,      setTxnType]      = useState<TransactionType>('expense')
  /** Selected MAIN (top-level) category ID */
  const [mainCatId,    setMainCatId]    = useState<string | null>(null)
  /** Selected SUB-CATEGORY ID (this is what gets saved to the transaction) */
  const [subCatId,     setSubCatId]     = useState<string | null>(null)
  const [walletId,     setWalletId]     = useState('')
  const [toWalletId,   setToWalletId]   = useState('')
  const [title,        setTitle]        = useState('')
  const [notes,        setNotes]        = useState('')
  const [txnDate,      setTxnDate]      = useState<Date>(() => new Date())

  // ── Receipt ─────────────────────────────────────────────────────────
  const [receiptFile,  setReceiptFile]  = useState<File | null>(null)
  const [receiptUrl,   setReceiptUrl]   = useState<string | null>(null)

  // ── UI panels ───────────────────────────────────────────────────────
  const [bottomPanel,  setBottomPanel]  = useState<BottomPanel>('keypad')

  // ── Error ───────────────────────────────────────────────────────────
  const [error,        setError]        = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Data hooks ──────────────────────────────────────────────────────
  const { data: wallets = [] } = useWallets()

  const catType = txnType === 'income' ? 'income' : 'expense'
  const { data: mainCategories = [] } = useCategories(
    txnType === 'transfer' ? undefined : catType,
  )
  // Children of the currently selected main category — disabled when none selected
  const { data: subCategories = [] } = useCategoryChildren(mainCatId)

  const { mutate: createTxn, isPending } = useCreateTransaction()

  // ── Reset on open ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    setExpr('0')
    setTxnType('expense')
    setMainCatId(null)
    setSubCatId(null)
    setToWalletId('')
    setTitle('')
    setNotes('')
    setTxnDate(new Date())
    setBottomPanel('keypad')
    setError(null)
    setReceiptFile(null)
    setReceiptUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [isOpen])

  // Auto-select first wallet
  useEffect(() => {
    if (wallets.length > 0 && !walletId) setWalletId(wallets[0].id)
  }, [wallets, walletId])

  // Reset sub-category when main changes
  useEffect(() => {
    setSubCatId(null)
  }, [mainCatId])

  // Cleanup blob URL
  useEffect(() => {
    return () => { if (receiptUrl) URL.revokeObjectURL(receiptUrl) }
  }, [receiptUrl])

  // ── Handlers ────────────────────────────────────────────────────────

  const handleTypeChange = (type: TransactionType) => {
    setTxnType(type)
    setMainCatId(null)
    setSubCatId(null)
    setError(null)
  }

  const handleMainCatSelect = (id: string) => {
    // Toggle: tap same → deselect
    setMainCatId(prev => prev === id ? null : id)
    setSubCatId(null)
    setError(null)
  }

  const handleSubCatSelect = (id: string) => {
    setSubCatId(prev => prev === id ? null : id)
    setError(null)
  }

  /** Keypad key press — delegates to buildExpr utility */
  const handleKey = (key: string) => {
    setError(null)
    setExpr(prev => buildExpr(prev, key))
  }

  /** Operator panel selection */
  const handleOp = (op: string) => {
    setExpr(prev => buildExpr(prev, op))
    setBottomPanel('keypad')
  }

  /** File input handler — creates blob URL for preview */
  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (receiptUrl) URL.revokeObjectURL(receiptUrl)
    setReceiptFile(file)
    setReceiptUrl(URL.createObjectURL(file))
  }

  /**
   * Submit — evaluates the expression safely before saving.
   * The final `amount` stored is always a clean integer number.
   */
  const handleSubmit = () => {
    const amount = evalCalcExpr(expr)  // safe: no eval()

    if (!amount || amount <= 0) {
      setError('Masukkan jumlah transaksi yang valid')
      return
    }
    if (!walletId) {
      setError('Pilih dompet terlebih dahulu')
      return
    }
    if (txnType !== 'transfer' && !subCatId && !mainCatId) {
      setError('Pilih kategori')
      return
    }
    if (txnType === 'transfer') {
      if (!toWalletId) { setError('Pilih dompet tujuan'); return }
      if (toWalletId === walletId) { setError('Dompet tujuan harus berbeda dari asal'); return }
    }

    const fallbackTitle =
      txnType === 'income'   ? 'Pemasukan' :
      txnType === 'transfer' ? 'Transfer'  : 'Pengeluaran'

    let dynamicTitle = fallbackTitle
    if (txnType !== 'transfer') {
      if (subCatId) {
        const subCat = subCategories.find(c => c.id === subCatId)
        if (subCat) dynamicTitle = subCat.name
      } else if (mainCatId) {
        const mainCat = mainCategories.find(c => c.id === mainCatId)
        if (mainCat) dynamicTitle = mainCat.name
      }
    }

    // Use sub-category if selected, otherwise fall back to main category
    const effectiveCategoryId = subCatId ?? mainCatId ?? 'transfer'

    createTxn(
      {
        title:        title.trim() || dynamicTitle,
        amount,                              // clean integer — no string
        type:         txnType,
        category_id:  effectiveCategoryId,
        wallet_id:    walletId,
        to_wallet_id: txnType === 'transfer' ? toWalletId : null,
        date:         toDateInputVal(txnDate),
        notes:        notes.trim() || null,
        receipt_url:  receiptUrl,
      },
      { onSuccess: onClose },
    )
  }

  // ── Derived ─────────────────────────────────────────────────────────
  const hasReceipt    = receiptFile !== null
  const hasOperator   = /\s[+\-*/]\s/.test(expr)
  const displayAmount = displayExpr(expr)

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-[100] transition-all duration-300"
        style={{
          background:          isOpen ? 'oklch(0 0 0 / 32%)' : 'transparent',
          backdropFilter:      isOpen ? 'blur(4px)' : 'none',
          WebkitBackdropFilter:isOpen ? 'blur(4px)' : 'none',
          pointerEvents:       isOpen ? 'auto' : 'none',
        }}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tambah Transaksi"
        className="fixed inset-x-0 bottom-0 z-[101] mx-auto flex max-w-[430px] flex-col transition-transform duration-300 ease-out"
        style={{
          height: '90dvh',
          transform: isOpen ? 'translateY(0)' : 'translateY(105%)',
          borderTopLeftRadius: '2rem',
          borderTopRightRadius: '2rem',
          background: 'oklch(0.975 0.004 240)',
          boxShadow: '0 -8px 40px oklch(0 0 0 / 14%), 0 -1px 0 oklch(1 0 0 / 70%)',
          paddingBottom: 'env(safe-area-inset-bottom, 12px)',
        }}
      >
        {/* Drag handle */}
        <div
          className="mx-auto mt-3 h-1 w-10 flex-shrink-0 rounded-full"
          style={{ background: 'var(--glass-border-active)' }}
        />

        {/* ═══ UPPER SCROLLABLE ═══ */}
        <div className="flex-1 overflow-y-auto px-4 pt-1 pb-2 scrollbar-none">

          {/* ── Header: type pills + camera ── */}
          <div className="flex items-center justify-between gap-2 py-2">
            <div
              className="flex items-center gap-0.5 rounded-full p-1"
              style={{ background: 'var(--surface-2)', boxShadow: '0 1px 4px oklch(0 0 0 / 8%)' }}
            >
              {TYPE_OPTIONS.map(opt => {
                const isActive = txnType === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleTypeChange(opt.value)}
                    className="no-tap-highlight rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95"
                    style={{
                      background: isActive ? 'oklch(0.16 0.02 250)' : 'transparent',
                      color: isActive ? 'white' : 'var(--text-muted)',
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>

            {/* Camera / receipt button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload struk / bukti"
              className="no-tap-highlight relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all active:scale-90"
              style={{
                background: hasReceipt ? 'var(--accent-dim)' : 'var(--surface-2)',
                color:      hasReceipt ? 'var(--accent)' : 'var(--text-muted)',
                border:     hasReceipt ? '1.5px solid var(--accent)' : '1px solid var(--glass-border)',
                boxShadow:  '0 1px 3px oklch(0 0 0 / 6%)',
              }}
            >
              <Camera className="h-[18px] w-[18px]" />
              {hasReceipt && (
                <span
                  className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2"
                  style={{ background: 'var(--accent)', borderColor: 'oklch(0.975 0.004 240)' }}
                  aria-hidden="true"
                />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFile}
              aria-hidden="true"
            />
          </div>

          {/* ── Main category circles ── */}
          {txnType !== 'transfer' && mainCategories.length > 0 && (
            <div className="flex flex-row flex-nowrap overflow-x-auto scrollbar-none gap-3 px-4 pb-2 whitespace-nowrap">
              {mainCategories.map(cat => {
                const isActive = mainCatId === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleMainCatSelect(cat.id)}
                    className="no-tap-highlight shrink-0 flex flex-col items-center gap-1.5 transition-all active:scale-95"
                    aria-pressed={isActive}
                  >
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-full text-2xl transition-all duration-200"
                      style={{
                        background: isActive ? `${cat.color}22` : 'var(--surface-2)',
                        border: `2px solid ${isActive ? cat.color : 'transparent'}`,
                        boxShadow:  isActive
                          ? `0 2px 12px ${cat.color}55`
                          : '0 1px 3px oklch(0 0 0 / 8%)',
                      }}
                    >
                      {cat.icon}
                    </div>
                    <span
                      className="max-w-[60px] truncate text-center text-[10px] font-medium leading-tight"
                      style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-faint)' }}
                    >
                      {cat.name}
                    </span>
                  </button>
                )
              })}
              {/* Static Plus Button */}
              <div className="shrink-0 pr-6">
                <button
                  type="button"
                  disabled
                  className="no-tap-highlight flex flex-col items-center gap-1.5"
                >
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200"
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px dashed var(--glass-border)',
                    }}
                  >
                    <Plus className="h-6 w-6" style={{ color: 'var(--text-faint)' }} />
                  </div>
                  <span
                    className="max-w-[60px] truncate text-center text-[10px] font-medium leading-tight"
                    style={{ color: 'var(--text-faint)' }}
                  >
                    Tambah
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ── Sub-category chips (dynamic — appears when a main is selected) ── */}
          {txnType !== 'transfer' && mainCatId && subCategories.length > 0 && (
            <div className="flex flex-row flex-nowrap overflow-x-auto scrollbar-none gap-3 px-4 pb-2 whitespace-nowrap">
              {subCategories.map(sub => {
                const isActive = subCatId === sub.id
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSubCatSelect(sub.id)}
                    className="no-tap-highlight shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95"
                    aria-pressed={isActive}
                    style={{
                      background: isActive ? `${sub.color}18` : 'var(--surface-2)',
                      color:      isActive ? sub.color : 'var(--text-secondary)',
                      border:     isActive ? `1.5px solid ${sub.color}` : '1px solid var(--glass-border)',
                      boxShadow:  isActive ? `0 1px 8px ${sub.color}33` : 'none',
                    }}
                  >
                    <span className="text-sm">{sub.icon}</span>
                    {sub.name}
                  </button>
                )
              })}
              {/* Static Plus Button */}
              <div className="shrink-0 pr-6">
                <button
                  type="button"
                  disabled
                  className="no-tap-highlight flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150"
                  style={{
                    background: 'var(--surface-2)',
                    color: 'var(--text-faint)',
                    border: '1px dashed var(--glass-border)',
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Kustom
                </button>
              </div>
            </div>
          )}

          {/* ── Transfer: destination wallet ── */}
          {txnType === 'transfer' && (
            <div className="py-2">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Dompet Tujuan
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {wallets.filter(w => w.id !== walletId).map(w => {
                  const isActive = toWalletId === w.id
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => { setToWalletId(w.id); setError(null) }}
                      className="no-tap-highlight flex-shrink-0 rounded-2xl px-4 py-2 text-xs font-semibold transition-all active:scale-95"
                      style={{
                        background: isActive ? 'var(--accent-dim)' : 'var(--surface-2)',
                        color:      isActive ? 'var(--accent)' : 'var(--text-secondary)',
                        border:     isActive ? '1.5px solid var(--accent)' : '1px solid var(--glass-border)',
                      }}
                    >
                      {w.icon} {w.name}
                    </button>
                  )
                })}
                {wallets.length <= 1 && (
                  <p className="py-2 text-xs" style={{ color: 'var(--text-faint)' }}>
                    Tambah minimal 2 dompet untuk transfer
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Amount display ── */}
          <div className="py-3 text-center">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
              Jumlah
            </p>
            {/* When there's an operator, show the full expression */}
            <div className="flex min-h-[56px] items-baseline justify-center gap-2">
              <span className="text-base font-bold" style={{ color: 'var(--text-muted)' }}>Rp</span>
              <span
                className="text-5xl font-bold tabular-nums tracking-tight transition-all duration-150"
                style={{
                  color: expr === '0' ? 'var(--text-faint)' : 'var(--text-primary)',
                  fontSize: hasOperator ? '1.8rem' : '3rem',  // shrink when showing expression
                }}
              >
                {displayAmount}
              </span>
            </div>
          </div>

        </div>
        {/* end scrollable */}

        {/* ═══ FIXED BOTTOM ═══ */}
        <div className="flex-shrink-0 px-4">
          {/* Divider */}
          <div className="mb-2 h-px" style={{ background: 'var(--surface-3)' }} />

          {/* Error */}
          {error && (
            <div
              className="mb-2 rounded-xl px-4 py-1.5 text-center text-xs font-semibold"
              style={{ background: 'var(--expense-dim)', color: 'var(--expense)' }}
            >
              {error}
            </div>
          )}

          {/* Title */}
          <div
            className="mb-2 flex items-center gap-3 rounded-2xl px-4 py-2.5"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--glass-border)' }}
          >
            <FileText className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-faint)' }} />
            <input
              type="text"
              placeholder="Judul"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="flex-1 bg-transparent text-sm font-medium outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
            {title && (
              <button type="button" onClick={() => setTitle('')} style={{ color: 'var(--text-faint)' }}>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Notes + Wallet row */}
          <div className="mb-3 flex gap-2">
            <div
              className="flex flex-1 items-center gap-2 rounded-2xl px-3 py-2.5"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--glass-border)' }}
            >
              <NotebookPen className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-faint)' }} />
              <input
                type="text"
                placeholder="Tambah catatan..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-xs font-medium outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
            <div
              className="relative flex items-center rounded-2xl px-3 py-2.5"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--glass-border)', minWidth: '110px', maxWidth: '130px' }}
            >
              <select
                value={walletId}
                onChange={e => setWalletId(e.target.value)}
                className="w-full cursor-pointer appearance-none bg-transparent text-xs font-semibold outline-none"
                style={{ color: 'var(--text-primary)', paddingRight: '18px' }}
              >
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                ))}
                {wallets.length === 0 && <option value="">Pilih dompet</option>}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3" style={{ color: 'var(--text-faint)' }} />
            </div>
          </div>

          {/* ── Bottom panel ── */}
          {bottomPanel === 'operator' ? (
            <OperatorPanel
              onOp={handleOp}
              onDone={() => setBottomPanel('keypad')}
            />
          ) : bottomPanel === 'date' ? (
            <DatePickerPanel
              date={txnDate}
              onChange={setTxnDate}
              onDone={() => setBottomPanel('keypad')}
            />
          ) : (
            /* ── Custom Keypad ── */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr',
                gridTemplateRows: 'repeat(4, 52px)',
                gap: '7px',
              }}
            >
              {/* Row 1 */}
              <KeyButton onPress={() => handleKey('1')}>1</KeyButton>
              <KeyButton onPress={() => handleKey('2')}>2</KeyButton>
              <KeyButton onPress={() => handleKey('3')}>3</KeyButton>
              <KeyButton onPress={() => handleKey('back')} variant="danger">
                <Delete className="h-[18px] w-[18px]" />
              </KeyButton>

              {/* Row 2 */}
              <KeyButton onPress={() => handleKey('4')}>4</KeyButton>
              <KeyButton onPress={() => handleKey('5')}>5</KeyButton>
              <KeyButton onPress={() => handleKey('6')}>6</KeyButton>
              {/* Operator toggle — highlight if expression has active operator */}
              <KeyButton
                onPress={() => setBottomPanel('operator')}
                variant={hasOperator ? 'operator-active' : 'muted'}
              >
                <span className="text-center text-[11px] font-bold leading-tight">
                  +−<br />×÷
                </span>
              </KeyButton>

              {/* Row 3 */}
              <KeyButton onPress={() => handleKey('7')}>7</KeyButton>
              <KeyButton onPress={() => handleKey('8')}>8</KeyButton>
              <KeyButton onPress={() => handleKey('9')}>9</KeyButton>
              <KeyButton onPress={() => setBottomPanel('date')} variant="datetime">
                <div className="flex flex-col items-center leading-tight">
                  <span className="text-[10px] font-bold">{getDateLabel(txnDate)}</span>
                  <span className="text-[10px] font-semibold">{getTimeLabel(txnDate)}</span>
                </div>
              </KeyButton>

              {/* Row 4 */}
              <KeyButton onPress={() => handleKey('.')}>
                <span className="text-2xl leading-none">·</span>
              </KeyButton>
              <KeyButton onPress={() => handleKey('0')}>0</KeyButton>
              <KeyButton onPress={() => handleKey('000')}>
                <span className="text-xs font-bold">000</span>
              </KeyButton>
              <KeyButton onPress={handleSubmit} variant="dark">
                {isPending ? (
                  <span className="text-xs font-bold text-white/80">···</span>
                ) : (
                  <Check className="h-5 w-5 text-white" strokeWidth={3} />
                )}
              </KeyButton>
            </div>
          )}
        </div>
        {/* end fixed bottom */}

      </div>
    </>
  )
}
