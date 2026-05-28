
# Rencana: Itinerary Calendar + Game-style Questionnaire

## 1. Halaman Itinerary baru (`src/pages/Itinerary.tsx`)

Layout dari atas ke bawah:

```text
┌────────────────────────────────────────┐
│  Header: Nama trip + Simpan/Hapus      │
│  Budget summary                         │
├────────────────────────────────────────┤
│  KALENDER BULANAN (range mode)         │
│  - tanggal dengan itinerary = badge    │
│  - klik tanggal → buka detail hari itu │
│  - drag range → highlight              │
├────────────────────────────────────────┤
│  [ Generate Itinerary ] (muncul setelah│
│   range dipilih)                        │
├────────────────────────────────────────┤
│  Detail hari terpilih (cards aktivitas)│
│  - swipeable / klik card → detail      │
└────────────────────────────────────────┘
```

- Hapus `DateStrip` (geser horizontal), ganti dengan komponen `MonthCalendar` baru yang membungkus shadcn `Calendar` mode `range`.
- Tanggal yang sudah punya itinerary diberi `modifier` (titik/badge ungu) dan tetap ditampilkan setelah generate.
- Saat user klik 1 tanggal yang sudah ada itinerary → langsung tampil cards hari itu.
- Saat user pilih range → tombol "Generate Itinerary" aktif.

## 2. Konflik tanggal sebelum generate

Sebelum memanggil edge function, cek `itinerary_days` yang sudah ada di rentang tersebut. Jika ada:
- Tampilkan dialog: "Tanggal X, Y sudah memiliki itinerary. Mau diganti atau dilewati?"
- Pilihan: **Ganti** (hapus lalu generate ulang) / **Lewati** (skip tanggal tsb saat generate).

## 3. Kuesioner game-style (`ItineraryQuestionnaireGame.tsx` baru)

Modal/overlay setelah klik "Generate Itinerary". Setiap pertanyaan = 1 hover-box di bawah layar, dengan karakter Pixar-style di atasnya (separuh badan/kaki ketutup box). Saat ganti step, karakter slide keluar ke kanan + karakter baru slide masuk.

Urutan step + karakter (sesuai urutan attachment):

| Step | Karakter | Pertanyaan |
|---|---|---|
| 1 (box A) | `Girly_4.png` | (1) Tujuan wisata + (1b) Durasi jam aktif harian |
| 2 | `Girly_5.png` | (3) Tujuan utama perjalanan (multi-select + lainnya) |
| 3 | `Girly_6.png` | (4) Dengan siapa bepergian (single + lainnya) |
| 4 | `Girly_7.png` | (5) Gaya perjalanan (single + lainnya) |
| 5 | `Girly_8.png` | (6) Budget (tier) |

Detail:
- 1b: pilihan jam preset (`06.30-22.00`, `08.00-21.00`, `10.00-23.00`) + "Lainnya" → 2 time-picker dropdown (start/end), bukan ketik bebas.
- Pertanyaan multi-select (#3) pakai checkbox list.
- Setelah step terakhir → langsung trigger generate.

Asset karakter dicopy ke `src/assets/characters/`.

## 4. Edge function `generate-itinerary`

- Hapus pemanggilan Google Maps Places & Photos.
- Input baru: `destination, daily_hours_start, daily_hours_end, travel_purpose[], travel_companion, travel_style, budget_tier, dates[]` (array tanggal yang perlu di-generate, hasil filter konflik).
- Prompt OpenAI minta JSON: untuk setiap tanggal → list aktivitas mulai dari `daily_hours_start` sampai `daily_hours_end`, dengan `location` (nama tempat untuk dicari di Wikipedia), `activity`, `description`, `estimated_cost`, `status`.
- Untuk setiap item, panggil Wikipedia/Wikimedia Commons API (`action=query&prop=pageimages` → `original`/`thumbnail`) untuk ambil `image_url`. Reuse helper dari `place-details` / `explore-places` bila ada.

## 5. Database

Tambah kolom di `itinerary_preferences`:
- `daily_hours_start text`, `daily_hours_end text`
- `travel_purposes text[]` (multi-select); kolom `travel_purpose` lama tetap untuk backward compat (isi joined string)
- `budget_tier text` (label budget yang dipilih)

Simpan jawaban kuesioner setiap kali generate (upsert per `itinerary_id`).

## 6. Penyimpanan & Tampilan

- Hasil generate dimasukkan ke `itinerary_days` + `itinerary_day_items` seperti sekarang, dengan `trip_date` sesuai tanggal.
- Tanggal yang sudah ada (jika user pilih "lewati") tidak disentuh.
- Kalender re-fetch → titik penanda muncul.
- Klik tanggal → tampil cards; setiap card klik buka `ActivityDetailDialog` dengan gambar Wikipedia.

## 7. File yang berubah

Baru:
- `src/components/itinerary/MonthCalendar.tsx`
- `src/components/itinerary/QuestionnaireGame.tsx`
- `src/components/itinerary/ConflictDialog.tsx`
- `src/assets/characters/char-1..5.png` (copy dari uploads)

Edit:
- `src/pages/Itinerary.tsx` — alur baru
- `src/components/ItineraryEditor.tsx` — ganti `DateStrip` → `MonthCalendar`, tambah tombol generate
- `supabase/functions/generate-itinerary/index.ts` — hapus Google, pakai Wikipedia + OpenAI, terima `dates[]`
- Migration: tambah kolom preferences

Tidak diubah:
- `ItineraryChatbot`, `ActivityCard`, `ActivityDetailDialog`, fitur feedback.

## Catatan teknis

- Wikipedia API: `https://id.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=<location>&origin=*` (no key). Fallback ke `en.wikipedia.org` jika kosong.
- Range calendar: `Calendar mode="range"` dari shadcn.
- Karakter slide animation: framer-motion sudah ada di project (cek), kalau tidak pakai CSS transition `translate-x`.

Konfirmasi sebelum saya implement.
