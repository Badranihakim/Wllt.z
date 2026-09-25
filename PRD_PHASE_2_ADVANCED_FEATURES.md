# PRD Fase 2: Wllt.z Advanced Personal Wealth Suite

Dokumen ini merangkum seluruh fitur baru untuk ekspansi Fase 2 Wllt.z, mengubahnya dari aplikasi pencatat keuangan dasar menjadi "Advanced Personal Wealth Suite". Ekspansi ini didasarkan pada adaptasi benchmark industri dengan detail arsitektur teknis berikut.

## 1. Sistem Multi-Dompet Lanjutan (Multi-Wallet Framework)

Peningkatan pada struktur penyimpanan untuk mendukung berbagai jenis dompet dan pengelolaan yang lebih kompleks.

### Upgrade Skema DB (Dexie.js)
Tambahkan field properti baru pada tabel `wallets`:
- `type`: Menyimpan jenis dompet. Nilai yang diizinkan: `'bank' | 'e-wallet' | 'cash' | 'credit-card'`.
- `exclude_from_total`: (Boolean) Menandakan apakah saldo dompet ini harus dikecualikan dari perhitungan total kekayaan utama.
- `parent_id`: (String atau Null) Mendukung hierarki dompet (fitur sub-akun atau Pocket). Merujuk ke ID dompet induk.
- `icon_metadata`: Menyimpan informasi ikon dompet, mendukung *local bank icon pack* dan pengunggahan *custom icon*.

### Aturan Logika
- Transaksi yang terjadi pada dompet dengan atribut `exclude_from_total === true` **tidak akan dihitung** ke akumulasi Total Saldo Utama di layar Beranda.
- Transaksi dari dompet tersebut juga dikecualikan dari kalkulasi statistik bersih keseluruhan.

## 2. Panel Visualisasi Interaktif & Statistik Recharts

Integrasi perpustakaan visualisasi data (Recharts) untuk memberikan wawasan finansial yang lebih mendalam dan interaktif.

### Komponen Grafik Baru
Integrasikan komponen **Recharts** untuk membangun visualisasi berikut:
1. **Donut Chart Distribusi Pengeluaran**: Menampilkan persentase porsi pengeluaran per Kategori Utama secara reaktif. Dilengkapi dengan legenda warna yang dinamis berdasarkan kategori.
2. **Area Line Chart Tren Saldo Bersih**: Grafik area dengan efek gradasi untuk memvisualisasikan naik-turunnya total kekayaan atau saldo bersih sepanjang waktu.
3. **Bar Chart Ringkasan Harian**: Grafik batang untuk membandingkan Arus Kas Masuk (Income) versus Arus Kas Keluar (Expense) secara harian.

### Filter Jangkauan Waktu Ekstensif
Sediakan state/tab interval waktu baru pada antarmuka pengguna:
- **Mingguan**
- **Bulanan**
- **Tahunan**
- **Rentang Kustom** (Pilih tanggal mulai & akhir)

## 3. Kalender Peta Aktivitas Finansial (Spending Heatmap)

Memberikan pandangan tingkat tinggi tentang intensitas aktivitas keuangan dalam sebulan.

### Visualisasi Kontribusi Finansial
Desain sebuah komponen "Peta Aktivitas" bergaya *GitHub Contribution Graph*.
- Menggunakan **Grid 7x5** untuk merepresentasikan tanggal-tanggal dalam rentang satu bulan.

### State Machine Intensitas Warna
Terapkan logika pewarnaan kotak grid berdasarkan akumulasi nominal pengeluaran pada hari tersebut:
- **Hijau/Netral**: Jika tidak ada pengeluaran pada hari tersebut.
- **Merah (Bergradasi)**: Semakin pekat warna merahnya seiring dengan semakin besarnya total pengeluaran di hari tersebut.

### Panel Top Expenses
Di bawah komponen kalender heatmap, tampilkan daftar **5 besar (Top 5) pengeluaran kategori terbesar**, diurutkan secara menurun (descending).

## 4. Infrastruktur Gerbang Input Rekam Cepat (Smart Input Engine)

Mempercepat dan mempermudah proses pencatatan transaksi melalui berbagai metode masukan.

### Desain Antarmuka
Sediakan *placeholder* untuk komponen visual "Rekam Cepat" yang diposisikan di bagian atas Beranda. Komponen ini terdiri dari:
1. **AI Chat Input Bar**: Masukan berbasis teks *natural language prompt* (misal: "Beli kopi 50 ribu pakai Gopay").
2. **Scan Struk Button**: Tombol akses untuk gerbang *Optical Character Recognition (OCR)* menggunakan kamera.
3. **Voice Input Button**: Tombol akses untuk gerbang *speech-to-text* (perekaman suara).

## 5. Aturan UI/UX Cohesion (Glassmorphic Adaptation)

Memastikan seluruh fitur baru tetap sejalan dengan estetika premium aplikasi.

- **Pertahankan Design System**: Tetap gunakan pakem "Premium Light Glassmorphism" yang telah dibangun pada Fase 1.
- **Data Density**: Modifikasi kepadatan informasi agar dapat menampung data yang lebih padat seperti aplikasi finansial referensi industri, namun tanpa mengorbankan estetika.
- **Styling Details**: 
  - Gunakan efek panel kaca buram (`.glass` atau *frosted glass*).
  - Terapkan *white border* yang tipis.
  - Tambahkan efek *shadow glow* yang elegan.
  - Pastikan setiap transisi animasi dan *micro-interactions* berjalan sangat halus (menggunakan *timing function ease-in-out*).

---
*Dokumen ini merupakan spesifikasi teknis dan fungsional untuk inisiatif Fase 2 pengembangan Wllt.z.*
