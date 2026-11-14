import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui";
import {
  finalizePayrollAction,
  recalculatePayrollAction,
} from "@/lib/actions";
import { requireRole } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { dateID, monthLabel, rupiah } from "@/lib/format";
import type { PayrollRunRow, PayslipRow } from "@/lib/types";

export default async function PayrollDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireRole(["hr"]);
  const { id } = await params;
  const feedback = await searchParams;
  const runId = Number(id);
  if (!Number.isFinite(runId)) notFound();

  const payrollRun = one<PayrollRunRow>("SELECT * FROM payroll_runs WHERE id = ?", runId);
  if (!payrollRun) notFound();

  const slips = all<PayslipRow>(
    `SELECT p.*, e.full_name AS employee_name, e.nip AS employee_nip,
            d.name AS department_name, e.position, e.marital_status
     FROM payslips p
     JOIN employees e ON e.id = p.employee_id
     JOIN departments d ON d.id = e.department_id
     WHERE p.run_id = ?
     ORDER BY e.full_name`,
    runId,
  );

  const totalPph = slips.reduce((acc, slip) => acc + Number(slip.pph21), 0);
  const totalBpjs = slips.reduce(
    (acc, slip) => acc + Number(slip.bpjs_kes) + Number(slip.bpjs_jht) + Number(slip.bpjs_jp),
    0,
  );

  return (
    <>
      <PageHeader
        title={`Payroll ${monthLabel(payrollRun.period)}`}
        description={`Dibuat ${dateID(payrollRun.created_at.slice(0, 10))}${
          payrollRun.finalized_at ? ` · difinalisasi ${dateID(payrollRun.finalized_at.slice(0, 10))}` : ""
        }`}
      >
        <Link href="/payroll" className="btn btn-ghost">
          ← Kembali
        </Link>
        {payrollRun.status === "Draft" ? (
          <>
            <form action={recalculatePayrollAction}>
              <input type="hidden" name="run_id" value={payrollRun.id} />
              <button type="submit" className="btn btn-ghost">
                Hitung ulang
              </button>
            </form>
            <form action={finalizePayrollAction}>
              <input type="hidden" name="run_id" value={payrollRun.id} />
              <button type="submit" className="btn btn-primary">
                Finalisasi payroll
              </button>
            </form>
          </>
        ) : (
          <Badge tone="emerald">Final</Badge>
        )}
      </PageHeader>

      {feedback.ok && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {feedback.ok}
        </div>
      )}
      {feedback.error && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {feedback.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Karyawan" value={payrollRun.employee_count} hint="Termasuk dalam payroll" icon="users" tone="indigo" />
        <StatCard label="Total bruto" value={rupiah(Number(payrollRun.total_gross))} hint="Gaji + tunjangan" icon="briefcase" tone="sky" />
        <StatCard label="Potongan" value={rupiah(Number(payrollRun.total_deduction))} hint={`PPh 21 ${rupiah(totalPph)} · BPJS ${rupiah(totalBpjs)}`} icon="clock" tone="amber" />
        <StatCard label="Take home pay" value={rupiah(Number(payrollRun.total_net))} hint="Siap ditransfer" icon="wallet" tone="emerald" />
      </div>

      <Card className="mt-5">
        <CardHeader title="Rincian slip gaji" subtitle={`${slips.length} karyawan`} />
        {slips.length === 0 ? (
          <EmptyState title="Belum ada slip" description="Hitung ulang payroll untuk mengisi data." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Karyawan</th>
                  <th className="th">Hadir</th>
                  <th className="th">Gaji pokok</th>
                  <th className="th">Tunjangan</th>
                  <th className="th">Bruto</th>
                  <th className="th">PPh 21</th>
                  <th className="th">BPJS</th>
                  <th className="th">TER</th>
                  <th className="th">Potongan absen</th>
                  <th className="th">Net</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slips.map((slip) => {
                  const allowances = Number(slip.allowance_transport) + Number(slip.allowance_meal) + Number(slip.overtime);
                  const bpjs = Number(slip.bpjs_kes) + Number(slip.bpjs_jht) + Number(slip.bpjs_jp);
                  return (
                    <tr key={slip.id} className="hover:bg-slate-50/60">
                      <td className="td">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={slip.employee_name} size="sm" />
                          <div className="leading-tight">
                            <p className="text-sm font-medium text-slate-900">{slip.employee_name}</p>
                            <p className="text-[11px] text-slate-500">{slip.department_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="td text-slate-600">{slip.present_days}</td>
                      <td className="td">{rupiah(Number(slip.base_salary))}</td>
                      <td className="td">{rupiah(allowances)}</td>
                      <td className="td">{rupiah(Number(slip.gross))}</td>
                      <td className="td">{rupiah(Number(slip.pph21))}</td>
                      <td className="td">{rupiah(bpjs)}</td>
                      <td className="td text-slate-600">
                        {slip.ter_category
                          ? `${slip.ter_category} · ${(Number(slip.ter_rate) * 100).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`
                          : "—"}
                      </td>
                      <td className="td">{rupiah(Number(slip.alpha_deduction))}</td>
                      <td className="td font-medium text-slate-900">{rupiah(Number(slip.net))}</td>
                      <td className="td text-right">
                        <Link
                          href={`/payroll/slip/${slip.id}`}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          Slip →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td className="td font-semibold text-slate-900">Total</td>
                  <td className="td" />
                  <td className="td" />
                  <td className="td" />
                  <td className="td font-semibold text-slate-900">{rupiah(Number(payrollRun.total_gross))}</td>
                  <td className="td font-semibold text-slate-900">{rupiah(totalPph)}</td>
                  <td className="td font-semibold text-slate-900">{rupiah(totalBpjs)}</td>
                  <td className="td" />
                  <td className="td" />
                  <td className="td font-semibold text-slate-900">{rupiah(Number(payrollRun.total_net))}</td>
                  <td className="td" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Perhitungan mengikuti aturan 2026: JKN 5% (batas upah Rp12 jt), JHT 5,7%, JP 3% (batas
        Rp11.086.300), JKK/JKM ditanggung perusahaan, dan PPh 21 memakai TER bulanan (PP 58/2023).
        Pada masa pajak Desember, PPh 21 dihitung setahun dengan tarif Pasal 17 lalu dikurangi
        potongan Januari–November. Angka tetap perlu direview tim pajak sebelum pembayaran gaji.
      </p>
    </>
  );
}
