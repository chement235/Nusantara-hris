# Nusantara HR — demo HRIS & Payroll

Aplikasi HRIS full-stack yang terinspirasi dari **SunFish HR (DataOn)**: satu basis data untuk
data karyawan, absensi, cuti, dan payroll. Dibangun dengan Next.js (App Router), Tailwind CSS,
dan SQLite bawaan Node (`node:sqlite`) — tanpa layanan eksternal.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:3000
```

Database demo dibuat otomatis di `data/hris.db` saat pertama kali dijalankan (27 karyawan,
riwayat absensi 45 hari, pengajuan cuti, dan payroll bulan lalu). Hapus file tersebut untuk
membuat ulang data demo.

## Akun demo (kata sandi: `demo1234`)

| Akun | Peran | Akses |
| --- | --- | --- |
| `rani.puspita@nusantara.co.id` | HR Admin | Semua modul, tambah karyawan, proses payroll, setujui semua cuti |
| `budi.santoso@nusantara.co.id` | Manager | Setujui cuti anggota tim langsung, lihat slip gaji sendiri |
| `dewi.lestari@nusantara.co.id` | Karyawan | Absen masuk/pulang, ajukan cuti, lihat slip gaji |

## Fitur

- **Dashboard** — headcount, tingkat kehadiran hari ini, cuti menunggu, payroll terakhir,
  komposisi per departemen, kontrak yang segera berakhir.
- **Data karyawan** — direktori dengan pencarian & filter, profil lengkap, saldo cuti,
  riwayat kehadiran dan cuti; formulir tambah karyawan (khusus HR).
- **Kehadiran** — absen masuk/pulang mandiri, rekap harian per departemen, ringkasan bulanan.
- **Cuti & izin** — saldo per jenis cuti, pengajuan dengan validasi saldo & tumpang tindih,
  alur persetujuan atasan/HR (cuti disetujui otomatis mengisi absensi).
- **Payroll** — perhitungan sesuai aturan 2026: JKN 5% (4% pemberi kerja + 1% pekerja) dengan
  batas upah Rp12.000.000, JHT 5,7% (3,7% + 2%), JP 3% (2% + 1%) dengan batas upah Rp11.086.300,
  JKK 0,24% + JKM 0,3% ditanggung perusahaan, PPh 21 TER bulanan (PP 58/2023) serta rekonsiliasi
  setahun pada masa pajak Desember, dan potongan alpha upah ÷ 22; draft → finalisasi; slip gaji
  siap cetak.
- **Tuning parameter payroll** — tarif & plafon BPJS, biaya jabatan, pembagi alpha, dan ambang
  pembulatan dapat diganti lewat environment variable tanpa mengubah kode (lihat tabel di bawah).
- **Rekonsiliasi & kasus khusus** — Desember memakai penghasilan bruto & iuran aktual Jan–Nov
  (bukan sekadar estimasi x12) untuk PPh 21 setahun; karyawan yang masuk tengah tahun
  diperlakukan proporsional; PTKP tetap setahun penuh sesuai ketentuan.
- **Rekrutmen** — lowongan per departemen, pipeline pelamar (Baru → Screening → Interview →
  Penawaran → Diterima/Ditolak), penutupan lowongan otomatis saat kuota terpenuhi, dan konversi
  pelamar diterima menjadi karyawan lewat formulir yang terisi otomatis.
- **Penilaian kinerja** — siklus penilaian, lima kriteria berbobot (kualitas, produktivitas,
  kerja sama, inisiatif, disiplin), penilaian oleh atasan langsung atau HR, nilai akhir dan
  predikat, serta riwayat penilaian milik karyawan.
- **Matriks talent 9-Box** — peta kinerja (nilai akhir) vs potensi (skor kriteria Inisiatif
  penilaian terakhir) dengan sembilan kuadran (Bintang, Potensi Tinggi, Inti, dst).
- **ESS — Profil Saya** — karyawan memperbarui sendiri nomor telepon, alamat, dan kontak darurat
  (tercatat di audit trail); rekening & NPWP tetap hanya dapat diubah HR.
- **MSS — Tim Saya** — rekap absensi/cuti/penilaian anggota tim dan persetujuan cuti langsung
  dari halaman tim tanpa membuka modul cuti.
- **Payroll lanjutan** — estimasi THR keagamaan (UU 13/2003 jo. Permenaker 6/2016: 1 bulan upah
  penuh untuk >= 12 bulan, proporsional untuk 1–11 bulan), rincian beban BPJS pemberi kerja,
  dan unduhan file transfer bank (CSV) per periode payroll final.
- **Organisasi** — direktori departemen dan garis pelaporan, plus halaman detail per departemen
  (anggota, jenjang, dan beban kompensasi).
- **Laporan & ekspor** — ringkasan headcount/kehadiran/cuti/payroll/talent, dengan ekspor CSV
  direktori karyawan, THR, dan file transfer payroll.

### Tuning parameter payroll (environment variable)

Semua parameter punya default sesuai regulasi 2026 dan dapat di-override tanpa mengubah kode:

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `PAYROLL_JKN_EMPLOYEE_RATE` | `0.01` | Iuran JKN pekerja (1%) |
| `PAYROLL_JKN_EMPLOYER_RATE` | `0.04` | Iuran JKN pemberi kerja (4%) |
| `PAYROLL_JKN_CAP` | `12000000` | Batas upah JKN |
| `PAYROLL_JHT_EMPLOYEE_RATE` | `0.02` | Iuran JHT pekerja (2%) |
| `PAYROLL_JHT_EMPLOYER_RATE` | `0.037` | Iuran JHT pemberi kerja (3,7%) |
| `PAYROLL_JP_EMPLOYEE_RATE` | `0.01` | Iuran JP pekerja (1%) |
| `PAYROLL_JP_EMPLOYER_RATE` | `0.02` | Iuran JP pemberi kerja (2%) |
| `PAYROLL_JP_CAP` | `11086300` | Batas upah JP (sejak 1 Mar 2026) |
| `PAYROLL_JKK_RATE` | `0.0024` | JKK risiko sangat rendah (0,24%) |
| `PAYROLL_JKM_RATE` | `0.003` | JKM (0,3%) |
| `PAYROLL_BIAYA_JABATAN_RATE` | `0.05` | Biaya jabatan 5% |
| `PAYROLL_BIAYA_JABATAN_CAP` | `6000000` | Maksimum biaya jabatan setahun |
| `PAYROLL_ALPHA_DIVISOR` | `22` | Pembagi potongan hari tanpa keterangan |
| `PAYROLL_ROUNDING_THRESHOLD` | `0` | Ambang pecahan untuk pembulatan PPh 21 (0 = rupiah penuh) |

## Validasi ahli

Perhitungan demo ini mengikuti tarif resmi 2026, tetapi **belum divalidasi oleh konsultan
pajak/akuntan publik**. Sebelum dipakai untuk penggajian nyata: (1) validasi klasifikasi risiko
JKK perusahaan, (2) konfirmasi tarif & plafon JP terkini dari BPJS Ketenagakerjaan, (3) pastikan
asumsi TER/rekonsiliasi Desember sesuai profil penghasilan karyawan (bonus, THR, lembur tidak
teratur, natura, karyawan resign/masuk tengah tahun), dan (4) setujui kebijakan pembulatan serta
dasar upah dengan penasihat pajak.

## Catatan

Perhitungan mengikuti tarif yang berlaku 2026: Perpres 59/2024 (JKN, batas upah Rp12 juta),
PP 46/2015 (JHT), PP 45/2015 jo. SE BPJS Ketenagakerjaan B/1226/022026 (JP, batas upah
Rp11.086.300 sejak 1 Maret 2026), PP 44/2015 (JKK/JKM), PP 58/2023 dan PMK 168/2023 (TER),
serta tarif Pasal 17 UU HPP untuk penghitungan setahun. JKK memakai kelas risiko sangat rendah
(0,24%) yang umum bagi perusahaan jasa/IT — sesuaikan bila klasifikasi risiko perusahaan berbeda.
Rekonsiliasi PPh 21 Desember mengasumsikan penghasilan bulanan setara sepanjang tahun dan
membutuhkan payroll Januari–November pada tahun yang sama. Tetap validasi dengan konsultan pajak
sebelum dipakai untuk penggajian nyata. Aplikasi ini tidak terafiliasi dengan DataOn/SunFish.

## Keamanan & data

- **Rahasia sesi (wajib).** Set env `SESSION_SECRET` dengan nilai acak minimal 32 byte sebelum
  menjalankan aplikasi; tanpa nilai ini autentikasi sengaja gagal (fail-closed). Untuk dev lokal
  nilai dummy dapat ditaruh di `.env.local` (tidak di-commit). Jangan pernah meng-commit secret.
- **Sesi & cookie.** Cookie sesi `HttpOnly`, `SameSite=Lax`, `Path=/`, berumur 7 hari, dan
  `Secure` + prefix `__Host-` saat `NODE_ENV=production`. Sesi memakai `jti` yang dicabut saat
  logout (`revoked_sessions`), sehingga token lama tidak dapat dipakai ulang.
- **Login & CSRF.** `POST /api/login` dan `/logout` menolak request dengan Origin/Referer yang
  tidak cocok dengan Host (lapisan di `proxy.ts` dan di route). Login memiliki rate limit & kunci
  sementara per `IP|email` (`login_attempts`).
- **PII.** Nomor telepon, rekening, NPWP, tanggal lahir, dan alamat hanya tampil utuh untuk HR,
  atasan langsung, atau pemilik data; peran lain melihat versi tersamar.
- **Header keamanan.** `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, CSP
  (`frame-ancestors 'none'`, `object-src 'none'`, `base-uri`/`form-action 'self'`),
  `Permissions-Policy`, dan HSTS di produksi.
