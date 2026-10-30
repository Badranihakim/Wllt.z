/**
 * errorUtils.ts — Penerjemah dan pembangun pesan error ramah pengguna (human-readable)
 * untuk ekosistem aplikasi wllt.z.
 */

/**
 * Deteksi apakah error disebabkan oleh hilangnya jaringan / internet / offline.
 */
export function isNetworkError(err: any): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true
  }
  const msg = (typeof err === 'string' ? err : err?.message || String(err || '')).toLowerCase()
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('offline') ||
    msg.includes('perangkat sedang offline') ||
    msg.includes('internet')
  )
}

/**
 * Terjemahkan error Google Drive / Sheets API menjadi pesan Bahasa Indonesia yang santun dan informatif.
 */
export function formatSyncError(err: any, context: 'sync' | 'pull' | 'auth' = 'sync'): string {
  if (isNetworkError(err)) {
    if (context === 'pull') {
      return 'Perangkat sedang offline. Sambungkan ke koneksi internet untuk menarik data dari Google Drive.'
    }
    return 'Perangkat sedang offline. Sambungkan ke koneksi internet untuk melakukan sinkronisasi dengan Google Drive.'
  }

  const msg = (typeof err === 'string' ? err : err?.message || String(err || '')).trim()

  if (
    msg === 'Session Expired' ||
    msg.toLowerCase().includes('session expired') ||
    msg.toLowerCase().includes('invalid authentication credentials') ||
    msg.toLowerCase().includes('401')
  ) {
    return 'Sesi akun Google telah berakhir demi keamanan. Silakan sambungkan ulang akun Google Anda.'
  }

  if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('429')) {
    return 'Batas frekuensi permintaan Google API tercapai sementara. Silakan tunggu beberapa menit lalu coba lagi.'
  }

  if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('404')) {
    return 'Berkas spreadsheet di Google Drive tidak ditemukan. Sistem akan membuatkan lembar baru pada sinkronisasi berikutnya.'
  }

  // Fallback umum yang ramah pengguna
  if (context === 'pull') {
    return msg || 'Gagal menarik data dari Google Drive. Pastikan jaringan stabil dan coba lagi.'
  }
  return msg || 'Gagal menyinkronkan data ke Google Drive. Pastikan jaringan stabil dan coba lagi.'
}
