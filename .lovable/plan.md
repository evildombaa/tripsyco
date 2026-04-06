## Rencana Implementasi Itinerary V2

### 1. Database Migration
- Buat tabel `itinerary_v2_preferences` untuk menyimpan jawaban kuesioner (destination, date_start, date_end, active_hours_start, active_hours_end, travel_purposes (array), travel_companion, travel_style, budget_range, custom answers)
- Buat tabel `itinerary_v2_swipes` untuk menyimpan hasil swipe (place_name, liked/disliked, metadata)

### 2. Multi-Step Questionnaire (6 halaman)
- **Step 1**: Input destinasi wisata (text input)
- **Step 2**: Kalender date-range picker (klik tanggal awal & akhir, otomatis blok tengah) + Active hours (jam mulai - jam selesai) di section terpisah
- **Step 3**: Tujuan perjalanan (multi-select chips + input custom)
- **Step 4**: Teman perjalanan (single select + input custom)
- **Step 5**: Gaya perjalanan (single select + input custom)
- **Step 6**: Budget range (single select)

### 3. AI Recommendation Cards
- Edge function memanggil OpenAI untuk generate rekomendasi lokasi berdasarkan semua jawaban
- Menggunakan Google Maps API untuk foto & detail lokasi

### 4. Tinder-Style Swipe UI
- Swipeable card stack dengan gesture kiri/kanan
- Card menampilkan: foto lokasi (background), nama, deskripsi, rating
- Swipe kanan = suka, kiri = skip

### 5. Auto-Generate Itinerary
- Setelah semua card di-swipe, generate itinerary otomatis dari lokasi yang di-like
- Simpan ke database dan redirect ke editor

### Tech Stack
- `react-tinder-card` atau custom drag untuk swipe
- OpenAI GPT-4o-mini untuk rekomendasi
- Google Maps API untuk foto lokasi
- shadcn Calendar untuk date range picker