import Link from "next/link";
import { Badge, Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { createPayrollRunAction } from "@/lib/actions";
import { requireSession } from "@/lib/auth";
import { all, one } from "@/lib/db";
import {
  dateID,
  monthLabel,
  previousPeriod,
  rupiah,
  todayISO,
} from "@/lib/format";
import type { PayrollRunRow } from "@/lib/types";

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const currentPeriod = todayISO().slice(0, 7);

  if (session.role !== "hr") {
    const slips = all<{
      id: number;
      period: string;
      status: string;
      gross: number;
      total_deduction: number;
      net: number;
      present_days: number;
    }>(
      `SELECT p.id, r.period, r.status, p.gross, p.total_deduction, p.net, p.present_days
       FROM payslips p
       JOIN payroll_runs r ON r.id = p.run_id
       WHERE p.employee_id = ?
       ORDER BY r.period DESC`,
      session.employeeId,
    );
    const latest = slips[0];

    return (
      <>
        <PageHeader
          title="Payroll Saya"
          description="Slip gaji dan riwayat pembayaran Anda"
        >
          <Link href={`/karyawan/${session.employeeId}`} className="btn btn-ghost">
            Profil saya
          </Link>
        </PageHeader>

        {latest && (
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Gaji terakhir"
              value={rupiah(Number(latest.net))}
              hint={`Periode ${monthLabel(latest.period)}`}
              icon="wallet"
              tone="violet"
            />
            <StatCard
              label="Bruto"
              value={rupiah(Number(latest.gross))}
              hint={`Hadir ${latest.present_days} hari`}
              icon="briefcase"
              tone="indigo"
            />
            <StatCard
              label="Potongan"
              value={rupiah(Number(latest.total_deduction))}
              hint="BPJS, PPh 21, dan potongan lain"
              icon="clock"
              tone="amber"
            />
          </div>
        )}

        <Card className="mt-5">
          <CardHeader title="Riwayat slip gaji" subtitle="Klik slip untuk melihat rincian" />
          {slips.length === 0 ? (
            <EmptyState title="Belum ada slip gaji" description="Slip akan muncul setelah payroll difinalisasi." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Periode</th>
                    <th className="th">Hadir</th>
                    <th className="th">Bruto</th>
                    <th className="th">Potongan</th>
                    <th className="th">Diterima</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {slips.map((slip) => (
                    <tr key={slip.id} className="hover:bg-slate-50/60">
                      <td className="td">
                        <span className="font-medium text-slate-900">{monthLabel(slip.period)}</span>
                        <span className="ml-2">
                          <Badge tone={slip.status === "Final" ? "emerald" : "amber"}>{slip.status}</Badge>
                        </span>
                      </td>
                      <td className="td text-slate-600">{slip.present_days} hari</td>
                      <td className="td">{rupiah(Number(slip.gross))}</td>
                      <td className="td">−{rupiah(Number(slip.total_deduction))}</td>
                      <td className="td font-medium text-slate-900">{rupiah(Number(slip.net))}</td>
                      <td className="td text-right">
                        <Link
                          href={`/payroll/slip/${slip.id}`}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          Lihat slip →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </>
    );
  }

  const runs = all<PayrollRunRow>("SELECT * FROM payroll_runs ORDER BY period DESC");
  const latestRun = runs[0];
  const totalPaid = runs
    .filter((run) => run.status === "Final")
    .reduce((acc, run) => acc + Number(run.total_net), 0);

  return (
    <>
      <PageHeader title="Payroll" description="Proses gaji bulanan, BPJS, dan PPh 21">
        <Link href="/karyawan" className="btn btn-ghost">
          Data karyawan
        </Link>
      </PageHeader>

      {params.ok && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {params.ok}
        </div>
      )}
      {params.error && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {params.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Payroll terakhir"
          value={latestRun ? monthLabel(latestRun.period) : "—"}
          hint={latestRun ? `Status ${latestRun.status}` : "Belum ada payroll"}
          icon="wallet"
          tone="violet"
        />
        <StatCard
          label="Take home terakhir"
          value={latestRun ? rupiah(Number(latestRun.total_net)) : "—"}
          hint={latestRun ? `${latestRun.employee_count} karyawan` : ""}
          icon="users"
          tone="indigo"
        />
        <StatCard
          label="Total potongan"
          value={latestRun ? rupiah(Number(latestRun.total_deduction)) : "—"}
          hint="BPJS + PPh 21 + absen"
          icon="clock"
          tone="amber"
        />
        <StatCard
          label="Akumulasi dibayarkan"
          value={rupiah(totalPaid)}
          hint={`${runs.filter((run) => run.status === "Final").length} periode final`}
          icon="check"
          tone="emerald"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Riwayat payroll" subtitle="Semua periode yang pernah dijalankan" />
          {runs.length === 0 ? (
            <EmptyState title="Belum ada payroll" description="Buat payroll pertama Anda di panel kanan." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Periode</th>
                    <th className="th">Status</th>
                    <th className="th">Karyawan</th>
                    <th className="th">Bruto</th>
                    <th className="th">Net</th>
                    <th className="th">Dibuat</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {runs.map((run) => (
                    <tr key={run.id} className="hover:bg-slate-50/60">
                      <td className="td font-medium text-slate-900">{monthLabel(run.period)}</td>
                      <td className="td">
                        <Badge tone={run.status === "Final" ? "emerald" : "amber"}>{run.status}</Badge>
                      </td>
                      <td className="td text-slate-600">{run.employee_count}</td>
                      <td className="td">{rupiah(Number(run.total_gross))}</td>
                      <td className="td font-medium text-slate-900">{rupiah(Number(run.total_net))}</td>
                      <td className="td whitespace-nowrap text-slate-600">
                        {dateID(run.created_at.slice(0, 10))}
                      </td>
                      <td className="td text-right">
                        <Link
                          href={`/payroll/${run.id}`}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          Detail →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Jalankan payroll" subtitle="Hitung gaji untuk satu periode" />
          <form action={createPayrollRunAction} className="space-y-4 p-5">
            <div>
              <label className="label" htmlFor="period">
                Periode
              </label>
              <input
                id="period"
                name="period"
                type="month"
                defaultValue={previousPeriod()}
                max={currentPeriod}
                className="input"
                required
              />
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Sistem menghitung gaji pokok, tunjangan, BPJS (Kesehatan, JHT, JP), PPh 21 progresif,
              dan potongan hari tanpa keterangan berdasarkan data absensi periode tersebut.
            </p>
            <button type="submit" className="btn btn-primary w-full">
              Hitung payroll
            </button>
            <p className="text-center text-[11px] text-slate-400">
              Hasil berupa draft yang dapat diperiksa sebelum difinalisasi.
            </p>
          </form>
        </Card>
      </div>
    </>
  );
}
