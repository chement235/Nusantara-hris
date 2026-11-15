import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { monthLabel, rupiah, todayISO } from "@/lib/format";

export default async function ReportsPage() {
  const session = await requireSession();
  if (session.role !== "hr" && session.role !== "manager") {
    redirect("/?denied=1");
  }

  const today = todayISO();
  const month = today.slice(0, 7);
  const year = today.slice(0, 4);

  const active = Number(one<{ c: number }>(`SELECT COUNT(*) AS c FROM employees WHERE status = 'Aktif'`)?.c ?? 0);
  const contract = Number(one<{ c: number }>(`SELECT COUNT(*) AS c FROM employees WHERE employment_type != 'Tetap' AND status = 'Aktif'`)?.c ?? 0);
  const newThisYear = Number(
    one<{ c: number }>(`SELECT COUNT(*) AS c FROM employees WHERE join_date >= ?`)?.c ?? 0,
  );

  const attendance = all<{ status: string; c: number }>(
    `SELECT status, COUNT(*) AS c FROM attendance WHERE date >= ? GROUP BY status`,
    `${month}-01`,
  );
  const attendanceMap = new Map(attendance.map((row) => [row.status, Number(row.c)]));
  const present = (attendanceMap.get("Hadir") ?? 0) + (attendanceMap.get("Terlambat") ?? 0);
  const totalAttendance = [...attendanceMap.values()].reduce((acc, n) => acc + n, 0);

  const deptSummary = all<{ name: string; c: number; salary: number }>(
    `SELECT d.name, COUNT(e.id) AS c, COALESCE(SUM(e.base_salary), 0) AS salary
     FROM departments d
     LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'Aktif'
     GROUP BY d.id ORDER BY c DESC`,
  );

  const payrollRuns = all<{ period: string; status: string; total_gross: number; total_net: number }>(
    `SELECT period, status, total_gross, total_net FROM payroll_runs ORDER BY period DESC LIMIT 12`,
  );

  const leaveSummary = all<{ status: string; c: number }>(
    `SELECT status, COUNT(*) AS c FROM leave_requests WHERE start_date >= ? GROUP BY status`,
    `${year}-01-01`,
  );
  const leaveMap = new Map(leaveSummary.map((row) => [row.status, Number(row.c)]));

  const openings = all<{ status: string; c: number }>(
    `SELECT status, COUNT(*) AS c FROM job_openings GROUP BY status`,
  );
  const applicants = all<{ stage: string; c: number }>(
    `SELECT stage, COUNT(*) AS c FROM applicants GROUP BY stage`,
  );

  const performance = all<{ rating: string | null; c: number }>(
    `SELECT rating, COUNT(*) AS c FROM appraisals WHERE final_score IS NOT NULL GROUP BY rating ORDER BY c DESC`,
  );

  return (
    <>
      <PageHeader
        title="Laporan HR"
        description={`Ringkasan per ${monthLabel(month)} · data perusahaan untuk pengambilan keputusan`}
      >
        <Link href="/organisasi" className="btn btn-ghost">
          Struktur organisasi
        </Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Karyawan aktif" value={active} hint={`${newThisYear} bergabung tahun ini`} icon="users" tone="indigo" />
        <StatCard label="Non-tetap" value={contract} hint="Kontrak & magang" icon="briefcase" tone="amber" />
        <StatCard label="Kehadiran bulan ini" value={present} hint={`${totalAttendance} catatan absensi`} icon="clock" tone="emerald" />
        <StatCard
          label="Cuti menunggu"
          value={leaveMap.get("Menunggu") ?? 0}
          hint={`${leaveMap.get("Disetujui") ?? 0} disetujui tahun ini`}
          icon="calendar"
          tone="violet"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Headcount per departemen" subtitle="Karyawan aktif dan beban gaji pokok" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Departemen</th>
                  <th className="th">Karyawan</th>
                  <th className="th">Gaji pokok/bulan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deptSummary.map((dept) => (
                  <tr key={dept.name} className="hover:bg-slate-50/60">
                    <td className="td font-medium text-slate-900">{dept.name}</td>
                    <td className="td text-slate-600">{dept.c}</td>
                    <td className="td">{rupiah(Number(dept.salary))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Tren payroll" subtitle="12 periode terakhir" />
          {payrollRuns.length === 0 ? (
            <EmptyState title="Belum ada payroll" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Periode</th>
                    <th className="th">Status</th>
                    <th className="th">Bruto</th>
                    <th className="th">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payrollRuns.map((run) => (
                    <tr key={run.period} className="hover:bg-slate-50/60">
                      <td className="td font-medium text-slate-900">{monthLabel(run.period)}</td>
                      <td className="td">
                        <Badge tone={run.status === "Final" ? "emerald" : "amber"}>{run.status}</Badge>
                      </td>
                      <td className="td">{rupiah(Number(run.total_gross))}</td>
                      <td className="td">{rupiah(Number(run.total_net))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Status cuti" subtitle={`Tahun ${year}`} />
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
            {["Menunggu", "Disetujui", "Ditolak"].map((status) => (
              <div key={status} className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] text-slate-500">{status}</p>
                <p className="text-lg font-semibold text-slate-900">{leaveMap.get(status) ?? 0}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Talent" subtitle="Rekrutmen dan penilaian kinerja" />
          <div className="p-5">
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] text-slate-500">Lowongan dibuka</p>
                <p className="text-lg font-semibold text-slate-900">
                  {openings.find((row) => row.status === "Dibuka")?.c ?? 0}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] text-slate-500">Pelamar dalam pipeline</p>
                <p className="text-lg font-semibold text-slate-900">
                  {applicants.reduce((acc, row) => acc + Number(row.c), 0)}
                </p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-slate-700">Distribusi predikat kinerja</p>
              <div className="flex flex-wrap gap-2">
                {performance.length === 0 ? (
                  <span className="text-xs text-slate-500">Belum ada penilaian final.</span>
                ) : (
                  performance.map((row) => (
                    <Badge key={row.rating ?? "?"} tone="indigo">
                      {row.rating ?? "—"}: {row.c}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-slate-700">Pipeline rekrutmen</p>
              <div className="space-y-1.5">
                {applicants.map((row) => (
                  <div key={row.stage} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{row.stage}</span>
                    <span className="font-medium text-slate-900">{row.c} pelamar</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
