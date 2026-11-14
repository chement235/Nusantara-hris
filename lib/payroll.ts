import { dateRange, monthRange, todayISO } from "./format";

export type PayrollEmployee = {
  base_salary: number;
  allowance_transport: number;
  allowance_meal: number;
  marital_status: string;
};

export type PayslipCalc = {
  base_salary: number;
  allowance_transport: number;
  allowance_meal: number;
  overtime: number;
  gross: number;
  /** Dasar upah untuk iuran BPJS (gaji pokok + tunjangan tetap). */
  bpjs_base: number;
  bpjs_kes: number;
  bpjs_jht: number;
  bpjs_jp: number;
  bpjs_jkk: number;
  bpjs_jkm: number;
  employer_kes: number;
  employer_jht: number;
  employer_jp: number;
  ter_category: "A" | "B" | "C";
  ter_rate: number;
  pph21: number;
  pph21_annual: number;
  alpha_deduction: number;
  other_deduction: number;
  total_deduction: number;
  net: number;
};

export const PTKP: Record<string, number> = {
  "TK/0": 54_000_000,
  "TK/1": 58_500_000,
  "TK/2": 63_000_000,
  "TK/3": 67_500_000,
  "K/0": 58_500_000,
  "K/1": 63_000_000,
  "K/2": 67_500_000,
  "K/3": 72_000_000,
};

/**
 * Tarif BPJS untuk pekerja penerima upah (PPU) swasta, berlaku 2026:
 * - JKN: 5% (4% pemberi kerja, 1% pekerja), batas upah Rp12.000.000 (Perpres 59/2024)
 * - JHT: 5,7% (3,7% pemberi kerja, 2% pekerja), tanpa batas upah (PP 46/2015)
 * - JP : 3% (2% pemberi kerja, 1% pekerja), batas upah Rp11.086.300 sejak 1 Mar 2026
 *        (PP 45/2015 jo. SE BPJS Ketenagakerjaan B/1226/022026)
 * - JKK: 0,24% (risiko sangat rendah, contoh perusahaan jasa/IT), dibayar pemberi kerja
 * - JKM: 0,3%, dibayar pemberi kerja
 */
export const BPJS = {
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
} as const;

/** Biaya jabatan 5% dari bruto setahun, maksimal Rp6.000.000 (PMK 168/2023). */
export const BIAYA_JABATAN_RATE = 0.05;
export const BIAYA_JABATAN_CAP = 6_000_000;

/** Pembagi potongan hari tanpa keterangan (praktik umum: 22 hari kerja). */
export const ALPHA_DIVISOR = 22;

type TerBracket = readonly [upperBound: number, rate: number];

/** TER bulanan kategori A: PTKP TK/0, TK/1, K/0 (PP 58/2023). */
const TER_A: readonly TerBracket[] = [
  [5_400_000, 0],
  [5_650_000, 0.0025],
  [5_950_000, 0.005],
  [6_300_000, 0.0075],
  [6_750_000, 0.01],
  [7_500_000, 0.0125],
  [8_550_000, 0.015],
  [9_650_000, 0.0175],
  [10_050_000, 0.02],
  [10_350_000, 0.0225],
  [10_700_000, 0.025],
  [11_050_000, 0.03],
  [11_600_000, 0.035],
  [12_500_000, 0.04],
  [13_750_000, 0.05],
  [15_100_000, 0.06],
  [16_950_000, 0.07],
  [19_750_000, 0.08],
  [24_150_000, 0.09],
  [26_450_000, 0.1],
  [28_000_000, 0.11],
  [30_050_000, 0.12],
  [32_400_000, 0.13],
  [35_400_000, 0.14],
  [39_100_000, 0.15],
  [43_850_000, 0.16],
  [47_800_000, 0.17],
  [51_400_000, 0.18],
  [56_300_000, 0.19],
  [62_200_000, 0.2],
  [68_600_000, 0.21],
  [77_500_000, 0.22],
  [89_000_000, 0.23],
  [103_000_000, 0.24],
  [125_000_000, 0.25],
  [157_000_000, 0.26],
  [206_000_000, 0.27],
  [337_000_000, 0.28],
  [454_000_000, 0.29],
  [550_000_000, 0.3],
  [695_000_000, 0.31],
  [910_000_000, 0.32],
  [1_400_000_000, 0.33],
  [Number.POSITIVE_INFINITY, 0.34],
];

