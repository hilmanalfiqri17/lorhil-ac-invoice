# LORHIL AC Online V37

Versi V37 menghubungkan web invoice dengan Supabase Edge Function:

`send-invoice-whatsapp`

## Fungsi baru

Tombol **Kirim Invoice Otomatis** akan:

1. menyimpan nota;
2. membuat PDF invoice;
3. mengirim PDF ke Supabase Edge Function;
4. mengunggah PDF ke WhatsApp Cloud API;
5. mengirim template `nota_lorhil` ke nomor pelanggan.

## Syarat

Edge Function `send-invoice-whatsapp` harus sudah berhasil dideploy.

Secrets berikut harus tersedia di Supabase:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_TEMPLATE_NAME`
- `WHATSAPP_TEMPLATE_LANGUAGE`

Template Meta harus menggunakan header dokumen dan dua variabel isi:

- `{{1}}` nama pelanggan
- `{{2}}` nomor invoice

## Upload GitHub

Ekstrak ZIP, lalu unggah seluruh isi folder ke root repository GitHub.

`index.html` harus berada langsung di root.

Tidak perlu menjalankan SQL baru apabila database V36 sudah berfungsi.

Setelah deploy, hapus cache situs atau data PWA satu kali agar V37 termuat.
