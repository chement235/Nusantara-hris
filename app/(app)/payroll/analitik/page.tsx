import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { monthLabel, rupiah } from "@/lib/format";

export default async function PayrollAnalyticsPage() {
  const session = await requireRole(["hr"]);

  const latestRun = one<{ id: number; period: string; status: string; employee_count: number; total_gross: number; total_net: number; total_deduction: number }>(
    `SELECT id, period, status, employee_count, total_gross, total_net, total_deduction
     FROM payroll_runs ORDER BY period DESC LIMIT 1`,
  );

  const departmentBreakdown = latestRun
    ? all<{
        department: string;
        employees: number;
        gross: number;
        net: number;
        kes: number;
        jht: number;
        jp: number;
        pph21: number;
      }>(
        `SELECT d.name AS department,
                COUNT(p.id) AS employees,
                COALESCE(SUM(p.gross), 0) AS gross,
                COALESCE(SUM(p.net), 0) AS net,
                COALESCE(SUM(p.bpjs_kes), 0) AS kes,
                COALESCE(SUM(p.bpjs_jht), 0) AS jht,
                COALESCE(SUM(p.bpjs_jp), 0) AS jp,
                COALESCE(SUM(p.pph21), 0) AS pph21
         FROM payslips p
         JOIN employees e ON e.id = p.employee_id
         JOIN departments d ON d.id = e.department_id
         WHERE p.run_id = ?
         GROUP BY d.id
         ORDER BY gross DESC`,
        latestRun.id,
      )
    : [];

  const contributions = latestRun
    ? one<{ kes: number; jht: number; jp: number; jkk: number; jkm: number; pph21: number }>(
        `SELECT COALESCE(SUM(bpjs_kes), 0) AS kes,
                COALESCE(SUM(bpjs_jht), 0) AS jht,
                COALESCE(SUM(bpjs_jp), 0) AS jp,
                COALESCE(SUM(bpjs_jkk), 0) AS jkk,
                COALESCE(SUM(bpjs_jkm), 0) AS jkm,
                COALESCE(SUM(pph21), 0) AS pph21
         FROM payslips WHERE run_id = ?`,
        latestRun.id,
      )
    : undefined;

  const runs = all<{ period: string; total_gross: number; total_net: number; total_deduction: number }>(
    `SELECT period, total_gross, total_net, total_deduction FROM payroll_runs ORDER BY period DESC LIMIT 12`,
  );

  return (
    <>
      <PageHeader
        title="Analitik Payroll"
        description={
          latestRun
            ? `Periode ${monthLabel(latestRun.period)} · ${latestRun.employee_count} karyawan`
            : "Belum ada payroll yang dijalankan"
        }
      >
        <Link href="/payroll" className="btn btn-ghost">
          ← Kembali ke payroll
        </Link>
      </PageHeader>

      {!latestRun ? (
        <EmptyState title="Belum ada data payroll" description="Jalankan payroll terlebih dahulu." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total bruto" value={rupiah(Number(latestRun.total_gross))} hint="Gaji + tunjangan" icon="briefcase" tone="indigo" />
            <StatCard label="Total net" value={rupiah(Number(latestRun.total_net))} hint="Take home pay" icon="wallet" tone="violet" />
            <StatCard label="PPh 21 dipotong" value={rupiah(Number(contributions?.pph21 ?? 0))} hint="Kewajiban pajak bulan ini" icon="target" tone="amber" />
            <StatCard
              label="Iuran BPJS pekerja"
              value={rupiah(Number(contributions?.kes ?? 0) + Number(contributions?.jht ?? 0) + Number(contributions?.jp ?? 0))}
              hint={`JKK ${rupiah(Number(contributions?.jkk ?? 0))} · JKM ${rupiah(Number(contributions?.jkm ?? 0))} (perusahaan)`}
              icon="clock"
              tone="emerald"
            />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Breakdown per departemen" subtitle={`Periode ${monthLabel(latestRun.period)}`} />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="th">Departemen</th>
                      <th className="th">Karyawan</th>
                      <th className="th">Bruto</th>
                      <th className="th">PPh 21</th>
                      <th className="th">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {departmentBreakdown.map((row) => (
                      <tr key={row.department} className="hover:bg-slate-50/60">
                        <td className="td font-medium text-slate-900">{row.department}</td>
                        <td className="td text-slate-600">{row.employees}</td>
                        <td className="td">{rupiah(Number(row.gross))}</td>
                        <td className="td">{rupiah(Number(row.pph21))}</td>
                        <td className="td font-medium text-slate-900">{rupiah(Number(row.net))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <CardHeader title="Komponen potongan" subtitle="Total seluruh karyawan" />
              <div className="grid grid-cols-2 gap-3 p-5">
                {[
                  ["BPJS Kesehatan (1%)", Number(contributions?.kes ?? 0)],
                  ["BPJS JHT (2%)", Number(contributions?.jht ?? 0)],
                  ["BPJS JP (1%)", Number(contributions?.jp ?? 0)],
                  ["JKK (perusahaan)", Number(contributions?.jkk ?? 0)],
                  ["JKM (perusahaan)", Number(contributions?.jkm ?? 0)],
                  ["PPh 21", Number(contributions?.pph21 ?? 0)],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-[11px] text-slate-500">{label}</p>
                    <p className="text-sm font-semibold text-slate-900">{rupiah(Number(value))}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="mt-5">
            <CardHeader title="Perbandingan antar periode" subtitle="12 periode terakhir" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Periode</th>
                    <th className="th">Bruto</th>
                    <th className="th">Potongan</th>
                    <th className="th">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {runs.map((run) => (
                    <tr key={run.period} className="hover:bg-slate-50/60">
                      <td className="td font-medium text-slate-900">{monthLabel(run.period)}</td>
                      <td className="td">{rupiah(Number(run.total_gross))}</td>
                      <td className="td">−{rupiah(Number(run.total_deduction))}</td>
                      <td className="td font-medium text-slate-900">{rupiah(Number(run.total_net))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