/** TER bulanan kategori B: PTKP TK/2, TK/3, K/1, K/2. */
const TER_B: readonly TerBracket[] = [
  [6_200_000, 0],
  [6_500_000, 0.0025],
  [6_850_000, 0.005],
  [7_300_000, 0.0075],
  [9_200_000, 0.01],
  [10_750_000, 0.015],
  [11_250_000, 0.02],
  [11_600_000, 0.025],
  [12_600_000, 0.03],
  [13_600_000, 0.04],
  [14_950_000, 0.05],
  [16_400_000, 0.06],
  [18_450_000, 0.07],
  [21_850_000, 0.08],
  [26_000_000, 0.09],
  [27_700_000, 0.1],
  [29_350_000, 0.11],
  [31_450_000, 0.12],
  [33_950_000, 0.13],
  [37_100_000, 0.14],
  [41_100_000, 0.15],
  [45_800_000, 0.16],
  [49_500_000, 0.17],
  [53_800_000, 0.18],
  [58_500_000, 0.19],
  [64_000_000, 0.2],
  [71_000_000, 0.21],
  [80_000_000, 0.22],
  [93_000_000, 0.23],
  [109_000_000, 0.24],
  [129_000_000, 0.25],
  [163_000_000, 0.26],
  [211_000_000, 0.27],
  [374_000_000, 0.28],
  [459_000_000, 0.29],
  [555_000_000, 0.3],
  [704_000_000, 0.31],
  [957_000_000, 0.32],
  [1_405_000_000, 0.33],
  [Number.POSITIVE_INFINITY, 0.34],
];

/** TER bulanan kategori C: PTKP K/3. */
const TER_C: readonly TerBracket[] = [
  [6_600_000, 0],
  [6_950_000, 0.0025],
  [7_350_000, 0.005],
  [7_800_000, 0.0075],
  [8_850_000, 0.01],
  [9_800_000, 0.0125],
  [10_950_000, 0.015],
  [11_200_000, 0.0175],
  [12_050_000, 0.02],
  [12_950_000, 0.03],
  [14_150_000, 0.04],
  [15_550_000, 0.05],
  [17_050_000, 0.06],
  [19_500_000, 0.07],
  [22_700_000, 0.08],
  [26_600_000, 0.09],
  [28_100_000, 0.1],
  [30_100_000, 0.11],
  [32_600_000, 0.12],
  [35_400_000, 0.13],
  [38_900_000, 0.14],
  [43_000_000, 0.15],
  [47_400_000, 0.16],
  [51_200_000, 0.17],
  [55_800_000, 0.18],
  [60_400_000, 0.19],
  [66_700_000, 0.2],
  [74_500_000, 0.21],
  [83_200_000, 0.22],
  [95_600_000, 0.23],
  [110_000_000, 0.24],
  [134_000_000, 0.25],
  [169_000_000, 0.26],
  [221_000_000, 0.27],
  [390_000_000, 0.28],
  [463_000_000, 0.29],
  [561_000_000, 0.3],
  [709_000_000, 0.31],
  [965_000_000, 0.32],
  [1_419_000_000, 0.33],
  [Number.POSITIVE_INFINITY, 0.34],
];

export function terCategory(ptkp: string): "A" | "B" | "C" {
  if (["TK/2", "TK/3", "K/1", "K/2"].includes(ptkp)) return "B";
  if (ptkp === "K/3") return "C";
  return "A";
}

function lookupTer(table: readonly TerBracket[], grossMonthly: number): number {
  for (const [upperBound, rate] of table) {
    if (grossMonthly <= upperBound) return rate;
  }
  return 0.34;
}

/** Tarif Efektif Rata-rata bulanan sesuai PTKP dan penghasilan bruto. */
export function terRate(ptkp: string, grossMonthly: number): number {
  const category = terCategory(ptkp);
  const table = category === "A" ? TER_A : category === "B" ? TER_B : TER_C;
  return lookupTer(table, Math.max(0, grossMonthly));
}

/** PPh 21 setahun dengan tarif progresif Pasal 17 ayat (1) huruf a UU HPP. */
export function progressiveTax(annualTaxable: number): number {
  const brackets = [
    { limit: 60_000_000, rate: 0.05 },
    { limit: 250_000_000, rate: 0.15 },
    { limit: 500_000_000, rate: 0.25 },
    { limit: 5_000_000_000, rate: 0.3 },
    { limit: Number.POSITIVE_INFINITY, rate: 0.35 },
  ];
  let remaining = Math.max(0, annualTaxable);
  let previous = 0;
  let tax = 0;
  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, bracket.limit - previous);
    tax += slice * bracket.rate;
    remaining -= slice;
    previous = bracket.limit;
  }
  return tax;
}

