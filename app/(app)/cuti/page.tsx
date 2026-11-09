import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { decideLeaveAction, requestLeaveAction } from "@/lib/actions";
import { canApprove, requireSession } from "@/lib/auth";
import { all, one } from "@/lib/db";
import {
  businessDays,
  dateID,
  leaveStatusTone,
  monthLabel,
  todayISO,
} from "@/lib/format";
import type { LeaveRequestRow, LeaveTypeRow } from "@/lib/types";

export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const today = todayISO();
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const yearEnd = `${today.slice(0, 4)}-12-31`;

  const leaveTypes = all<LeaveTypeRow>("SELECT id, name, quota FROM leave_types ORDER BY id");
  const balances = leaveTypes.map((type) => {
    const used = Number(
      one<{ total: number }>(
        `SELECT COALESCE(SUM(days), 0) AS total FROM leave_requests
         WHERE employee_id = ? AND leave_type_id = ? AND status = 'Disetujui'
           AND start_date BETWEEN ? AND ?`,
        session.employeeId,
        type.id,
        yearStart,
        yearEnd,
      )?.total ?? 0,
    );
    const pending = Number(
      one<{ total: number }>(
        `SELECT COALESCE(SUM(days), 0) AS total FROM leave_requests
         WHERE employee_id = ? AND leave_type_id = ? AND status = 'Menunggu'
           AND start_date BETWEEN ? AND ?`,
        session.employeeId,
        type.id,
        yearStart,
        yearEnd,
      )?.total ?? 0,
    );
    return { ...type, used, pending };
  });

  const myRequests = all<LeaveRequestRow>(
    `SELECT lr.*, e.full_name AS employee_name, e.nip AS employee_nip,
            d.name AS department_name, lt.name AS leave_type_name,
            r.full_name AS reviewer_name
     FROM leave_requests lr
     JOIN employees e ON e.id = lr.employee_id
     JOIN departments d ON d.id = e.department_id
     JOIN leave_types lt ON lt.id = lr.leave_type_id
     LEFT JOIN employees r ON r.id = lr.reviewer_id
     WHERE lr.employee_id = ?
     ORDER BY lr.created_at DESC LIMIT 12`,
    session.employeeId,
  );

  const pendingApprovals = canApprove(session.role)
    ? all<LeaveRequestRow>(
        `SELECT lr.*, e.full_name AS employee_name, e.nip AS employee_nip,
                d.name AS department_name, lt.name AS leave_type_name,
                r.full_name AS reviewer_name
         FROM leave_requests lr
         JOIN employees e ON e.id = lr.employee_id
         JOIN departments d ON d.id = e.department_id
         JOIN leave_types lt ON lt.id = lr.leave_type_id
         LEFT JOIN employees r ON r.id = lr.reviewer_id
         WHERE lr.status = 'Menunggu' AND lr.employee_id != ?
           AND (? = 'hr' OR e.manager_id = ?)
         ORDER BY lr.start_date`,
        session.employeeId,
        session.role,
        session.employeeId,
      )
    : [];

  return (
    <>
      <PageHeader
        title="Cuti & Izin"
        description={`Tahun ${today.slice(0, 4)} · ajukan cuti dan pantau persetujuannya`}
      />

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
        {balances.map((balance) => {
          const remaining = Math.max(0, balance.quota - balance.used);
          const percent = balance.quota > 0 ? Math.min(100, Math.round((balance.used / balance.quota) * 100)) : 0;
          return (
            <div key={balance.id} className="card p-5">
              <p className="stat-label">{balance.name}</p>
              <p className="mt-2 text-[22px] font-semibold tracking-tight text-slate-900">
                {remaining}
                <span className="ml-1 text-sm font-normal text-slate-500">hari tersisa</span>
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Terpakai {balance.used} hari
                {balance.pending > 0 && ` · ${balance.pending} hari menunggu`}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Ajukan cuti" subtitle="Pengajuan akan diteruskan ke atasan langsung" />
          <form action={requestLeaveAction} className="space-y-4 p-5">
            <div>
              <label className="label" htmlFor="leave_type_id">
                Jenis cuti
              </label>
              <select id="leave_type_id" name="leave_type_id" className="input" required>
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="start_date">
                  Mulai
                </label>
                <input
                  id="start_date"
                  name="start_date"
                  type="date"
                  min={today}
                  defaultValue={today}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="end_date">
                  Selesai
                </label>
                <input
                  id="end_date"
                  name="end_date"
                  type="date"
                  min={today}
                  defaultValue={today}
                  className="input"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="reason">
                Alasan
              </label>
              <textarea
                id="reason"
                name="reason"
                rows={3}
                className="input resize-none"
                placeholder="Jelaskan keperluan cuti..."
                required
              />
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Hari kerja dihitung Senin–Jumat. Pengajuan cuti sakit lebih dari 1 hari sebaiknya
              melampirkan surat dokter ke HR.
            </p>
            <button type="submit" className="btn btn-primary w-full">
              Kirim pengajuan
            </button>
          </form>
        </Card>

        <div className="space-y-5 lg:col-span-2">
          {canApprove(session.role) && (
            <Card>
              <CardHeader
                title="Menunggu persetujuan"
                subtitle={
                  session.role === "hr"
                    ? "Semua pengajuan karyawan"
                    : "Pengajuan anggota tim langsung"
                }
                action={<Badge tone="amber">{pendingApprovals.length} pengajuan</Badge>}
              />
              {pendingApprovals.length === 0 ? (
                <EmptyState title="Tidak ada pengajuan yang menunggu" description="Semua sudah diproses." />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {pendingApprovals.map((request) => (
                    <li key={request.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <Avatar name={request.employee_name} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900">
                              {request.employee_name}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {request.department_name} · {request.leave_type_name}
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                              {dateID(request.start_date)} – {dateID(request.end_date)} ·{" "}
                              {request.days} hari kerja
                            </p>
                            <p className="mt-1 text-xs text-slate-500">{request.reason}</p>
                          </div>
                        </div>
                        <div className="w-full space-y-2 sm:w-64">
                          <form action={decideLeaveAction} className="space-y-2">
                            <input type="hidden" name="request_id" value={request.id} />
                            <input
                              name="note"
                              className="input py-1.5 text-xs"
                              placeholder="Catatan (opsional)"
                            />
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                name="decision"
                                value="Disetujui"
                                className="btn btn-success btn-sm flex-1"
                              >
                                Setujui
                              </button>
                              <button
                                type="submit"
                                name="decision"
                                value="Ditolak"
                                className="btn btn-danger btn-sm flex-1"
                              >
                                Tolak
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <Card>
            <CardHeader title="Riwayat pengajuan saya" subtitle={`${myRequests.length} pengajuan terakhir`} />
            {myRequests.length === 0 ? (
              <EmptyState title="Belum ada pengajuan" description="Pengajuan cuti akan muncul di sini." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {myRequests.map((request) => (
                  <li key={request.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {request.leave_type_name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {dateID(request.start_date)} – {dateID(request.end_date)} ·{" "}
                          {request.days} hari kerja
                        </p>
                      </div>
                      <Badge tone={leaveStatusTone(request.status)}>{request.status}</Badge>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600">{request.reason}</p>
                    {request.reviewer_name && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        Diproses oleh {request.reviewer_name}
                        {request.review_note ? ` · “${request.review_note}”` : ""}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
