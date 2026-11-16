import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { rupiah } from "@/lib/format";

type DepartmentDetail = {
  id: number;
  code: string;
  name: string;
};

type Member = {
  id: number;
  full_name: string;
  nip: string;
  position: string;
  job_level: string;
  employment_type: string;
  status: string;
  join_date: string;
  base_salary: number;
  allowance_transport: number;
  allowance_meal: number;
  manager_name: string | null;
};

export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const departmentId = Number(id);
  if (!Number.isFinite(departmentId)) notFound();

  const department = one<DepartmentDetail>("SELECT id, code, name FROM departments WHERE id = ?", departmentId);
  if (!department) notFound();

  const members = all<Member>(
    `SELECT e.id, e.full_name, e.nip, e.position, e.job_level, e.employment_type,
            e.status, e.join_date, e.base_salary, e.allowance_transport, e.allowance_meal,
            m.full_name AS manager_name
     FROM employees e
     LEFT JOIN employees m ON m.id = e.manager_id
     WHERE e.department_id = ?
     ORDER BY e.status DESC, e.full_name`,
    departmentId,
  );

  const active = members.filter((member) => member.status === "Aktif");
  const totalSalary = active.reduce(
    (acc, member) => acc + Number(member.base_salary) + Number(member.allowance_transport) + Number(member.allowance_meal),
    0,
  );
  const positions = new Set(members.map((member) => member.position));

  return (
    <>
      <PageHeader
        title={department.name}
        description={`Departemen ${department.code} · detail anggota dan beban kompensasi`}
      >
        <Link href="/organisasi" className="btn btn-ghost">
          ← Struktur organisasi
        </Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total karyawan" value={members.length} hint={`${active.length} aktif`} icon="users" tone="indigo" />
        <StatCard label="Posisi" value={positions.size} hint="Jenis jabatan" icon="layers" tone="sky" />
        <StatCard
          label="Kompensasi aktif/bulan"
          value={rupiah(totalSalary)}
          hint="Gaji pokok + tunjangan tetap"
          icon="wallet"
          tone="violet"
        />
      </div>

      <Card className="mt-5">
        <CardHeader title="Anggota departemen" subtitle={`${members.length} karyawan terdaftar`} />
        {members.length === 0 ? (
          <EmptyState title="Belum ada anggota" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Karyawan</th>
                  <th className="th">Posisi</th>
                  <th className="th">Jenjang</th>
                  <th className="th">Atasan</th>
                  <th className="th">Jenis</th>
                  <th className="th">Status</th>
                  <th className="th">Kompensasi</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/60">
                    <td className="td">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={member.full_name} size="sm" />
                        <div className="leading-tight">
                          <p className="text-sm font-medium text-slate-900">{member.full_name}</p>
                          <p className="text-[11px] text-slate-500">{member.nip}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td text-slate-600">{member.position}</td>
                    <td className="td text-slate-600">{member.job_level}</td>
                    <td className="td text-slate-600">{member.manager_name ?? "—"}</td>
                    <td className="td text-slate-600">{member.employment_type}</td>
                    <td className="td">
                      <Badge tone={member.status === "Aktif" ? "emerald" : "slate"}>{member.status}</Badge>
                    </td>
                    <td className="td">
                      {rupiah(Number(member.base_salary) + Number(member.allowance_transport) + Number(member.allowance_meal))}
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