export type PayslipOptions = {
  presentDays: number;
  alphaDays: number;
  /** Periode YYYY-MM; dipakai untuk rekonsiliasi Desember (masa pajak terakhir). */
  period?: string;
  /** PPh 21 yang sudah dipotong Januari–November pada tahun yang sama. */
  priorWithheld?: number;
};

/**
 * Payroll bulanan sesuai aturan 2026:
 * - iuran BPJS dihitung dari upah (gaji pokok + tunjangan tetap) dengan plafon JKN/JP
 * - PPh 21 Jan–Nov memakai TER bulanan (PP 58/2023)
 * - PPh 21 Desember memakai penghitungan setahun Pasal 17 dikurangi potongan sebelumnya
 */
export function computePayslip(
  employee: PayrollEmployee,
  options: PayslipOptions,
): PayslipCalc {
  const base = employee.base_salary;
  const transport = employee.allowance_transport;
  const meal = employee.allowance_meal;
  const overtime = 0;
  const upah = base + transport + meal;
  const gross = upah + overtime;

  const kesBase = Math.min(upah, BPJS.kesCap);
  const jpBase = Math.min(upah, BPJS.jpCap);

  const bpjsKes = Math.round(kesBase * BPJS.kesEmployeeRate);
  const bpjsJht = Math.round(upah * BPJS.jhtEmployeeRate);
  const bpjsJp = Math.round(jpBase * BPJS.jpEmployeeRate);
  const bpjsJkk = Math.round(upah * BPJS.jkkRate);
  const bpjsJkm = Math.round(upah * BPJS.jkmRate);

  const employerKes = Math.round(kesBase * BPJS.kesEmployerRate);
  const employerJht = Math.round(upah * BPJS.jhtEmployerRate);
  const employerJp = Math.round(jpBase * BPJS.jpEmployerRate);

  const alphaDeduction = Math.round((upah / ALPHA_DIVISOR) * Math.max(0, options.alphaDays));
  const otherDeduction = 0;

  const ptkp = PTKP[employee.marital_status] ?? PTKP["TK/0"];
  const category = terCategory(employee.marital_status);
  const rate = terRate(employee.marital_status, gross);

  // Estimasi setahun dengan asumsi penghasilan bulanan sama (dipakai untuk Desember).
  const annualGross = gross * 12;
  const biayaJabatan = Math.min(annualGross * BIAYA_JABATAN_RATE, BIAYA_JABATAN_CAP);
  const annualPension = (bpjsJht + bpjsJp) * 12;
  const annualTaxable = Math.max(0, annualGross - biayaJabatan - annualPension - ptkp);
  const annualTax = Math.round(progressiveTax(annualTaxable));

  const isLastTaxMonth = options.period?.slice(5, 7) === "12";
  const pph21 = isLastTaxMonth
    ? Math.max(0, annualTax - Math.max(0, Math.round(options.priorWithheld ?? 0)))
    : Math.round(gross * rate);

  const totalDeduction =
    bpjsKes + bpjsJht + bpjsJp + pph21 + alphaDeduction + otherDeduction;
  const net = gross - totalDeduction;

  return {
    base_salary: base,
    allowance_transport: transport,
    allowance_meal: meal,
    overtime,
    gross,
    bpjs_base: upah,
    bpjs_kes: bpjsKes,
    bpjs_jht: bpjsJht,
    bpjs_jp: bpjsJp,
    bpjs_jkk: bpjsJkk,
    bpjs_jkm: bpjsJkm,
    employer_kes: employerKes,
    employer_jht: employerJht,
    employer_jp: employerJp,
    ter_category: category,
    ter_rate: rate,
    pph21,
    pph21_annual: annualTax,
    alpha_deduction: alphaDeduction,
    other_deduction: otherDeduction,
    total_deduction: totalDeduction,
    net,
  };
}

export function periodWorkdays(period: string): string[] {
  const { start, end } = monthRange(period);
  const today = todayISO();
  const last = end < today ? end : today;
  if (last < start) return [];
  return dateRange(start, last).filter((date) => {
    const day = new Date(`${date}T00:00:00Z`).getUTCDay();
    return day !== 0 && day !== 6;
  });
}
