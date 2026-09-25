interface EmptyStateProps {
  icon?: string
  message: string
  subMessage?: string
}

/**
 * EmptyState — Displayed when a list has no items.
 * Used in wallet slider, transaction list, budget list, etc.
 */
export function EmptyState({ icon = '📭', message, subMessage }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <span className="text-5xl opacity-60">{icon}</span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-white/70">{message}</p>
        {subMessage && (
          <p className="text-xs text-white/40">{subMessage}</p>
        )}
      </div>
    </div>
  )
}
