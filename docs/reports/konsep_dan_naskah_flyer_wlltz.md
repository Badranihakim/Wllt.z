# Konsep Desain, Naskah Copywriting & Panduan Flyer Promosi — Wllt.z

> **Ruang Lingkup Dokumen:** Panduan Pembuatan Flyer Promosi & Showcase Capstone Project UT  
> **Klasifikasi:** `[FACT]` & `[ASSESSMENT]`  
> **Penulis / Arsitek:** Senior Financial Software Architect & Enterprise Technical Writer  
> **Status Dokumen:** `[APPROVED / BASELINE]`  
> **Target Format:** Flyer Ukuran A4 (Single Page Portrait) atau Brosur Digital (1080x1920 px / Instagram & PDF)  

---

## 1. Konsep & Filosofi Desain Flyer `[ASSESSMENT]`

Flyer **Wllt.z** dirancang untuk kebutuhan pameran akademik, presentasi tugas akhir (*Capstone Project*), serta promosi kepada calon pengguna umum. 

### A. Gaya Visual (Visual Direction)
- **Tema:** *Modern, Clean, Trustworthy & High-Tech FinTech*.
- **Palet Warna Utama (Sesuai Desain Aplikasi):**
  - **Primary / Accent:** Indigo / Royal Blue (`#3B82F6` / `oklch(0.55 0.22 250)`) — melambangkan stabilitas keuangan dan keamanan.
  - **Secondary Accent:** Emerald Green (`#10B981`) — melambangkan pertumbuhan aset, pemasukan, dan kesehatan finansial.
  - **Background:** Slate / Clean Off-White (`#F8FAFC` atau Dark Glassmorphism) dengan sentuhan gradien lembut.
  - **Font Utama:** Geist / Inter / Helvetica (Font sans-serif modern berbobot *bold* dan *medium*).

### B. Struktur Grid Flyer A4 (Tata Letak 5 Blok)
```text
┌────────────────────────────────────────────────────────┐
│ [BLOK 1: HEADER & LOGO]                                │
│ Logo Wllt.z + Tagline Menohok + Badge Kedaulatan Data │
├────────────────────────────────────────────────────────┤
│ [BLOK 2: PROBLEM VS SOLUTION]                          │
│ 3 Masalah Finansial vs Solusi Unik Wllt.z              │
├────────────────────────────────────────────────────────┤
│ [BLOK 3: FITUR UNGGULAN & SCREENSHOT MOCKUP]           │
│ Mockup HP/Laptop + 4 Pilar Inovasi Fitur Utama         │
├────────────────────────────────────────────────────────┤
│ [BLOK 4: KEUNGGULAN ARSITEKTUR TEKNOLOGI]              │
│ Local-First Dexie + Google Sheets Sync + PWA Offline   │
├────────────────────────────────────────────────────────┤
│ [BLOK 5: CALL TO ACTION & IDENTITAS MAHASISWA]         │
│ QR Code Aplikasi + Link Web + Identitas Capstone UT    │
└────────────────────────────────────────────────────────┘
```

---

## 2. Naskah Copywriting Lengkap (Siap Salin ke Canva / Figma) `[FACT]`

Berikut adalah teks copywriting yang siap langsung Anda salin ke kanvas desain Anda:

### ── BLOK 1: HEADER & BRANDING ──
* **Logo:** `wllt.z` *(wllt berwarna gelap/putih, .z berwarna biru aksen)*
* **Sub-Heading / Kategori:** `Aplikasi Catatan Keuangan Pribadi & Akuntansi Ringan Modern`
* **Headline Utama:** 
  > **"Keuanganmu, Kendalimu. Catat Cepat Tanpa Sinyal, Cadangkan Otomatis ke Google Drive Pribadi!"**
* **Nilai Tambah (Value Proposition):** 
  `100% Kedaulatan Data Pengguna • Zero Server Backend • Responsif Seketika (<16ms)`

---

### ── BLOK 2: MASALAH VS SOLUSI (WHY WLLT.Z?) ──
*(Gunakan icon silang ❌ dan centang hijau ✅)*

