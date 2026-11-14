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
- **Rekrutmen** — lowongan per departemen, pipeline pelamar (Baru → Screening → Interview →
  Penawaran → Diterima/Ditolak), penutupan lowongan otomatis saat kuota terpenuhi, dan konversi
  pelamar diterima menjadi karyawan lewat formulir yang terisi otomatis.
- **Penilaian kinerja** — siklus penilaian, lima kriteria berbobot (kualitas, produktivitas,
  kerja sama, inisiatif, disiplin), penilaian oleh atasan langsung atau HR, nilai akhir dan
  predikat, serta riwayat penilaian milik karyawan.

## Catatan

Perhitungan mengikuti tarif yang berlaku 2026: Perpres 59/2024 (JKN, batas upah Rp12 juta),
PP 46/2015 (JHT), PP 45/2015 jo. SE BPJS Ketenagakerjaan B/1226/022026 (JP, batas upah
Rp11.086.300 sejak 1 Maret 2026), PP 44/2015 (JKK/JKM), PP 58/2023 dan PMK 168/2023 (TER),
serta tarif Pasal 17 UU HPP untuk penghitungan setahun. JKK memakai kelas risiko sangat rendah
(0,24%) yang umum bagi perusahaan jasa/IT — sesuaikan bila klasifikasi risiko perusahaan berbeda.
Rekonsiliasi PPh 21 Desember mengasumsikan penghasilan bulanan setara sepanjang tahun dan
membutuhkan payroll Januari–November pada tahun yang sama. Tetap validasi dengan konsultan pajak
sebelum dipakai untuk penggajian nyata. Aplikasi ini tidak terafiliasi dengan DataOn/SunFish.
