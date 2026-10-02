/**
 * Checks whether debug mode is currently active via URL parameter.
 *
 * Seperti di Odoo:
 * Mode debug hanya aktif jika terdapat `debug=1` pada URL browser
 * (misal: http://localhost:5173/?debug=1 atau http://localhost:5173/#debug=1).
 *
 * Tidak ada tombol masuk mode debug — murni ditentukan manual dari URL.
 */
export function isDebugMode(): boolean {
  if (typeof window === 'undefined') return false

  try {
    const searchParams = new URLSearchParams(window.location.search)
    if (searchParams.get('debug') === '1') return true

    // Mendukung juga jika diketik di hash URL (misal #debug=1 atau #?debug=1)
    if (window.location.hash.includes('debug=1')) return true

    return false
  } catch {
    return false
  }
}

/**
 * Hook untuk mengecek status debug mode di komponen React.
 */
export function useDebugMode(): boolean {
  return isDebugMode()
}
