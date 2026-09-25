/**
 * formatters.ts — Pure formatting utilities for wllt.z.
 * No dependencies, no hooks — safe to use anywhere.
 */

// ─────────────────────────────────────────────
// Currency
// ─────────────────────────────────────────────

/**
 * Format a number as Indonesian Rupiah.
 * Uses compact notation for amounts ≥ 1.000.000 for space efficiency.
 *
 * @example
 * formatRupiah(45000)        // "Rp 45.000"
 * formatRupiah(5000000)      // "Rp 5.000.000"
 * formatRupiah(1500000, true) // "Rp 1,5jt"
 */
export function formatRupiah(
  amount: number,
  compact = false,
): string {
  if (compact && Math.abs(amount) >= 1_000_000) {
    const juta = amount / 1_000_000
    const formatted = juta % 1 === 0
      ? juta.toFixed(0)
      : juta.toFixed(1)
    return `Rp ${formatted}jt`
  }

  if (compact && Math.abs(amount) >= 1_000) {
    const ribu = amount / 1_000
    const formatted = ribu % 1 === 0
      ? ribu.toFixed(0)
      : ribu.toFixed(1)
    return `Rp ${formatted}rb`
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format a signed amount with + / − prefix for display in transaction lists.
 *
 * @example
 * formatSignedRupiah(45000, 'expense')  // "−Rp 45.000"
 * formatSignedRupiah(5000000, 'income') // "+Rp 5.000.000"
 */
export function formatSignedRupiah(
  amount: number,
  type: 'income' | 'expense' | 'transfer' | 'debt',
  compact = false,
): string {
  const base = formatRupiah(Math.abs(amount), compact)
  if (type === 'income' || type === 'debt') return `+${base}`
  if (type === 'expense') return `−${base}`
  return base // transfer: no sign
}

// ─────────────────────────────────────────────
// Period (YYYY-MM)
// ─────────────────────────────────────────────

/**
 * Format a "YYYY-MM" period string as a human-readable month label.
 *
 * @example
 * formatPeriod('2025-01')  // "Jan 2025"
 * formatPeriod('2025-01', 'long')  // "Januari 2025"
 */
export function formatPeriod(
  period: string,
  format: 'short' | 'long' = 'short',
): string {
  const [year, month] = period.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString('id-ID', {
    month: format === 'short' ? 'short' : 'long',
    year: 'numeric',
  })
}

// ─────────────────────────────────────────────
// Date
// ─────────────────────────────────────────────

/**
 * Format an ISO date string ("YYYY-MM-DD") for display in transaction lists.
 *
 * @example
 * formatDate('2025-01-15')  // "15 Jan"
 * formatDate('2025-01-15', true)  // "15 Jan 2025"
 */
export function formatDate(isoDate: string, withYear = false): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  })
}

/**
 * Return a relative date label for display ("Hari ini", "Kemarin", or the date).
 */
export function formatRelativeDate(isoDate: string): string {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  if (isoDate === todayStr) return 'Hari ini'
  if (isoDate === yesterdayStr) return 'Kemarin'
  return formatDate(isoDate)
}

/**
 * Format an ISO date string as a long date label for section headers.
 * @example formatDateLong('2026-05-28') → "28 Mei 2026"
 */
export function formatDateLong(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ─────────────────────────────────────────────
// Transaction date grouping
// ─────────────────────────────────────────────

export interface DateGroup<T extends { date: string }> {
  /** YYYY-MM-DD date key */
  dateKey: string
  /** Human-readable label: "Hari Ini", "Kemarin", or "28 Mei 2026" */
  label: string
  items: T[]
}

/**
 * Group a flat array of items (that have a `date: string` field in YYYY-MM-DD format)
 * into sections by date, sorted newest-first.
 *
 * Designed to be generic so it can work with any entity with a date field.
 *
 * @example
 * const groups = groupByDate(transactions)
 * // [
 * //   { dateKey: '2026-05-30', label: 'Hari Ini',   items: [...] },
 * //   { dateKey: '2026-05-29', label: 'Kemarin',     items: [...] },
 * //   { dateKey: '2026-05-28', label: '28 Mei 2026', items: [...] },
 * // ]
 */
export function groupByDate<T extends { date: string }>(items: T[]): DateGroup<T>[] {
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  // Build a map: dateKey → items[]
  const map = new Map<string, T[]>()
  for (const item of items) {
    const key = item.date.slice(0, 10)  // Normalize to YYYY-MM-DD
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }

  // Convert map to sorted array (newest date first)
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, groupItems]) => ({
      dateKey,
      label:
        dateKey === todayKey     ? 'Hari Ini' :
        dateKey === yesterdayKey ? 'Kemarin'  :
        formatDateLong(dateKey),
      items: groupItems,
    }))
}

