import Link from "next/link";
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { rupiah } from "@/lib/format";

type Department = {
  id: number;
  code: string;
  name: string;
  head: string | null;
  head_id: number | null;
  total: number;
  active: number;
  base_salary: number;
};

type ReportNode = {
  id: number;
  full_name: string;
  position: string;
  level: string;
  manager_id: number | null;
  manager_name: string | null;
  status: string;
  nip: string;
};

export default async function OrganizationPage() {
  const session = await requireSession();

  const departments = all<Department>(
    `SELECT d.id, d.code, d.name,
            (SELECT h.full_name FROM employees h
              WHERE h.department_id = d.id
                AND h.job_level IN ('Head','Manager','Direktur')
              ORDER BY h.id LIMIT 1) AS head,
            (SELECT h.id FROM employees h
              WHERE h.department_id = d.id
                AND h.job_level IN ('Head','Manager','Direktur')
              ORDER BY h.id LIMIT 1) AS head_id,
            COUNT(e.id) AS total,
            SUM(CASE WHEN e.status = 'Aktif' THEN 1 ELSE 0 END) AS active,
            COALESCE(SUM(e.base_salary), 0) AS base_salary
     FROM departments d
     LEFT JOIN employees e ON e.department_id = d.id
     GROUP BY d.id
     ORDER BY d.name`,
  );

  const totalActive = Number(
    one<{ c: number }>(`SELECT COUNT(*) AS c FROM employees WHERE status = 'Aktif'`)?.c ?? 0,
  );
  const totalDepartments = departments.length;

  const tree = all<ReportNode>(
    `SELECT e.id, e.full_name, e.position, e.job_level, e.manager_id, e.status, e.nip,
            m.full_name AS manager_name
     FROM employees e
     LEFT JOIN employees m ON m.id = e.manager_id
     ORDER BY e.department_id, e.manager_id, e.id`,
  );

  const byManager = new Map<number | null, ReportNode[]>();
  for (const node of tree) {
    const key = Number(node.manager_id) || null;
    const list = byManager.get(key) ?? [];
    list.push(node);
    byManager.set(key, list);
  }

  const roots = byManager.get(null) ?? [];
  const seen = new Set<number>();

  function renderNode(node: ReportNode, depth: number) {
    if (seen.has(node.id)) return null;
    seen.add(node.id);
    const children = byManager.get(node.id) ?? [];
    return (
      <div key={node.id} className={depth > 0 ? "border-l border-slate-200 pl-4" : ""}>
        <div className="flex items-center gap-3 py-2">
          <Avatar name={node.full_name} size="sm" />
          <div className="min-w-0 flex-1">
            <Link href={`/karyawan/${node.id}`} className="text-sm font-medium text-slate-900 hover:text-indigo-600">
              {node.full_name}
            </Link>
            <p className="truncate text-[11px] text-slate-500">
              {node.position} · {node.nip}
            </p>
          </div>
          <Badge tone={node.status === "Aktif" ? "emerald" : "slate"}>{node.status}</Badge>
        </div>
        {children.length > 0 && <div className="ml-4">{children.map((child) => renderNode(child, depth + 1))}</div>}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Struktur Organisasi"
        description="Peta departemen dan garis pelaporan Nusantara Digital"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Departemen" value={totalDepartments} hint="Unit organisasi" icon="building" tone="indigo" />
        <StatCard label="Karyawan aktif" value={totalActive} hint="Seluruh departemen" icon="users" tone="emerald" />
        <StatCard
          label="Total gaji pokok/bulan"
          value={rupiah(departments.reduce((acc, d) => acc + Number(d.base_salary), 0))}
          hint="Beban dasar perusahaan"
          icon="wallet"
          tone="violet"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Direktori departemen" subtitle={`${totalDepartments} unit`} />
          <ul className="divide-y divide-slate-100">
            {departments.map((dept) => (
              <li key={dept.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/organisasi/${dept.id}`}
                      className="text-sm font-medium text-slate-900 hover:text-indigo-600"
                    >
                      {dept.name}
                    </Link>
                    <p className="text-[11px] text-slate-500">
                      {dept.head ? `Kepala: ${dept.head}` : "Tanpa kepala terdaftar"}
                    </p>
                  </div>
                  <Badge tone="indigo">{dept.active} aktif</Badge>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${totalActive ? Math.min(100, (dept.active / totalActive) * 100) : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Garis pelaporan"
            subtitle="Hierarki atasan → bawahan berdasarkan data manager_id"
          />
          {tree.length === 0 ? (
            <EmptyState title="Belum ada data organisasi" />
          ) : (
            <div className="px-5 py-3">
              {roots.length === 0 && (
                <p className="pb-2 text-xs text-slate-500">
                  Tidak ada karyawan tanpa atasan langsung; menampilkan seluruh karyawan.
                </p>
              )}
              {(roots.length > 0 ? roots : tree).map((node) => renderNode(node, 0))}
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader
          title="Kapasitas per departemen"
          subtitle="Jumlah karyawan dan beban gaji pokok bulanan"
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Departemen</th>
                <th className="th">Kode</th>
                <th className="th">Karyawan</th>
                <th className="th">Aktif</th>
                <th className="th">Gaji pokok/bulan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-slate-50/60">
                  <td className="td">
                    <Link
                      href={`/organisasi/${dept.id}`}
                      className="font-medium text-slate-900 hover:text-indigo-600"
                    >
                      {dept.name}
                    </Link>
                  </td>
                  <td className="td font-mono text-xs text-slate-500">{dept.code}</td>
                  <td className="td text-slate-600">{dept.total}</td>
                  <td className="td text-slate-600">{dept.active}</td>
                  <td className="td">{rupiah(Number(dept.base_salary))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
