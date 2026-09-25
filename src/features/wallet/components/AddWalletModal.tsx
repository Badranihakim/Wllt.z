import { useState, useEffect, type FormEvent } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import {
  FormField,
  TextInput,
  SelectInput,
  SubmitButton,
  TypeToggle,
} from '@/components/ui/FormFields'
import { useUIStore } from '@/stores'
import { useCreateWallet } from '@/features/wallet/hooks'
import type { WalletType } from '@/types'

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────

const WALLET_TYPE_OPTIONS: Array<{ value: WalletType; label: string; icon: string }> = [
  { value: 'cash',       label: 'Tunai',       icon: '💵' },
  { value: 'bank',       label: 'Bank',        icon: '🏦' },
  { value: 'e-wallet',   label: 'E-Wallet',    icon: '📱' },
  { value: 'credit',     label: 'Kredit',      icon: '💳' },
  { value: 'investment', label: 'Investasi',   icon: '📈' },
  { value: 'other',      label: 'Lainnya',     icon: '🗂️' },
]

const ICON_PRESETS = [
  '💳', '🏦', '💵', '📱', '💰', '🪙',
  '📈', '🏧', '💹', '🗂️', '🧾', '⭐',
]

/** 8 curated light-friendly swatches */
const COLOR_PRESETS = [
  '#3B82F6', // Electric Blue
  '#059669', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#6B7280', // Gray
]

// ─────────────────────────────────────────────
// Form state
// ─────────────────────────────────────────────

interface FormState {
  name: string
  type: WalletType
  balance: string
  icon: string
  color: string
}

interface FormErrors {
  name?: string
  balance?: string
}

const DEFAULT_STATE: FormState = {
  name: '',
  type: 'bank',
  balance: '0',
  icon: '💳',
  color: '#3B82F6',
}

// ─────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {}

  if (!form.name.trim()) {
    errors.name = 'Nama dompet wajib diisi'
  }

  const balance = Number(form.balance.replace(/[^0-9]/g, ''))
  if (form.balance !== '' && isNaN(balance)) {
    errors.balance = 'Saldo harus berupa angka'
  }

  return errors
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

/**
 * AddWalletModal — Bottom sheet form to create a new wallet.
 *
 * Reads visibility from Zustand `isAddWalletOpen`.
 * On submit: calls `useCreateWallet` mutation (Task 4).
 * On success: closes modal + clears form.
 */
export function AddWalletModal() {
  const isOpen  = useUIStore(s => s.isAddWalletOpen)
  const onClose = useUIStore(s => s.closeAddWallet)

  const [form, setForm] = useState<FormState>(DEFAULT_STATE)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm(DEFAULT_STATE)
      setErrors({})
      setSubmitted(false)
    }
  }, [isOpen])

  // Live re-validate after first submit attempt
  useEffect(() => {
    if (submitted) setErrors(validate(form))
  }, [form, submitted])

  const { mutate: createWallet, isPending } = useCreateWallet()

  const setField = <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)

    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    const balance = Number(form.balance.replace(/[^0-9]/g, ''))

    createWallet(
      {
        name: form.name.trim(),
        type: form.type,
        balance,
        icon: form.icon,
        color: form.color,
        currency: 'IDR',
      },
      {
        onSuccess: () => {
          onClose()
        },
      },
    )
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Dompet"
      className="max-h-[92dvh] overflow-y-auto"
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

        {/* ── Name + Icon row ── */}
        <div className="flex gap-3">
          {/* Icon picker button — simplified as emoji selector */}
          <div className="flex flex-col items-center gap-1">
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              Ikon
            </span>
            <div className="relative">
              <SelectInput
                id="wallet-icon"
                value={form.icon}
                onChange={e => setField('icon')(e.target.value)}
                style={{ width: '72px', textAlign: 'center', fontSize: '1.3rem', padding: '8px 8px' }}
              >
                {ICON_PRESETS.map(emoji => (
                  <option key={emoji} value={emoji}>{emoji}</option>
                ))}
              </SelectInput>
            </div>
          </div>

          {/* Name */}
          <div className="flex-1">
            <FormField label="Nama Dompet" required error={errors.name}>
              <TextInput
                id="wallet-name"
                placeholder="BCA Tabungan, GoPay..."
                value={form.name}
                onChange={e => setField('name')(e.target.value)}
                hasError={!!errors.name}
                autoComplete="off"
              />
            </FormField>
          </div>
        </div>

        {/* ── Wallet type ── */}
        <FormField label="Tipe Dompet">
          <SelectInput
            id="wallet-type"
            value={form.type}
            onChange={e => setField('type')(e.target.value as WalletType)}
          >
            {WALLET_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.icon} {opt.label}
              </option>
            ))}
          </SelectInput>
        </FormField>

        {/* ── Initial balance ── */}
        <FormField label="Saldo Awal (Rp)" error={errors.balance}>
          <TextInput
            id="wallet-balance"
            inputMode="numeric"
            placeholder="0"
            value={form.balance}
            onChange={e => {
              const raw = e.target.value.replace(/[^0-9]/g, '')
              setField('balance')(raw)
            }}
            hasError={!!errors.balance}
          />
        </FormField>

        {/* ── Color swatches ── */}
        <FormField label="Warna Aksen">
          <div className="flex flex-wrap gap-2 pt-1">
            {COLOR_PRESETS.map(color => (
              <button
                key={color}
                type="button"
                aria-label={`Warna ${color}`}
                aria-pressed={form.color === color}
                onClick={() => setField('color')(color)}
                className="no-tap-highlight h-8 w-8 rounded-full transition-all duration-150 active:scale-90"
                style={{
                  background: color,
                  outline: form.color === color
                    ? `3px solid ${color}`
                    : '2px solid transparent',
                  outlineOffset: form.color === color ? '2px' : '0px',
                  boxShadow: form.color === color
                    ? `0 0 0 4px ${color}22`
                    : 'none',
                }}
              />
            ))}
          </div>
        </FormField>

        {/* ── Submit ── */}
        <SubmitButton
          label="Simpan Dompet"
          isPending={isPending}
          pendingLabel="Menyimpan..."
        />

      </form>
    </BottomSheet>
  )
}
