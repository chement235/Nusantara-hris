import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { all } from "@/lib/db";
import { monthLabel, todayISO } from "@/lib/format";

type TeamMember = {
  id: number;
  full_name: string;
  nip: string;
  position: string;
  status: string;
  present: number;
  late: number;
  absent: number;
  pending_leave: number;
  appraisal_status: string | null;
  last_score: number | null;
};

export default async function TeamPage() {
  const session = await requireSession();
  if (session.role !== "hr" && session.role !== "manager") {
    redirect("/?denied=1");
  }

  const today = todayISO();
  const monthStart = `${today.slice(0, 7)}-01`;

  const list =
    session.role === "hr"
      ? all<TeamMember>(
          `SELECT e.id, e.full_name, e.nip, e.position, e.status,
                  SUM(CASE WHEN a.date >= ? AND a.status = 'Hadir' THEN 1 ELSE 0 END) AS present,
                  SUM(CASE WHEN a.date >= ? AND a.status = 'Terlambat' THEN 1 ELSE 0 END) AS late,
                  SUM(CASE WHEN a.date >= ? AND a.status = 'Alpha' THEN 1 ELSE 0 END) AS absent,
                  (SELECT COUNT(*) FROM leave_requests lr
                    WHERE lr.employee_id = e.id AND lr.status = 'Menunggu') AS pending_leave,
                  (SELECT ap.status FROM appraisals ap
                    WHERE ap.employee_id = e.id ORDER BY ap.id DESC LIMIT 1) AS appraisal_status,
                  (SELECT ap.final_score FROM appraisals ap
                    WHERE ap.employee_id = e.id AND ap.final_score IS NOT NULL
                    ORDER BY ap.id DESC LIMIT 1) AS last_score
           FROM employees e
           LEFT JOIN attendance a ON a.employee_id = e.id
           WHERE e.status = 'Aktif'
           GROUP BY e.id
           ORDER BY e.full_name`,
          monthStart,
          monthStart,
          monthStart,
        )
      : all<TeamMember>(
          `SELECT e.id, e.full_name, e.nip, e.position, e.status,
                  SUM(CASE WHEN a.date >= ? AND a.status = 'Hadir' THEN 1 ELSE 0 END) AS present,
                  SUM(CASE WHEN a.date >= ? AND a.status = 'Terlambat' THEN 1 ELSE 0 END) AS late,
                  SUM(CASE WHEN a.date >= ? AND a.status = 'Alpha' THEN 1 ELSE 0 END) AS absent,
                  (SELECT COUNT(*) FROM leave_requests lr
                    WHERE lr.employee_id = e.id AND lr.status = 'Menunggu') AS pending_leave,
                  (SELECT ap.status FROM appraisals ap
                    WHERE ap.employee_id = e.id ORDER BY ap.id DESC LIMIT 1) AS appraisal_status,
                  (SELECT ap.final_score FROM appraisals ap
                    WHERE ap.employee_id = e.id AND ap.final_score IS NOT NULL
                    ORDER BY ap.id DESC LIMIT 1) AS last_score
           FROM employees e
           LEFT JOIN attendance a ON a.employee_id = e.id
           WHERE e.status = 'Aktif' AND e.manager_id = ?
           GROUP BY e.id
           ORDER BY e.full_name`,
          monthStart,
          monthStart,
          monthStart,
          session.employeeId,
        );

  const presentTotal = list.reduce((acc, m) => acc + Number(m.present), 0);
  const lateTotal = list.reduce((acc, m) => acc + Number(m.late), 0);
  const pendingLeaveTotal = list.reduce((acc, m) => acc + Number(m.pending_leave), 0);
  const rated = list.filter((m) => m.last_score !== null).length;

  return (
    <>
      <PageHeader
        title="Tim Saya"
        description={
          session.role === "hr"
            ? "Semua karyawan aktif di perusahaan"
            : "Anggota tim yang melapor langsung kepada Anda"
        }
      >
        <Link href="/cuti" className="btn btn-ghost">
          Persetujuan cuti
        </Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Anggota tim" value={list.length} hint="Karyawan aktif" icon="users" tone="indigo" />
        <StatCard
          label="Kehadiran bulan ini"
          value={presentTotal}
          hint={`${lateTotal} terlambat`}
          icon="clock"
          tone="emerald"
        />
        <StatCard
          label="Cuti menunggu"
          value={pendingLeaveTotal}
          hint="Perlu persetujuan"
          icon="calendar"
          tone="amber"
        />
        <StatCard
          label="Sudah dinilai"
          value={`${rated}/${list.length}`}
          hint="Penilaian terakhir"
          icon="check"
          tone="violet"
        />
      </div>

      <Card className="mt-5">
        <CardHeader
          title="Anggota tim"
          subtitle={`Rekap ${monthLabel(today.slice(0, 7))} · absensi, cuti, dan penilaian`}
        />
        {list.length === 0 ? (
          <EmptyState
            title="Belum ada anggota tim"
            description="Karyawan yang melapor kepada Anda akan muncul di sini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Karyawan</th>
                  <th className="th">Hadir</th>
                  <th className="th">Terlambat</th>
                  <th className="th">Alpha</th>
                  <th className="th">Cuti menunggu</th>
                  <th className="th">Penilaian</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/60">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <Avatar name={member.full_name} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{member.full_name}</p>
                          <p className="text-[11px] text-slate-500">{member.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td text-slate-600">{member.present} hari</td>
                    <td className="td text-slate-600">{member.late}</td>
                    <td className="td text-slate-600">{member.absent}</td>
                    <td className="td">
                      {member.pending_leave > 0 ? (
                        <Badge tone="amber">{member.pending_leave} pengajuan</Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="td">
                      {member.last_score === null ? (
                        <span className="text-slate-400">Belum</span>
                      ) : (
                        <span className="font-medium text-slate-900">{Number(member.last_score).toFixed(2)}</span>
                      )}
                    </td>
                    <td className="td text-right">
                      <Link
                        href={`/karyawan/${member.id}`}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        Profil →
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
