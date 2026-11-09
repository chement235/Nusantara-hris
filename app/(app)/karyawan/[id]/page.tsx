import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { all, one } from "@/lib/db";
import {
  businessDays,
  dateID,
  leaveStatusTone,
  monthLabel,
  rupiah,
  timesheetStatusTone,
  todayISO,
} from "@/lib/format";
import type { EmployeeRow } from "@/lib/types";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const employeeId = Number(id);
  if (!Number.isFinite(employeeId)) notFound();

  const employee = one<EmployeeRow>(
    `SELECT e.*, d.name AS department_name, d.code AS department_code,
            m.full_name AS manager_name
     FROM employees e
     JOIN departments d ON d.id = e.department_id
     LEFT JOIN employees m ON m.id = e.manager_id
     WHERE e.id = ?`,
    employeeId,
  );
  if (!employee) notFound();

  const today = todayISO();
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const yearEnd = `${today.slice(0, 4)}-12-31`;

  const leaveTypes = all<{ id: number; name: string; quota: number }>(
    "SELECT id, name, quota FROM leave_types ORDER BY id",
  );
  const balances = leaveTypes.map((type) => {
    const used = Number(
      one<{ total: number }>(
        `SELECT COALESCE(SUM(days), 0) AS total FROM leave_requests
         WHERE employee_id = ? AND leave_type_id = ? AND status = 'Disetujui'
           AND start_date BETWEEN ? AND ?`,
        employeeId,
        type.id,
        yearStart,
        yearEnd,
      )?.total ?? 0,
    );
    return { ...type, used };
  });

  const attendanceSummary = all<{ status: string; c: number }>(
    `SELECT status, COUNT(*) AS c FROM attendance
     WHERE employee_id = ? AND date >= ? GROUP BY status`,
    employeeId,
    `${today.slice(0, 7)}-01`,
  ).map((row) => ({ status: row.status, count: Number(row.c) }));

  const recentAttendance = all<{
    date: string;
    clock_in: string | null;
    clock_out: string | null;
    status: string;
    note: string | null;
  }>(
    `SELECT date, clock_in, clock_out, status, note FROM attendance
     WHERE employee_id = ? ORDER BY date DESC LIMIT 10`,
    employeeId,
  );

  const leaveHistory = all<{
    id: number;
    leave_type_name: string;
    start_date: string;
    end_date: string;
    days: number;
    status: string;
    reason: string;
    review_note: string | null;
  }>(
    `SELECT lr.id, lt.name AS leave_type_name, lr.start_date, lr.end_date, lr.days,
            lr.status, lr.reason, lr.review_note
     FROM leave_requests lr
     JOIN leave_types lt ON lt.id = lr.leave_type_id
     WHERE lr.employee_id = ?
     ORDER BY lr.created_at DESC LIMIT 8`,
    employeeId,
  );

  const lastPayslip = one<{
    id: number;
    period: string;
    gross: number;
    total_deduction: number;
    net: number;
    status: string;
    present_days: number;
  }>(
    `SELECT p.id, r.period, p.gross, p.total_deduction, p.net, r.status, p.present_days
     FROM payslips p
     JOIN payroll_runs r ON r.id = p.run_id
     WHERE p.employee_id = ?
     ORDER BY r.period DESC LIMIT 1`,
    employeeId,
  );

  const totalLeaveUsed = balances.reduce((acc, item) => acc + item.used, 0);

  return (
    <>
      <PageHeader title="Profil Karyawan" description={`${employee.nip} · ${employee.department_name}`}>
        <Link href="/karyawan" className="btn btn-ghost">
          ← Kembali
        </Link>
        {lastPayslip && (
          <Link href={`/payroll/slip/${lastPayslip.id}`} className="btn btn-primary">
            Slip gaji terakhir
          </Link>
        )}
      </PageHeader>

      <Card>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <Avatar name={employee.full_name} size="lg" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">{employee.full_name}</h2>
            <p className="text-sm text-slate-500">
              {employee.position} · {employee.department_name}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone={employee.employment_type === "Tetap" ? "emerald" : "amber"}>
                {employee.employment_type}
              </Badge>
              <Badge tone="slate">{employee.job_level}</Badge>
              <Badge tone={employee.status === "Aktif" ? "emerald" : "slate"}>{employee.status}</Badge>
              <Badge tone="indigo">{employee.marital_status}</Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-1">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Bergabung</p>
              <p className="font-medium text-slate-800">{dateID(employee.join_date)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Atasan</p>
              <p className="font-medium text-slate-800">{employee.manager_name ?? "—"}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Informasi kepegawaian" />
          <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
            {[
              ["NIP", employee.nip],
              ["Departemen", `${employee.department_name} (${employee.department_code})`],
              ["Jabatan", employee.position],
              ["Level", employee.job_level],
              ["Email", employee.email],
              ["Telepon", employee.phone ?? "—"],
              ["Rekening", employee.bank_name ? `${employee.bank_name} ${employee.bank_account}` : "—"],
              ["NPWP", employee.npwp ?? "—"],
              ["Berakhir kontrak", employee.contract_end ? dateID(employee.contract_end) : "Tidak ada (karyawan tetap)"],
              ["Tanggal lahir", employee.birth_date ? dateID(employee.birth_date) : "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] uppercase tracking-wider text-slate-400">{label}</dt>
                <dd className="mt-0.5 text-sm text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
          {employee.address && (
            <div className="border-t border-slate-100 px-5 py-4">
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Alamat</p>
              <p className="mt-0.5 text-sm text-slate-800">{employee.address}</p>
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Saldo cuti" subtitle={`${totalLeaveUsed} hari terpakai tahun ini`} />
            <div className="space-y-3.5 p-5">
              {balances.map((balance) => {
                const remaining = Math.max(0, balance.quota - balance.used);
                const percent = balance.quota > 0 ? Math.min(100, Math.round((balance.used / balance.quota) * 100)) : 0;
                return (
                  <div key={balance.id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{balance.name}</span>
                      <span className="text-slate-500">
                        {remaining} / {balance.quota} hari
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="Kehadiran bulan ini" />
            <div className="grid grid-cols-2 gap-3 p-5">
              {attendanceSummary.length === 0 ? (
                <p className="col-span-2 text-center text-xs text-slate-500">Belum ada data.</p>
              ) : (
                attendanceSummary.map((item) => (
                  <div key={item.status} className="rounded-xl bg-slate-50 px-3 py-2.5">
                    <p className="text-[11px] text-slate-500">{item.status}</p>
                    <p className="text-lg font-semibold text-slate-900">{item.count}</p>
                  </div>
                ))
              )}
            </div>
          </Card>

          {lastPayslip && (
            <Card>
              <CardHeader title="Slip gaji terakhir" subtitle={monthLabel(lastPayslip.period)} />
              <div className="space-y-2.5 p-5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bruto</span>
                  <span className="font-medium text-slate-900">{rupiah(Number(lastPayslip.gross))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Potongan</span>
                  <span className="font-medium text-slate-900">
                    −{rupiah(Number(lastPayslip.total_deduction))}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2.5">
                  <span className="font-medium text-slate-700">Diterima</span>
                  <span className="font-semibold text-slate-900">{rupiah(Number(lastPayslip.net))}</span>
                </div>
                <Link href={`/payroll/slip/${lastPayslip.id}`} className="btn btn-ghost w-full justify-center">
                  Lihat slip gaji
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Riwayat kehadiran" subtitle="10 catatan terakhir" />
          {recentAttendance.length === 0 ? (
            <EmptyState title="Belum ada catatan kehadiran" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Tanggal</th>
                    <th className="th">Masuk</th>
                    <th className="th">Pulang</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentAttendance.map((record) => (
                    <tr key={record.date}>
                      <td className="td whitespace-nowrap">{dateID(record.date)}</td>
                      <td className="td font-mono text-xs">{record.clock_in ?? "—"}</td>
                      <td className="td font-mono text-xs">{record.clock_out ?? "—"}</td>
                      <td className="td">
                        <Badge tone={timesheetStatusTone(record.status)}>{record.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Riwayat cuti" subtitle="8 pengajuan terakhir" />
          {leaveHistory.length === 0 ? (
            <EmptyState title="Belum ada pengajuan cuti" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {leaveHistory.map((leave) => (
                <li key={leave.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{leave.leave_type_name}</p>
                    <p className="text-[11px] text-slate-500">
                      {dateID(leave.start_date)} – {dateID(leave.end_date)} ·{" "}
                      {businessDays(leave.start_date, leave.end_date)} hari kerja
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500">{leave.reason}</p>
                    {leave.review_note && (
                      <p className="mt-1 text-[11px] italic text-slate-400">
                        Catatan: {leave.review_note}
                      </p>
                    )}
                  </div>
                  <Badge tone={leaveStatusTone(leave.status)}>{leave.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