| Sering Terjadi pada Aplikasi Lain ❌ | Solusi Cerdas Wllt.z ✅ |
| :--- | :--- |
| **Data Keuangan Disimpan di Server Pihak Ketiga:** Rawan kebocoran data (*data breach*) dan privasi terancam. | **100% Kedaulatan Data (User-Owned):** Data hanya disimpan di perangkat Anda dan Google Drive pribadi Anda sendiri. |
| **Aplikasi Lemot saat Internet Jelek:** Sulit mencatat transaksi di kasir saat sinyal minim. | **Local-First & Offline-First:** Akses dan pencatatan instan tanpa perlu menunggu koneksi internet. |
| **Data Terkunci (*Vendor Lock-In*):** Riwayat keuangan sulit diekspor atau diverifikasi secara manual. | **Audit Terbuka di Google Sheets:** Otomatis menjadi lembar neraca terformat dengan formula akuntansi resmi. |

---

### ── BLOK 3: 4 PILAR FITUR UNGGULAN ──
*(Susun dalam bentuk 4 kotak kartu / feature cards)*

1. ⚡ **Pencatatan Cepat & Kalkulator Terpadu**
   - Catat pemasukan, pengeluaran, transfer antar-dompet, dan hutang dalam hitungan detik.
   - Dilengkapi *inline keypad calculator* pintar tanpa hambatan.

2. 💼 **Multi-Wallet & Monitoring Kekayaan Bersih (Net Worth)**
   - Kelola berbagai rekening sekaligus: Kas Tunai, Bank (BCA, Mandiri), dan E-Wallet (GoPay, OVO).
   - Perhitungan total kekayaan bersih dan saldo mutasi otomatis secara *real-time*.

3. 🔄 **Smart Two-Way Sync (Google Drive & Sheets)**
   - Sinkronisasi dua arah cerdas yang memadukan data HP dan Laptop tanpa risiko data saling menimpa.
   - Terintegrasi dengan Google OAuth 2.0 aman (*One-Tap Authorization*).

4. 🎯 **Kontrol Anggaran & Analisis Arus Kas**
   - Tetapkan pagu belanja bulanan per kategori dengan indikator peringatan (*threshold visual*).
   - Visualisasi grafik arus kas mingguan dan statistik distribusi pengeluaran yang interaktif.

---

### ── BLOK 4: KEUNGGULAN ARSITEKTUR & TEKNOLOGI ──
*(Menunjukkan kualitas teknis untuk penilaian akademik/dosen)*

* **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Recharts.
* **Database Primer:** Dexie.js (IndexedDB) — *Persistent, Multi-Tenant, Zero-Latency*.
* **Sinkronisasi Cloud:** Google Drive API & Google Sheets API v4.
* **Distribusi:** Progressive Web App (PWA) — Bisa diinstall langsung di Android, iOS, Windows, dan Mac.

---

### ── BLOK 5: FOOTER, DEMO & CALL TO ACTION ──
* **Headline Aksi:** 
  > **"Coba Wllt.z Sekarang Langsung di Peramban Anda!"**
* **Tautan Web:** `https://wllt-z.vercel.app`
* **Elemen Visual:** *Kotak QR Code (Arahkan kamera HP ke sini untuk mencoba)*
* **Identitas Tugas Akhir / Akademik:**
  - **Program:** Capstone Project — Program Studi Sistem Informasi / Ilmu Komputer
  - **Institusi:** Universitas Terbuka (UT)
  - **Nama Pengembang / Mahasiswa:** Rayan Sarijatmiko *(atau nama resmi Anda)*

---

## 3. Rekomendasi Pembuatan di Canva atau Figma `[TIP]`

1. **Ukuran Lembar:**
   - Pilih ukuran **A4 Portrait** (210 x 297 mm) untuk dicetak fisik.
   - Atau **Instagram Story / Poster Digital** (1080 x 1920 px) untuk dibagikan via WhatsApp dan media sosial.
2. **Aset Gambar yang Perlu Disiapkan:**
   - **Logo Wllt.z:** Ambil dari [`public/favicon.svg`](file:///home/rayanapi/IAN/Programing/Capstone%20Project%20UT/Wllt.z/public/favicon.svg) atau [`public/icons/icon-512x512.png`](file:///home/rayanapi/IAN/Programing/Capstone%20Project%20UT/Wllt.z/public/icons/icon-512x512.png).
   - **Screenshot Aplikasi:**
     1. Tampilan Dasbor Keuangan (Total Saldo & Grafik).
     2. Tampilan Form Catat Transaksi Cepat.
     3. Tampilan Lembar Google Sheets hasil sinkronisasi.
   - **QR Code:** Buat QR Code gratis ke alamat `https://wllt-z.vercel.app` (misalnya via QR Code Generator di Canva).
3. **Tips Tipografi:**
   - Judul gunakan teks tebal (*Bold/Black*).
   - Poin fitur gunakan *bullet point* dengan ikon emoji atau Lucide Icons agar visual hidup.
