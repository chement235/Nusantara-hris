import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computePayslip,
  monthsWorked,
  progressiveTax,
  terCategory,
  terRate,
  thrFor,
  annualTaxableIncome,
} from "../lib/payroll";

const dewi = {
  base_salary: 15_000_000,
  allowance_transport: 1_000_000,
  allowance_meal: 500_000,
  marital_status: "TK/0",
};

describe("payroll 2026 — BPJS & TER", () => {
  it("menghitung iuran pekerja sesuai tarif 2026", () => {
    const calc = computePayslip(dewi, { presentDays: 22, alphaDays: 0, period: "2026-11" });
    assert.equal(calc.bpjs_base, 16_500_000);
    assert.equal(calc.bpjs_kes, 120_000); // JKN 1% dari plafon 12jt
    assert.equal(calc.bpjs_jht, 330_000); // JHT 2% dari upah
    assert.equal(calc.bpjs_jp, 110_863); // JP 1% dari plafon 11.086.300
    assert.equal(calc.pph21, 1_155_000); // TER A 7% dari bruto
  });

  it("membatasi dasar upah JKN dan JP pada plafon", () => {
    const calc = computePayslip(
      { base_salary: 32_000_000, allowance_transport: 0, allowance_meal: 0, marital_status: "K/2" },
      { presentDays: 22, alphaDays: 0, period: "2026-11" },
    );
    assert.equal(calc.bpjs_kes, 120_000); // plafon 12jt
    assert.equal(calc.bpjs_jp, 110_863); // plafon 11.086.300
  });

  it("memetakan kategori TER sesuai PTKP", () => {
    assert.equal(terCategory("TK/0"), "A");
    assert.equal(terCategory("K/0"), "A");
    assert.equal(terCategory("TK/2"), "B");
    assert.equal(terCategory("K/1"), "B");
    assert.equal(terCategory("K/3"), "C");
  });

  it("mengambil tarif TER untuk kategori A", () => {
    assert.equal(terRate("TK/0", 16_500_000), 0.07);
  });
});

describe("payroll 2026 — rekonsiliasi & kasus khusus", () => {
  it("rekonsiliasi Desember memakai gross aktual kumulatif", () => {
    const nov = computePayslip(dewi, { presentDays: 22, alphaDays: 0, period: "2026-11" });
    const ytdGross = 11 * (dewi.base_salary + dewi.allowance_transport + dewi.allowance_meal);
    const ytdPension = 11 * (nov.bpjs_jht + nov.bpjs_jp);
    const dec = computePayslip(dewi, {
      presentDays: 22,
      alphaDays: 0,
      period: "2026-12",
      priorWithheld: 11 * nov.pph21,
      ytdGross,
      ytdPension,
      monthsEmployed: 12,
    });
    // PPh Desember = PPh setahun aktual − potongan Jan–Nov
    assert.ok(dec.pph21_annual > 0);
    assert.ok(dec.pph21 >= 0);
    assert.equal(dec.pph21, dec.pph21_annual - 11 * nov.pph21);
  });

  it("karyawan masuk tengah tahun diprorata dari bulan aktif", () => {
    const mid = computePayslip(dewi, {
      presentDays: 22,
      alphaDays: 0,
      period: "2026-12",
      priorWithheld: 0,
      monthsEmployed: 6,
    });
    const full = computePayslip(dewi, {
      presentDays: 22,
      alphaDays: 0,
      period: "2026-12",
      priorWithheld: 0,
      monthsEmployed: 12,
    });
    assert.ok(mid.pph21_annual < full.pph21_annual);
  });
});

describe("THR keagamaan", () => {
  const employee = {
    base_salary: 12_000_000,
    allowance_transport: 1_000_000,
    allowance_meal: 500_000,
    join_date: "2024-05-01",
  };

  it("12 bulan atau lebih menerima satu bulan upah penuh", () => {
    const calc = thrFor(employee, "2026-11-16");
    assert.equal(calc.monthly_wage, 13_500_000);
    assert.equal(calc.prorated, false);
    assert.equal(calc.amount, 13_500_000);
  });

  it("masa kerja kurang dari 12 bulan diprorata", () => {
    const calc = thrFor({ ...employee, join_date: "2026-06-01" }, "2026-11-16");
    assert.equal(calc.months_worked, 6);
    assert.equal(calc.prorated, true);
    assert.equal(calc.amount, Math.round((13_500_000 * 6) / 12));
  });

  it("menghitung bulan kerja termasuk bulan mulai", () => {
    assert.equal(monthsWorked("2026-11-10", "2026-11-16"), 1);
    assert.equal(monthsWorked("2026-01-15", "2026-11-16"), 11);
  });
});

describe("payroll 2026 — PPh 21 progresif", () => {
  it("menghitung penghasilan kena pajak setahun", () => {
    const taxable = annualTaxableIncome("TK/0", 198_000_000, 5_290_356);
    assert.ok(taxable > 0);
  });

  it("tarif progresif Pasal 17 (5% untuk lapisan pertama)", () => {
    assert.equal(progressiveTax(50_000_000), 2_500_000);
  });
});
