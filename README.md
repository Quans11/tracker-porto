# 📈 Portfolio Tracker — Vercel + Supabase

Pelacak portofolio investasi (saham, kripto, reksa dana, obligasi, emas, dll).
Multi-user dengan login, CRUD penuh, dan grafik alokasi.

**Arsitektur:** Frontend statis (HTML/CSS/JS) di **Vercel** · Database & Auth di **Supabase** (PostgreSQL).
Tanpa server PHP — browser berbicara langsung ke Supabase, dan **Row Level Security** menjamin tiap
pengguna hanya bisa mengakses datanya sendiri.

```
portfolio-vercel/
├── index.html          # seluruh aplikasi (auth + dashboard + modal CRUD)
├── css/style.css
├── js/
│   ├── config.js       # URL + publishable key Supabase (sudah terisi)
│   └── app.js          # auth, CRUD, ringkasan, grafik
├── vercel.json
└── README.md
```

> Database sudah disiapkan otomatis: tabel `investments` + Row Level Security sudah aktif
> di project Supabase Anda (`cfcjtznaycjiiaxbxzfq`). Tidak perlu impor SQL apa pun.

---

## ✅ Langkah 1 — Aktifkan login email (sekali saja)

Agar pendaftaran langsung bisa dipakai tanpa menunggu email konfirmasi:

1. Buka **Supabase Dashboard** → project Anda → **Authentication → Sign In / Providers → Email**.
2. Matikan **"Confirm email"** (untuk uji coba cepat) lalu **Save**.
   - Jika ingin produksi lebih aman, biarkan menyala. Pengguna harus klik link di email
     sebelum bisa masuk (aplikasi sudah menampilkan pesan untuk ini).

---

## 🖥️ Langkah 2 — Coba di komputer (lokal)

File ini murni statis, jadi cukup jalankan server statis sederhana:

```bash
cd portfolio-vercel
npx serve .          # atau: python -m http.server 8000
```

Buka alamat yang muncul (mis. `http://localhost:3000`) → **Daftar** → mulai pakai.
(Membuka `index.html` langsung lewat `file://` juga bisa, tapi server lebih dianjurkan.)

---

## 🌐 Langkah 3 — Deploy ke Vercel (publik)

### Cara A — lewat GitHub (paling mudah, auto-deploy)
1. Unggah folder ini ke sebuah repository GitHub.
2. Buka https://vercel.com → **Add New → Project → Import** repo tersebut.
3. *Framework Preset:* **Other**. *Root Directory:* folder ini. Build command kosong
   (ini situs statis). Klik **Deploy**.
4. Selesai — Anda dapat URL publik seperti `https://portfolio-anda.vercel.app`.

### Cara B — lewat Vercel CLI
```bash
npm i -g vercel
cd portfolio-vercel
vercel            # ikuti prompt, pilih scope & nama project
vercel --prod     # untuk deploy ke domain produksi
```

---

## 🔑 Langkah 4 — Daftarkan URL Vercel di Supabase

Agar autentikasi berfungsi mulus di domain publik:

1. Supabase Dashboard → **Authentication → URL Configuration**.
2. **Site URL:** isi URL Vercel Anda (mis. `https://portfolio-anda.vercel.app`).
3. **Redirect URLs:** tambahkan URL yang sama.
4. **Save.**

---

## 🔐 Keamanan

- `config.js` berisi **publishable/anon key** — memang dirancang untuk publik di browser.
  Yang melindungi data adalah **Row Level Security** di Supabase: setiap query otomatis
  difilter `auth.uid() = user_id`, jadi pengguna mustahil melihat data milik orang lain.
- Password dikelola & di-hash oleh Supabase Auth (tidak pernah menyentuh kode kita).
- Input divalidasi di sisi database (CHECK constraint pada jumlah, harga, jenis aset).

---

## ➕ Pengembangan lanjutan (opsional)

- Harga live otomatis (API saham/kripto) via Supabase Edge Function.
- Riwayat transaksi & grafik nilai dari waktu ke waktu.
- Login Google/GitHub (tinggal aktifkan provider di Supabase).

Beri tahu saya jika ingin salah satu ditambahkan.
