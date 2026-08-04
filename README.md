# LORHIL AC Online Invoice V5

Versi ini menggunakan **Supabase** untuk login dan database online serta dapat di-deploy sebagai situs statis ke **Vercel**. Semua HP dan laptop yang login dengan akun yang sama akan melihat riwayat yang sama.

## Isi paket

- `index.html` — tampilan aplikasi
- `style.css` — desain responsif HP/laptop
- `app.js` — logika Supabase, invoice, dashboard, cetak, dan sinkronisasi
- `config.js` — tempat memasukkan Project URL dan Publishable/Anon Key
- `supabase-setup.sql` — tabel, keamanan RLS, nomor nota, dan fungsi database
- `manifest.webmanifest` + `service-worker.js` — pemasangan ke layar utama HP
- `vercel.json` — konfigurasi deployment statis
- `assets/` — tanda tangan, stempel, dan ikon

## Langkah 1 — Buat Supabase

1. Buat project baru di Supabase.
2. Buka **SQL Editor**.
3. Salin seluruh isi `supabase-setup.sql`, lalu jalankan.
4. Buka **Authentication → Users**.
5. Tambahkan satu user dengan email dan password pribadi. Aktifkan konfirmasi user bila tersedia.

## Langkah 2 — Isi config.js

Buka `config.js` lalu ganti:

```js
SUPABASE_URL: "PASTE_SUPABASE_PROJECT_URL_HERE",
SUPABASE_KEY: "PASTE_SUPABASE_PUBLISHABLE_OR_ANON_KEY_HERE"
```

dengan Project URL dan Publishable/Anon Key dari **Project Settings → API**.

Jangan pernah memakai `service_role` key di browser.

## Langkah 3 — Tes

Karena autentikasi browser sebaiknya berjalan melalui HTTP/HTTPS, jangan hanya klik ganda file HTML. Jalankan server lokal:

```bash
python -m http.server 8080
```

Kemudian buka:

```text
http://localhost:8080
```

## Langkah 4 — Upload ke Vercel

Upload seluruh isi folder ini ke Vercel sebagai static site. Setelah mendapat URL, buka dari HP dan login dengan email/password Supabase.

## Pasang di HP

Android:
- Buka melalui Chrome
- Menu tiga titik
- **Tambahkan ke layar utama** / **Install app**

iPhone:
- Buka melalui Safari
- Tombol Bagikan
- **Tambahkan ke Layar Utama**

## Cara status pembayaran

Status tidak dipilih manual:

- Dibayar Rp0 → **Belum Lunas**
- Dibayar lebih dari Rp0 tetapi kurang dari total → **DP**
- Dibayar sama dengan total → **Lunas**

## Catatan

- Nomor nota dibuat oleh database agar tidak bentrok ketika dua HP menyimpan nota.
- Aplikasi membutuhkan internet untuk login dan sinkronisasi data.
- Backup JSON tetap tersedia.
- Cetak nota tetap satu halaman A4, lengkap dengan tanda tangan dan stempel.
