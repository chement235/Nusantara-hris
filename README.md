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
- **Payroll** — hitung gaji per periode: gaji pokok, tunjangan, BPJS (Kesehatan, JHT, JP),
  PPh 21 progresif dengan PTKP, potongan hari tanpa keterangan; draft → finalisasi; slip gaji
  siap cetak untuk karyawan.

## Catatan

Perhitungan BPJS dan PPh 21 disederhanakan untuk demo. Untuk penggunaan produksi gunakan tarif
resmi terbaru, validasi kepatuhan, dan konsultasi dengan konsultan pajak. Aplikasi ini tidak
terafiliasi dengan DataOn/SunFish.
