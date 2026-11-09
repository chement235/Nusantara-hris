import Link from "next/link";
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { clockInAction, clockOutAction } from "@/lib/actions";
import { requireSession } from "@/lib/auth";
import { all, one } from "@/lib/db";
import {
  businessDays,
  dateID,
  isISODate,
  longDateID,
  timesheetStatusTone,
  todayISO,
} from "@/lib/format";

type AttendanceListRow = {
  employee_id: number;
  full_name: string;
  nip: string;
  department_name: string;
  clock_in: string | null;
  clock_out: string | null;
  status: string | null;
  note: string | null;
};

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; dept?: string; ok?: string; error?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const today = todayISO();
  const date = isISODate(params.date) ? params.date : today;
  const dept = params.dept ?? "";

  const departments = all<{ id: number; name: string }>(
    "SELECT id, name FROM departments ORDER BY name",
  );

  const rows = all<AttendanceListRow>(
    `SELECT e.id AS employee_id, e.full_name, e.nip, d.name AS department_name,
            a.clock_in, a.clock_out, a.status, a.note
     FROM employees e
     JOIN departments d ON d.id = e.department_id
     LEFT JOIN attendance a ON a.employee_id = e.id AND a.date = ?
     WHERE e.status = 'Aktif' AND (? = 0 OR e.department_id = ?)
     ORDER BY e.full_name`,
    date,
    dept ? Number(dept) : 0,
    dept ? Number(dept) : 0,
  );

  const present = rows.filter((row) => row.status === "Hadir" || row.status === "Terlambat").length;
  const wfh = rows.filter((row) => row.status === "WFH").length;
  const excused = rows.filter((row) => ["Cuti", "Sakit", "Izin"].includes(row.status ?? "")).length;
  const missing = rows.filter((row) => !row.status).length;
  const late = rows.filter((row) => row.status === "Terlambat").length;

  const selfToday = one<{ clock_in: string | null; clock_out: string | null; status: string; note: string | null }>(
    "SELECT clock_in, clock_out, status, note FROM attendance WHERE employee_id = ? AND date = ?",
    session.employeeId,
    today,
  );

  const monthStart = `${today.slice(0, 7)}-01`;
  const selfMonth = all<{ status: string; c: number }>(
    "SELECT status, COUNT(*) AS c FROM attendance WHERE employee_id = ? AND date >= ? GROUP BY status",
    session.employeeId,
    monthStart,
  ).map((row) => ({ status: row.status, count: Number(row.c) }));

  const workdaysSoFar = businessDays(monthStart, today);
  const selfPresent =
    (selfMonth.find((item) => item.status === "Hadir")?.count ?? 0) +
    (selfMonth.find((item) => item.status === "Terlambat")?.count ?? 0) +
    (selfMonth.find((item) => item.status === "WFH")?.count ?? 0);
  const selfRate = workdaysSoFar > 0 ? Math.round((selfPresent / workdaysSoFar) * 100) : 0;

  return (
    <>
      <PageHeader title="Kehadiran" description={longDateID(today)}>
        <Link href="/cuti" className="btn btn-ghost">
          Ajukan cuti
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
        <StatCard label="Hadir" value={present} hint={`${late} di antaranya terlambat`} icon="check" tone="emerald" />
        <StatCard label="WFH" value={wfh} hint="Bekerja dari rumah" icon="briefcase" tone="sky" />
        <StatCard label="Cuti / izin / sakit" value={excused} hint="Dengan keterangan" icon="calendar" tone="violet" />
        <StatCard label="Belum absen" value={missing} hint={`Dari ${rows.length} karyawan aktif`} icon="clock" tone="amber" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Absensi saya" subtitle={`Kehadiran bulan ini ${selfRate}%`} />
          <div className="p-5">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">Masuk</p>
                  <p className="mt-1 font-mono text-xl font-semibold text-slate-900">
                    {selfToday?.clock_in ?? "--:--"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">Pulang</p>
                  <p className="mt-1 font-mono text-xl font-semibold text-slate-900">
                    {selfToday?.clock_out ?? "--:--"}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                {!selfToday?.clock_in ? (
                  <form action={clockInAction} className="flex-1">
                    <button type="submit" className="btn btn-primary w-full">
                      Absen masuk
                    </button>
                  </form>
                ) : (
                  <form action={clockOutAction} className="flex-1">
                    <button
                      type="submit"
                      className="btn btn-ghost w-full"
                      disabled={!!selfToday.clock_out}
                    >
                      {selfToday.clock_out ? "Absen pulang tercatat" : "Absen pulang"}
                    </button>
                  </form>
                )}
              </div>
              {selfToday && (
                <p className="mt-3 text-center text-xs text-slate-500">
                  Status hari ini:{" "}
                  <Badge tone={timesheetStatusTone(selfToday.status)}>{selfToday.status}</Badge>
                </p>
              )}
            </div>

            <div className="mt-5 space-y-2">
              {selfMonth.length === 0 ? (
                <p className="text-xs text-slate-500">Belum ada catatan bulan ini.</p>
              ) : (
                selfMonth.map((item) => (
                  <div key={item.status} className="flex items-center justify-between text-sm">
                    <Badge tone={timesheetStatusTone(item.status)}>{item.status}</Badge>
                    <span className="text-slate-600">{item.count} hari</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Rekap absensi harian"
            subtitle={`${rows.length} karyawan · ${dept ? departments.find((item) => String(item.id) === dept)?.name ?? "Semua" : "Semua departemen"}`}
          />
          <form className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-end">
            <div className="sm:w-48">
              <label className="label" htmlFor="date">
                Tanggal
              </label>
              <input id="date" name="date" type="date" defaultValue={date} className="input" />
            </div>
            <div className="flex-1">
              <label className="label" htmlFor="dept">
                Departemen
              </label>
              <select id="dept" name="dept" defaultValue={dept} className="input">
                <option value="">Semua departemen</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary">
              Tampilkan
            </button>
          </form>

          {rows.length === 0 ? (
            <EmptyState title="Tidak ada karyawan pada filter ini" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Karyawan</th>
                    <th className="th">Departemen</th>
                    <th className="th">Masuk</th>
                    <th className="th">Pulang</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.employee_id} className="hover:bg-slate-50/60">
                      <td className="td">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={row.full_name} size="sm" />
                          <div className="leading-tight">
                            <p className="text-sm font-medium text-slate-900">{row.full_name}</p>
                            <p className="font-mono text-[10px] text-slate-500">{row.nip}</p>
                          </div>
                        </div>
                      </td>
                      <td className="td text-slate-600">{row.department_name}</td>
                      <td className="td font-mono text-xs">{row.clock_in ?? "—"}</td>
                      <td className="td font-mono text-xs">{row.clock_out ?? "—"}</td>
                      <td className="td">
                        <Badge tone={row.status ? timesheetStatusTone(row.status) : "slate"}>
                          {row.status ?? "Belum absen"}
                        </Badge>
                        {row.note && row.status === "Terlambat" && (
                          <p className="mt-0.5 text-[10px] text-slate-400">{row.note}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            Rekap untuk {dateID(date)} · data berasal dari mesin absensi (demo).
          </div>
        </Card>
      </div>
    </>
  );
}
