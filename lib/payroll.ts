import { monthRange, todayISO, dateRange } from "./format";

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
  bpjs_kes: number;
  bpjs_jht: number;
  bpjs_jp: number;
  bpjs_jkk: number;
  bpjs_jkm: number;
  pph21: number;
  alpha_deduction: number;
  other_deduction: number;
  total_deduction: number;
  net: number;
};

const PTKP: Record<string, number> = {
  "TK/0": 54_000_000,
  "TK/1": 58_500_000,
  "TK/2": 63_000_000,
  "TK/3": 67_500_000,
  "K/0": 58_500_000,
  "K/1": 63_000_000,
  "K/2": 67_500_000,
  "K/3": 72_000_000,
};

const JP_CAP = 10_000_000;

function progressiveTax(annualTaxable: number): number {
  const brackets = [
    { limit: 60_000_000, rate: 0.05 },
    { limit: 250_000_000, rate: 0.15 },
    { limit: 500_000_000, rate: 0.25 },
    { limit: 5_000_000_000, rate: 0.3 },
    { limit: Number.POSITIVE_INFINITY, rate: 0.35 },
  ];
  let remaining = annualTaxable;
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

/**
 * Simplified Indonesian payroll calculation: BPJS Kesehatan/JHT/JP employee
 * contributions, employer contributions for cost reporting, and PPh 21
 * progressive annual tax (PTKP by marital status).
 */
export function computePayslip(
  employee: PayrollEmployee,
  options: { presentDays: number; alphaDays: number },
): PayslipCalc {
  const base = employee.base_salary;
  const transport = employee.allowance_transport;
  const meal = employee.allowance_meal;
  const overtime = 0;
  const gross = base + transport + meal + overtime;

  const bpjsKes = Math.round(base * 0.01);
  const bpjsJht = Math.round(base * 0.02);
  const bpjsJp = Math.round(Math.min(base, JP_CAP) * 0.01);
  const bpjsJkk = Math.round(base * 0.0024);
  const bpjsJkm = Math.round(base * 0.003);

  const alphaDeduction = Math.round((base / 22) * Math.max(0, options.alphaDays));
  const otherDeduction = 0;

  const annualGross = gross * 12;
  const biayaJabatan = Math.min(annualGross * 0.05, 6_000_000);
  const ptkp = PTKP[employee.marital_status] ?? PTKP["TK/0"];
  const annualDeductions = (bpjsJht + bpjsJp) * 12;
  const taxable = Math.max(0, annualGross - biayaJabatan - annualDeductions - ptkp);
  const pph21 = Math.round(progressiveTax(taxable) / 12);

  const totalDeduction = bpjsKes + bpjsJht + bpjsJp + pph21 + alphaDeduction + otherDeduction;
  const net = gross - totalDeduction;

  return {
    base_salary: base,
    allowance_transport: transport,
    allowance_meal: meal,
    overtime,
    gross,
    bpjs_kes: bpjsKes,
    bpjs_jht: bpjsJht,
    bpjs_jp: bpjsJp,
    bpjs_jkk: bpjsJkk,
    bpjs_jkm: bpjsJkm,
    pph21,
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
