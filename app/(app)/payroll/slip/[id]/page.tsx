import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { Badge } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { one } from "@/lib/db";
import { dateID, monthLabel, rupiah } from "@/lib/format";

type SlipDetail = {
  id: number;
  run_id: number;
  period: string;
  run_status: string;
  finalized_at: string | null;
  employee_id: number;
  employee_name: string;
  employee_nip: string;
  position: string;
  department_name: string;
  marital_status: string;
  bank_name: string | null;
  bank_account: string | null;
  present_days: number;
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
  bpjs_base: number;
  ter_category: "A" | "B" | "C" | null;
  ter_rate: number;
  pph21: number;
  pph21_annual: number;
  employer_kes: number;
  employer_jht: number;
  employer_jp: number;
  alpha_deduction: number;
  other_deduction: number;
  total_deduction: number;
  net: number;
};

export default async function PayslipPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const slipId = Number(id);
  if (!Number.isFinite(slipId)) notFound();

  const slip = one<SlipDetail>(
    `SELECT p.*, e.full_name AS employee_name, e.nip AS employee_nip, e.position,
            e.marital_status, e.bank_name, e.bank_account,
            d.name AS department_name, r.period, r.status AS run_status, r.finalized_at
     FROM payslips p
     JOIN employees e ON e.id = p.employee_id
     JOIN departments d ON d.id = e.department_id
     JOIN payroll_runs r ON r.id = p.run_id
     WHERE p.id = ?`,
    slipId,
  );
  if (!slip) notFound();

  const isOwner = Number(slip.employee_id) === session.employeeId;
  if (!isOwner && session.role !== "hr") redirect("/payroll");

  const earnings = [
    { label: "Gaji pokok", value: Number(slip.base_salary) },
    { label: "Tunjangan transport", value: Number(slip.allowance_transport) },
    { label: "Tunjangan makan", value: Number(slip.allowance_meal) },
    { label: "Lembur", value: Number(slip.overtime) },
  ];
  const terPercent = (Number(slip.ter_rate) * 100).toLocaleString("id-ID", {
    maximumFractionDigits: 2,
  });
  const deductions = [
    { label: "BPJS Kesehatan — 1% pekerja", value: Number(slip.bpjs_kes) },
    { label: "BPJS JHT — 2% pekerja", value: Number(slip.bpjs_jht) },
    { label: "BPJS JP — 1% pekerja", value: Number(slip.bpjs_jp) },
    {
      label: `PPh 21 — TER ${slip.ter_category ?? "A"} ${terPercent}%`,
      value: Number(slip.pph21),
    },
    { label: `Potongan absen (${slip.present_days} hari hadir)`, value: Number(slip.alpha_deduction) },
    { label: "Potongan lain", value: Number(slip.other_deduction) },
  ];
  const employerTotal =
    Number(slip.employer_kes) +
    Number(slip.employer_jht) +
    Number(slip.employer_jp) +
    Number(slip.bpjs_jkk) +
    Number(slip.bpjs_jkm);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={session.role === "hr" ? `/payroll/${slip.run_id}` : "/payroll"} className="text-sm text-slate-500 hover:text-slate-700">
            ← Kembali
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
            Slip Gaji {monthLabel(slip.period)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={slip.run_status === "Final" ? "emerald" : "amber"}>{slip.run_status}</Badge>
          <PrintButton />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-slate-950 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500 text-base font-bold">
              N
            </span>
            <div>
              <p className="text-sm font-semibold">PT Nusantara Digital</p>
              <p className="text-[11px] text-slate-400">
                Jl. Sudirman Kav. 21, Jakarta Selatan · npwp 01.234.567.8-091.000
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-slate-400">Periode</p>
            <p className="text-sm font-semibold">{monthLabel(slip.period)}</p>
          </div>
        </div>

        <div className="grid gap-6 border-b border-slate-100 px-6 py-5 sm:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400">Karyawan</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{slip.employee_name}</p>
            <p className="text-xs text-slate-500">{slip.position}</p>
            <p className="text-xs text-slate-500">{slip.department_name}</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:text-right">
            <dt className="text-slate-500">NIP</dt>
            <dd className="font-mono text-slate-800">{slip.employee_nip}</dd>
            <dt className="text-slate-500">Status PTKP</dt>
            <dd className="text-slate-800">{slip.marital_status}</dd>
            <dt className="text-slate-500">Hadir</dt>
            <dd className="text-slate-800">{slip.present_days} hari</dd>
            <dt className="text-slate-500">Dasar BPJS</dt>
            <dd className="text-slate-800">{rupiah(Number(slip.bpjs_base))}</dd>
            <dt className="text-slate-500">Rekening</dt>
            <dd className="text-slate-800">
              {slip.bank_name ? `${slip.bank_name} ${slip.bank_account}` : "—"}
            </dd>
          </dl>
        </div>

        <div className="grid gap-6 px-6 py-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pendapatan
            </p>
            <ul className="space-y-1.5 text-sm">
              {earnings.map((item) => (
                <li key={item.label} className="flex justify-between gap-3">
                  <span className="text-slate-600">{item.label}</span>
                  <span className="text-slate-900">{rupiah(item.value)}</span>
                </li>
              ))}
              <li className="flex justify-between gap-3 border-t border-slate-200 pt-2 font-semibold">
                <span className="text-slate-700">Total bruto</span>
                <span className="text-slate-900">{rupiah(Number(slip.gross))}</span>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Potongan
            </p>
            <ul className="space-y-1.5 text-sm">
              {deductions.map((item) => (
                <li key={item.label} className="flex justify-between gap-3">
                  <span className="text-slate-600">{item.label}</span>
                  <span className="text-slate-900">{rupiah(item.value)}</span>
                </li>
              ))}
              <li className="flex justify-between gap-3 border-t border-slate-200 pt-2 font-semibold">
                <span className="text-slate-700">Total potongan</span>
                <span className="text-slate-900">{rupiah(Number(slip.total_deduction))}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mx-6 mb-5 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">
              Gaji bersih (take home pay)
            </p>
            <p className="text-[11px] text-emerald-700/70">Ditransfer ke rekening terdaftar</p>
          </div>
          <p className="text-xl font-semibold text-emerald-800">{rupiah(Number(slip.net))}</p>
        </div>

        <div className="border-t border-slate-100 px-6 py-4 text-xs text-slate-500">
          <p className="font-medium text-slate-600">Kontribusi perusahaan (di luar take home)</p>
          <p className="mt-1">
            JKN 4% {rupiah(Number(slip.employer_kes))} · JHT 3,7% {rupiah(Number(slip.employer_jht))} ·
            JP 2% {rupiah(Number(slip.employer_jp))} · JKK {rupiah(Number(slip.bpjs_jkk))} · JKM{" "}
            {rupiah(Number(slip.bpjs_jkm))} — total {rupiah(employerTotal)} per bulan.
          </p>
          <p className="mt-3">
            Slip ini dihasilkan otomatis{slip.finalized_at ? ` dan difinalisasi pada ${dateID(slip.finalized_at.slice(0, 10))}` : ""}.
            PPh 21 memakai TER bulanan (PP 58/2023, PMK 168/2023); estimasi setahun{" "}
            {rupiah(Number(slip.pph21_annual))} dan direkonsiliasi pada masa pajak Desember.
          </p>
        </div>
      </div>
    </div>
  );
}
