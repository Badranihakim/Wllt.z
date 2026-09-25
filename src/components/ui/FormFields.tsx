import { type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

// ─────────────────────────────────────────────
// FormField wrapper
// ─────────────────────────────────────────────

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

export function FormField({ label, error, required, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
        {required && (
          <span className="ml-1" style={{ color: 'var(--expense)' }}>*</span>
        )}
      </label>
      {children}
      {error && (
        <span className="text-xs font-medium" style={{ color: 'var(--expense)' }}>
          {error}
        </span>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// TextInput
// ─────────────────────────────────────────────

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean
}

export function TextInput({ hasError, className = '', ...props }: TextInputProps) {
  return (
    <input
      {...props}
      className={[
        'w-full rounded-2xl px-4 py-3 text-sm font-medium outline-none',
        'transition-all duration-200',
        className,
      ].join(' ')}
      style={{
        background: 'var(--surface-3)',
        color: 'var(--text-primary)',
        border: hasError
          ? '1.5px solid var(--expense)'
          : '1.5px solid transparent',
        ...(props.style ?? {}),
      }}
      onFocus={e => {
        e.currentTarget.style.border = hasError
          ? '1.5px solid var(--expense)'
          : '1.5px solid var(--accent)'
        e.currentTarget.style.background = 'var(--surface-2)'
      }}
      onBlur={e => {
        e.currentTarget.style.border = hasError
          ? '1.5px solid var(--expense)'
          : '1.5px solid transparent'
        e.currentTarget.style.background = 'var(--surface-3)'
      }}
    />
  )
}

// ─────────────────────────────────────────────
// SelectInput
// ─────────────────────────────────────────────

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean
}

export function SelectInput({ hasError, className = '', children, ...props }: SelectInputProps) {
  return (
    <select
      {...props}
      className={[
        'w-full appearance-none rounded-2xl px-4 py-3 text-sm font-medium outline-none',
        'transition-all duration-200 cursor-pointer',
        className,
      ].join(' ')}
      style={{
        background: 'var(--surface-3)',
        color: 'var(--text-primary)',
        border: hasError
          ? '1.5px solid var(--expense)'
          : '1.5px solid transparent',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        paddingRight: '40px',
        ...(props.style ?? {}),
      }}
      onFocus={e => {
        e.currentTarget.style.border = '1.5px solid var(--accent)'
        e.currentTarget.style.background = 'var(--surface-2)'
      }}
      onBlur={e => {
        e.currentTarget.style.border = hasError ? '1.5px solid var(--expense)' : '1.5px solid transparent'
        e.currentTarget.style.background = 'var(--surface-3)'
      }}
    >
      {children}
    </select>
  )
}

// ─────────────────────────────────────────────
// TextAreaInput
// ─────────────────────────────────────────────

interface TextAreaInputProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean
}

export function TextAreaInput({ hasError, className = '', ...props }: TextAreaInputProps) {
  return (
    <textarea
      rows={3}
      {...props}
      className={[
        'w-full resize-none rounded-2xl px-4 py-3 text-sm font-medium outline-none',
        'transition-all duration-200',
        className,
      ].join(' ')}
      style={{
        background: 'var(--surface-3)',
        color: 'var(--text-primary)',
        border: hasError
          ? '1.5px solid var(--expense)'
          : '1.5px solid transparent',
        ...(props.style ?? {}),
      }}
      onFocus={e => {
        e.currentTarget.style.border = '1.5px solid var(--accent)'
        e.currentTarget.style.background = 'var(--surface-2)'
      }}
      onBlur={e => {
        e.currentTarget.style.border = hasError ? '1.5px solid var(--expense)' : '1.5px solid transparent'
        e.currentTarget.style.background = 'var(--surface-3)'
      }}
    />
  )
}

// ─────────────────────────────────────────────
// SubmitButton
// ─────────────────────────────────────────────

interface SubmitButtonProps {
  label: string
  isPending: boolean
  pendingLabel?: string
}

export function SubmitButton({
  label,
  isPending,
  pendingLabel = 'Menyimpan...',
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isPending}
      className="no-tap-highlight mt-2 w-full rounded-2xl py-4 text-sm font-bold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
      style={{
        background: isPending ? 'var(--text-faint)' : 'var(--accent)',
        boxShadow: isPending ? 'none' : '0 4px 16px var(--accent-glow)',
      }}
    >
      {isPending ? pendingLabel : label}
    </button>
  )
}

// ─────────────────────────────────────────────
// TypeToggle — segmented pill selector
// ─────────────────────────────────────────────

interface TypeToggleOption<T extends string> {
  value: T
  label: string
  icon?: string
}

interface TypeToggleProps<T extends string> {
  options: TypeToggleOption<T>[]
  value: T
  onChange: (value: T) => void
}

export function TypeToggle<T extends string>({
  options,
  value,
  onChange,
}: TypeToggleProps<T>) {
  return (
    <div
      className="flex gap-1 rounded-2xl p-1"
      style={{ background: 'var(--surface-3)' }}
    >
      {options.map(opt => {
        const isActive = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="no-tap-highlight flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all duration-200 active:scale-95"
            style={{
              background: isActive ? 'var(--surface-2)' : 'transparent',
              color: isActive ? 'var(--accent)' : 'var(--text-faint)',
              boxShadow: isActive ? '0 1px 4px oklch(0 0 0 / 8%)' : 'none',
            }}
          >
            {opt.icon && <span>{opt.icon}</span>}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
