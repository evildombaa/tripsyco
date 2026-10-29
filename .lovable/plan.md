# Rencana: Beranda Feed + Unggah + Profil & Koleksi

Navbar tetap: Beranda, Jelajahi, Itinerary, Unggah, Profil.

## 1. Beranda = Feed (route `/`, publik)

Halaman `src/pages/Feed.tsx` menggantikan Index. HeroSection, PopularDestinations, FeaturesSection dihapus dari beranda (komponen lama dihapus).

- **Feed grid**: masonry 3 kolom mobile, 4–6 kolom desktop (CSS columns). Kartu hanya foto (rasio asli, width/height disimpan, lazy loading).
- **Infinite scroll**: cursor `created_at + id`, 20 postingan per muat, via edge function `feed`. Saat semua habis, muatan ulang dimulai lagi dengan urutan acak berbeda (pass kedua berdasarkan seed, dilanjutkan pass ketiga, dst.) sehingga konten tampil ulang di bawah dengan susunan berbeda.
- **Filter kategori**: chip horizontal di atas feed (kategori dari lokasi: Alam, Kuliner, Budaya, dst. — daftar kategori diambil dari kategori tempat yang ada).
- **Pencarian**: 1 kolom pencarian (nama tempat/kota). Hasil dalam 2 bagian: Tempat (dari tabel `places` internal, yang pernah di-tag) dan Postingan (caption/deskripsi/nama lokasi). Digabung dengan filter kategori. Event `search` dicatat.
- Klik kartu → buka **Detail postingan** (route `/p/:id`, bukan menu) — route terpisah agar link share bisa dibuka.

## 2. Detail postingan (`/p/:id`)

- Foto (carousel jika >1), caption, deskripsi, pengunggah (avatar + username, klik → profil), tag lokasi, tanggal posting, jumlah pelihat, jumlah bagikan, jumlah like.
- Tag lokasi diklik → buka Google Maps (link `google.com/maps/search/?api=1&query=nama+lat,lng`) + event `open_maps`.
- Tombol: **Like** (toggle, optimistic update, hanya login), **Simpan** (bottom sheet pilih/buat koleksi, login), **Bagikan** (Web Share API / copy link `…/p/:id?via=share`), **Laporkan** (harus login, simpan ke `post_reports`).
- Jumlah pelihat = event `view_post`; jumlah bagikan = event `share` saat link `?via=share` dibuka (setiap buka link share tercatat).

## 3. Unggah (route `/upload`, login)

`src/pages/Upload.tsx`:

- Pilih 1–5 foto + preview, caption, deskripsi.
- **Tag lokasi wajib** dari search box → hasil live Google Places (Places API New, via edge function `places-search`, kunci di server, tampil 5 + scroll untuk muatan berikutnya, debounce 300ms + cache). User harus memilih dari hasil — tidak bisa mengetik bebas.
- Jika tidak cocok → tombol **"Ajukan tempat baru"**: form (nama, kategori, kota, provinsi, koordinat manual atau tombol "pakai lokasi saat ini" via GPS). Sebelum menyimpan, sistem cek tabel `places`: nama mirip atau koordinat < 200 m ditampilkan sebagai saran agar tidak duplikat. Tempat baru berstatus **pending**, postingan tetap tayang.
- **Kompres di klien** (canvas): full maks 1600px, medium 900px, thumb 400px → upload 3 file ke bucket Storage `posts` (publik). Width/height asli disimpan agar layout tidak melompat.
- Simpan sebagai **Draft** (masuk koleksi dengan tag "Draft") atau **Posting sekarang** (masuk koleksi tanpa tag). Draft bisa diposting kemudian tanpa kehilangan data.
- Pengguna lama tanpa username → dialog wajib isi username sebelum bisa unggah.

## 4. Profil & Koleksi

- **Signup wajib username** (field baru di halaman Auth, dicek unik).
- `src/pages/Profile.tsx` (`/u/:username`): halaman publik tanpa login — avatar, nama, username, jumlah postingan, grid postingan. Pemilik profil bisa: ganti foto profil (bucket `avatars`), edit data profil, dan melihat **"Koleksi saya"** (daftar koleksi buatan + semua postingannya sendiri; draft berlabel "Draft", posting tanpa label; koleksi bisa berisi draft & posting).
- Halaman detail koleksi `/koleksi/:id`: grid postingan.
- Postingan bisa masuk lebih dari satu koleksi; postingan sendiri bisa dihapus (soft delete `deleted_at`).

## 5. Event (background)

Tabel `events`: insert saja dari klien (user_id boleh null). Tipe: `view_post`, `like`, `save`, `share`, `open_maps`, `search`. Tanpa dashboard.

## 6. Database (migrasi)

- `profiles`: + `username` (unik), `avatar_url` sudah ada.
- `places`: id, google_place_id, name, category, city, province, lat, lng, status (`approved`/`pending`), created_by.
- `posts`: id, user_id, caption, description, place_id, status (`draft`/`published`), photos (jsonb: array {thumb, medium, full, width, height}), deleted_at.
- `post_likes` (unik user+post), `collections` (user_id, name), `collection_posts` (unik koleksi+post), `post_reports` (post_id, reporter_id, reason), `events` (user_id nullable, event_type, post_id, place_id).
- RLS: postingan `published` & tidak terhapus boleh dibaca siapa pun; draft hanya pemilik; like/simpan/unggah/lapor butuh login; events bisa di-insert siapa pun (anon juga), tidak bisa dibaca user.
- Semua tabel baru dengan GRANT sesuai kebijakan; bucket `posts` & `avatars` publik.

## 7. Backend (edge functions, kunci tetap di server)

- `feed`: daftar postingan (cursor + reshuffle pass), filter kategori, pencarian (tempat internal + postingan), hitungan like/pelihat/bagikan per postingan. Validasi input.
- `places-search`: pencarian lokasi Google Places API (New) — butuh sesi login, debounce di klien, hasil dibatasi, cache agar pemakaian Google hemat.
- Fungsi lama (explore-places, place-details, dll.) tidak diubah.

## 8. File

Baru: `src/pages/Feed.tsx`, `src/pages/PostDetail.tsx`, `src/pages/Upload.tsx`, `src/pages/Profile.tsx`, `src/pages/CollectionDetail.tsx`, komponen `PostCard`, `CategoryChips`, `SaveToCollectionSheet`, `PlaceSearchField`, `NewPlaceForm`, `PhotoUploader` (kompres), `UsernameGateDialog`, util kompresi gambar.
Ubah: `App.tsx` (rute baru), `Navbar.tsx` (menu Unggah & Profil), `Auth.tsx` (field username), `Index.tsx` → diganti Feed (Hero/Popular/Features dihapus), `supabase/functions/*` baru.
Tidak diubah: Jelajahi, Itinerary, chatbot, feedback.

## Catatan

- Pencarian Google Places dipakai hanya saat unggah; tiap ketikan adalah pemanggilan berbayar Google Maps — sudah dimitigasi (login, debounce, cache, batas hasil).
- Foto di storage publik memakai URL langsung (tanpa signed URL).