- **Audit trail.** Aksi sensitif (login sukses/gagal/terkunci, perubahan data karyawan, keputusan
  cuti, payroll dibuat/dihitung ulang/difinalisasi, rekrutmen, penilaian kinerja) dicatat di tabel
  `audit_logs` dengan aktor, peran, target, detail, dan IP.
- **Database.** SQLite lokal di `data/hris.db` (diabaikan Git; jangan pernah meng-commit isinya).
  Data tersimpan plaintext di filesystem, jadi amankan mesin/volume dengan enkripsi disk
  (mis. LUKS/filevault/encrypted volume), batasi izin baca file DB, dan jalankan backup terenkripsi
  berkala beserta uji restore. Jangan backup langsung dari file yang sedang ditulis; gunakan
  `sqlite3 data/hris.db ".backup 'backup-YYYYMMDD.db'"` atau snapshot filesystem yang konsisten.

### Kesesuaian UU PDP

Demo ini tidak menggantikan penilaian hukum. Untuk pemakaian nyata, lengkapi paling tidak: dasar
pemrosesan data pribadi karyawan/pelamar (kontrak kerja, kewajiban hukum, dan/atau persetujuan),
pemberitahuan privasi, pemetaan masa retensi per kategori data (mis. data pelamar, absensi,
payroll, slip gaji, penilaian) berikut jadwal penghapusan/anonymisasi, prosedur pemenuhan hak
subjek data (akses, koreksi, penghapusan, pembatasan), pencatatan insiden kebocoran beserta
notifikasi ke lembaga pengawas/subjek data, serta perjanjian pemroses bila ada pihak ketiga.

## Pengujian

- **Unit test** (`npm test`) memverifikasi angka payroll 2026 (BPJS JKN/JHT/JP, plafon, kategori &
  tarif TER, rekonsiliasi Desember dari YTD aktual, prorata mid-year, PPh 21 progresif).
- **E2E Playwright** (`npm run test:e2e`) menjalankan server dev di port 3100 dengan database
  sekali-pakai (`/tmp/nusantara-hris-test.db`) lalu menguji login, RBAC per peran, penyamaran PII,
  dan alur absen masuk/pulang karyawan. Browser membutuhkan dependensi sistem Playwright
  (`npx playwright install --with-deps chromium`) — di sandbox cloud tanpa akses root, gunakan uji
  jalur nyata lewat panel browser.
- **CI** (`.github/workflows/ci.yml`) menjalankan typecheck, build, unit test, dan E2E pada
  push ke `main` dan pull request.
