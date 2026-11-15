/**
 * Parameter payroll & pajak yang dapat di-tuning tanpa mengubah kode.
 *
 * Nilai default mengikuti peraturan 2026. Nilai dapat diganti lewat environment
 * variable (mis. SITES secrets / .env) untuk menyesuaikan kebijakan perusahaan
 * atau pembaruan regulasi — tanpa mengubah struktur perhitungan.
 *
 * Rumus/plafon JKN mengikuti Perpres 59/2024 (5%, plafon Rp12 juta).
 * JHT mengikuti PP 46/2015 (5,7%). JP mengikuti PP 45/2015 jo. SE BPJS
 * Ketenagakerjaan B/1226/022026 (3%, plafon Rp11.086.300 sejak 1 Mar 2026).
 */

export type PayrollConfig = {
  /** JKN: tarif pekerja (1%). */
  kesEmployeeRate: number;
  /** JKN: tarif pemberi kerja (4%). */
  kesEmployerRate: number;
  /** JKN: batas upah bulanan. */
  kesCap: number;
  /** JHT: tarif pekerja (2%). */
  jhtEmployeeRate: number;
  /** JHT: tarif pemberi kerja (3,7%). */
  jhtEmployerRate: number;
  /** JP: tarif pekerja (1%). */
  jpEmployeeRate: number;
  /** JP: tarif pemberi kerja (2%). */
  jpEmployerRate: number;
  /** JP: batas upah bulanan. */
  jpCap: number;
  /** JKK: risiko sangat rendah (0,24%). */
  jkkRate: number;
  /** JKM: 0,3%. */
  jkmRate: number;
  /** Biaya jabatan: 5% dari bruto setahun. */
  biayaJabatanRate: number;
  /** Biaya jabatan: maksimal setahun. */
  biayaJabatanCap: number;
  /** Pembagi potongan hari tanpa keterangan (praktik umum 22 hari kerja). */
  alphaDivisor: number;
  /** Batas ambang untuk membulatkan PPh 21 (0 = selalu dibulatkan penuh). */
  roundingThreshold: number;
};

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return fallback;
  return value;
}

const DEFAULTS: PayrollConfig = {
  kesEmployeeRate: 0.01,
  kesEmployerRate: 0.04,
  kesCap: 12_000_000,
  jhtEmployeeRate: 0.02,
  jhtEmployerRate: 0.037,
  jpEmployeeRate: 0.01,
  jpEmployerRate: 0.02,
  jpCap: 11_086_300,
  jkkRate: 0.0024,
  jkmRate: 0.003,
  biayaJabatanRate: 0.05,
  biayaJabatanCap: 6_000_000,
  alphaDivisor: 22,
  roundingThreshold: 0,
};

export function payrollConfig(): PayrollConfig {
  return {
    kesEmployeeRate: envNumber("PAYROLL_JKN_EMPLOYEE_RATE", DEFAULTS.kesEmployeeRate),
    kesEmployerRate: envNumber("PAYROLL_JKN_EMPLOYER_RATE", DEFAULTS.kesEmployerRate),
    kesCap: envNumber("PAYROLL_JKN_CAP", DEFAULTS.kesCap),
    jhtEmployeeRate: envNumber("PAYROLL_JHT_EMPLOYEE_RATE", DEFAULTS.jhtEmployeeRate),
    jhtEmployerRate: envNumber("PAYROLL_JHT_EMPLOYER_RATE", DEFAULTS.jhtEmployerRate),
    jpEmployeeRate: envNumber("PAYROLL_JP_EMPLOYEE_RATE", DEFAULTS.jpEmployeeRate),
    jpEmployerRate: envNumber("PAYROLL_JP_EMPLOYER_RATE", DEFAULTS.jpEmployerRate),
    jpCap: envNumber("PAYROLL_JP_CAP", DEFAULTS.jpCap),
    jkkRate: envNumber("PAYROLL_JKK_RATE", DEFAULTS.jkkRate),
    jkmRate: envNumber("PAYROLL_JKM_RATE", DEFAULTS.jkmRate),
    biayaJabatanRate: envNumber("PAYROLL_BIAYA_JABATAN_RATE", DEFAULTS.biayaJabatanRate),
    biayaJabatanCap: envNumber("PAYROLL_BIAYA_JABATAN_CAP", DEFAULTS.biayaJabatanCap),
    alphaDivisor: envNumber("PAYROLL_ALPHA_DIVISOR", DEFAULTS.alphaDivisor) || DEFAULTS.alphaDivisor,
    roundingThreshold: envNumber("PAYROLL_ROUNDING_THRESHOLD", DEFAULTS.roundingThreshold),
  };
}
