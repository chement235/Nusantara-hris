import Link from "next/link";
import { BarList, Donut } from "@/components/chart";
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { all, one } from "@/lib/db";
import {
  addDays,
  compactRupiah,
  dateID,
  leaveStatusTone,
  longDateID,
  monthLabel,
  rupiah,
  todayISO,
} from "@/lib/format";
import type { PayrollRunRow } from "@/lib/types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const session = await requireSession();
  const { denied } = await searchParams;
  const today = todayISO();

  const activeCount = Number(
    one<{ c: number }>("SELECT COUNT(*) AS c FROM employees WHERE status = 'Aktif'")?.c ?? 0,
  );
  const newThisYear = Number(
    one<{ c: number }>("SELECT COUNT(*) AS c FROM employees WHERE join_date >= ?", `${today.slice(0, 4)}-01-01`)
      ?.c ?? 0,
  );
  const attendanceToday = all<{ status: string; c: number }>(
    "SELECT status, COUNT(*) AS c FROM attendance WHERE date = ? GROUP BY status",
    today,
  );
  const attendanceMap = new Map(attendanceToday.map((row) => [row.status, Number(row.c)]));
  const present = (attendanceMap.get("Hadir") ?? 0) + (attendanceMap.get("Terlambat") ?? 0);
  const wfh = attendanceMap.get("WFH") ?? 0;
  const off = (attendanceMap.get("Cuti") ?? 0) + (attendanceMap.get("Sakit") ?? 0) + (attendanceMap.get("Izin") ?? 0);
  const notClocked = Math.max(0, activeCount - present - wfh - off);
  const attendanceRate = activeCount > 0 ? Math.round(((present + wfh) / activeCount) * 100) : 0;

  const pendingLeave = Number(
    one<{ c: number }>("SELECT COUNT(*) AS c FROM leave_requests WHERE status = 'Menunggu'")?.c ?? 0,
  );
  const lastRun = one<PayrollRunRow>(
    "SELECT * FROM payroll_runs ORDER BY period DESC LIMIT 1",
  );

  const byDepartment = all<{ name: string; c: number }>(
    `SELECT d.name, COUNT(e.id) AS c
     FROM departments d
     LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'Aktif'
     GROUP BY d.id ORDER BY c DESC`,
  ).map((row) => ({ label: row.name, value: Number(row.c) }));

  const recentLeave = all<{
    id: number;
    employee_name: string;
    department_name: string;
    leave_type_name: string;
    start_date: string;
    end_date: string;
    days: number;
    status: string;
  }>(
    `SELECT lr.id, e.full_name AS employee_name, d.name AS department_name,
            lt.name AS leave_type_name, lr.start_date, lr.end_date, lr.days, lr.status
     FROM leave_requests lr
     JOIN employees e ON e.id = lr.employee_id
     JOIN departments d ON d.id = e.department_id
     JOIN leave_types lt ON lt.id = lr.leave_type_id
     ORDER BY lr.created_at DESC LIMIT 6`,
  );

  const expiringContracts = all<{ id: number; full_name: string; employment_type: string; contract_end: string }>(
    `SELECT id, full_name, employment_type, contract_end FROM employees
     WHERE status = 'Aktif' AND contract_end IS NOT NULL AND contract_end <= ?
     ORDER BY contract_end LIMIT 4`,
    addDays(today, 60),
  );

  const onLeaveToday = all<{ full_name: string; leave_type_name: string; end_date: string }>(
    `SELECT e.full_name, lt.name AS leave_type_name, lr.end_date
     FROM leave_requests lr
     JOIN employees e ON e.id = lr.employee_id
     JOIN leave_types lt ON lt.id = lr.leave_type_id
     WHERE lr.status = 'Disetujui' AND ? BETWEEN lr.start_date AND lr.end_date
     ORDER BY lr.end_date`,
    today,
  );

  return (
    <>
      <PageHeader
        title={`Selamat datang, ${session.name.split(" ")[0]}`}
        description={longDateID(today)}
      >
        <Link href="/kehadiran" className="btn btn-ghost">
          Lihat kehadiran
        </Link>
        <Link href="/cuti" className="btn btn-primary">
          Ajukan cuti
        </Link>
      </PageHeader>

      {denied && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Anda tidak memiliki akses ke halaman tersebut.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Karyawan aktif"
          value={activeCount}
          hint={`${newThisYear} bergabung tahun ini`}
          icon="users"
          tone="indigo"
        />
        <StatCard
          label="Kehadiran hari ini"
          value={`${attendanceRate}%`}
          hint={`${present + wfh} dari ${activeCount} karyawan sudah absen`}
          icon="clock"
          tone="emerald"
        />
        <StatCard
          label="Cuti menunggu"
          value={pendingLeave}
          hint="Pengajuan perlu persetujuan"
          icon="calendar"
          tone="amber"
        />
        <StatCard
          label="Payroll terakhir"
          value={lastRun ? compactRupiah(Number(lastRun.total_net)) : "—"}
          hint={
            lastRun
              ? `Periode ${monthLabel(lastRun.period)} · ${lastRun.status}`
              : "Belum ada payroll dijalankan"
          }
          icon="wallet"
          tone="violet"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Kehadiran hari ini"
            subtitle={`Rekap absensi ${dateID(today)}`}
            action={
              <Link href="/kehadiran" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                Detail →
              </Link>
            }
          />
          <div className="p-5">
            <Donut
              centerValue={`${present + wfh}`}
              centerLabel="sudah absen"
              segments={[
                { label: "Hadir / terlambat", value: present, color: "#10b981" },
                { label: "WFH", value: wfh, color: "#0ea5e9" },
                { label: "Cuti / izin / sakit", value: off, color: "#8b5cf6" },
                { label: "Belum absen", value: notClocked, color: "#cbd5e1" },
              ]}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Karyawan per departemen" subtitle="Headcount aktif" />
          <div className="p-5">
            <BarList items={byDepartment} />
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Pengajuan cuti terbaru"
            subtitle="6 pengajuan terakhir"
            action={
              <Link href="/cuti" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                Lihat semua →
              </Link>
            }
          />
          {recentLeave.length === 0 ? (
            <EmptyState title="Belum ada pengajuan cuti" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Karyawan</th>
                    <th className="th">Jenis</th>
                    <th className="th">Tanggal</th>
                    <th className="th">Hari</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentLeave.map((leave) => (
                    <tr key={leave.id} className="hover:bg-slate-50/60">
                      <td className="td">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={leave.employee_name} size="sm" />
                          <div className="leading-tight">
                            <p className="text-sm font-medium text-slate-900">{leave.employee_name}</p>
                            <p className="text-[11px] text-slate-500">{leave.department_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="td text-slate-600">{leave.leave_type_name}</td>
                      <td className="td whitespace-nowrap text-slate-600">
                        {dateID(leave.start_date)} – {dateID(leave.end_date)}
                      </td>
                      <td className="td text-slate-600">{leave.days}</td>
                      <td className="td">
                        <Badge tone={leaveStatusTone(leave.status)}>{leave.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Sedang cuti hari ini" subtitle={`${onLeaveToday.length} karyawan`} />
            <div className="p-4">
              {onLeaveToday.length === 0 ? (
                <p className="py-2 text-center text-xs text-slate-500">
                  Semua tim masuk hari ini.
                </p>
              ) : (
                <ul className="space-y-3">
                  {onLeaveToday.slice(0, 4).map((person) => (
                    <li key={person.full_name} className="flex items-center gap-2.5">
                      <Avatar name={person.full_name} size="sm" />
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="truncate text-sm font-medium text-slate-900">{person.full_name}</p>
                        <p className="truncate text-[11px] text-slate-500">
                          {person.leave_type_name} · s.d. {dateID(person.end_date)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Kontrak berakhir"
              subtitle="Dalam 60 hari ke depan"
              action={
                <Link href="/karyawan" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                  Semua →
                </Link>
              }
            />
            <div className="p-4">
              {expiringContracts.length === 0 ? (
                <p className="py-2 text-center text-xs text-slate-500">Tidak ada kontrak berakhir.</p>
              ) : (
                <ul className="space-y-3">
                  {expiringContracts.map((person) => (
                    <li key={person.id} className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar name={person.full_name} size="sm" />
                        <div className="min-w-0 leading-tight">
                          <Link
                            href={`/karyawan/${person.id}`}
                            className="block truncate text-sm font-medium text-slate-900 hover:text-indigo-600"
                          >
                            {person.full_name}
                          </Link>
                          <p className="text-[11px] text-slate-500">{person.employment_type}</p>
                        </div>
                      </div>
                      <Badge tone="amber">{dateID(person.contract_end)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {lastRun && (
            <Card>
              <CardHeader title="Payroll terakhir" subtitle={monthLabel(lastRun.period)} />
              <div className="space-y-3 p-5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Karyawan</span>
                  <span className="font-medium text-slate-900">{lastRun.employee_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Bruto</span>
                  <span className="font-medium text-slate-900">{rupiah(Number(lastRun.total_gross))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Potongan</span>
                  <span className="font-medium text-slate-900">
                    −{rupiah(Number(lastRun.total_deduction))}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="font-medium text-slate-700">Take home</span>
                  <span className="text-base font-semibold text-slate-900">
                    {rupiah(Number(lastRun.total_net))}
                  </span>
                </div>
                <Link
                  href={`/payroll/${lastRun.id}`}
                  className="btn btn-ghost mt-1 w-full justify-center"
                >
                  Lihat rincian payroll
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
