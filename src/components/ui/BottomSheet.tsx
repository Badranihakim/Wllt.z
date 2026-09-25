import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Extra CSS class on the sheet panel. Use for height overrides. */
  className?: string
}

/**
 * BottomSheet — Reusable premium bottom sheet modal.
 *
 * - Slides up from bottom with spring-like transition
 * - Frosted glassmorphism panel on light blurred overlay
 * - Closes on backdrop click or ESC key
 * - Locks body scroll while open
 * - Safe-area aware bottom padding
 */
export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}: BottomSheetProps) {
  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // ESC key handler
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-[100] transition-all duration-300"
        style={{
          background: isOpen ? 'oklch(0 0 0 / 30%)' : 'transparent',
          backdropFilter: isOpen ? 'blur(4px)' : 'none',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />

      {/* ── Sheet panel ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={[
          'fixed inset-x-0 bottom-0 z-[101] mx-auto max-w-[430px]',
          'rounded-t-[2rem] transition-transform duration-300 ease-out',
          className,
        ].join(' ')}
        style={{
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          background: 'oklch(1 0 0 / 82%)',
          backdropFilter: 'blur(24px) saturate(200%)',
          WebkitBackdropFilter: 'blur(24px) saturate(200%)',
          border: '1px solid var(--glass-border)',
          borderBottom: 'none',
          boxShadow: '0 -8px 40px oklch(0 0 0 / 12%), 0 -1px 0 oklch(1 0 0 / 60%)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Drag handle */}
        <div className="mx-auto mt-3 mb-1 h-1 w-10 rounded-full"
             style={{ background: 'var(--glass-border-active)' }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2
            className="text-lg font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="no-tap-highlight flex h-8 w-8 items-center justify-center rounded-full transition-colors active:scale-90"
            style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {children}
        </div>
      </div>
    </>
  )
}
