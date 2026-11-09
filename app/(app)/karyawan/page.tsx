import Link from "next/link";
import { Avatar, Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { dateID } from "@/lib/format";

type DirectoryRow = {
  id: number;
  nip: string;
  full_name: string;
  email: string;
  position: string;
  department_name: string;
  employment_type: string;
  status: string;
  join_date: string;
  contract_end: string | null;
};

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; dept?: string; status?: string; ok?: string; error?: string }>;
}) {
  const session = await requireSession();
  const { q = "", dept = "", status = "Aktif", ok, error } = await searchParams;

  const departments = all<{ id: number; name: string }>(
    "SELECT id, name FROM departments ORDER BY name",
  );

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (q.trim()) {
    conditions.push("(e.full_name LIKE ? OR e.nip LIKE ? OR e.email LIKE ? OR e.position LIKE ?)");
    const term = `%${q.trim()}%`;
    params.push(term, term, term, term);
  }
  if (dept) {
    conditions.push("e.department_id = ?");
    params.push(Number(dept));
  }
  if (status && status !== "Semua") {
    conditions.push("e.status = ?");
    params.push(status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const employees = all<DirectoryRow>(
    `SELECT e.id, e.nip, e.full_name, e.email, e.position, d.name AS department_name,
            e.employment_type, e.status, e.join_date, e.contract_end
     FROM employees e
     JOIN departments d ON d.id = e.department_id
     ${where}
     ORDER BY e.full_name`,
    ...params,
  );

  const totalActive = Number(
    one<{ c: number }>("SELECT COUNT(*) AS c FROM employees WHERE status = 'Aktif'")?.c ?? 0,
  );
  const totalContract = Number(
    one<{ c: number }>(
      "SELECT COUNT(*) AS c FROM employees WHERE employment_type != 'Tetap' AND status = 'Aktif'",
    )?.c ?? 0,
  );

  return (
    <>
      <PageHeader title="Data Karyawan" description={`${totalActive} karyawan aktif · ${totalContract} kontrak & magang`}>
        {session.role === "hr" && (
          <Link href="/karyawan/baru" className="btn btn-primary">
            + Tambah karyawan
          </Link>
        )}
      </PageHeader>

      {ok && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {ok}
        </div>
      )}
      {error && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <Card>
        <form className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="label" htmlFor="q">
              Cari karyawan
            </label>
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Nama, NIP, email, atau jabatan"
              className="input"
            />
          </div>
          <div className="sm:w-52">
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
          <div className="sm:w-40">
            <label className="label" htmlFor="status">
              Status
            </label>
            <select id="status" name="status" defaultValue={status} className="input">
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
              <option value="Semua">Semua</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary sm:w-auto">
            Terapkan
          </button>
        </form>

        {employees.length === 0 ? (
          <EmptyState
            title="Tidak ada karyawan yang cocok"
            description="Coba ubah kata kunci atau filter departemen."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Karyawan</th>
                  <th className="th">NIP</th>
                  <th className="th">Jabatan</th>
                  <th className="th">Departemen</th>
                  <th className="th">Status</th>
                  <th className="th">Bergabung</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-slate-50/60">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <Avatar name={employee.full_name} />
                        <div className="leading-tight">
                          <Link
                            href={`/karyawan/${employee.id}`}
                            className="text-sm font-medium text-slate-900 hover:text-indigo-600"
                          >
                            {employee.full_name}
                          </Link>
                          <p className="text-[11px] text-slate-500">{employee.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td whitespace-nowrap font-mono text-xs text-slate-500">
                      {employee.nip}
                    </td>
                    <td className="td">{employee.position}</td>
                    <td className="td text-slate-600">{employee.department_name}</td>
                    <td className="td">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={employee.employment_type === "Tetap" ? "emerald" : "amber"}>
                          {employee.employment_type}
                        </Badge>
                        {employee.status !== "Aktif" && <Badge tone="slate">{employee.status}</Badge>}
                      </div>
                    </td>
                    <td className="td whitespace-nowrap text-slate-600">{dateID(employee.join_date)}</td>
                    <td className="td text-right">
                      <Link
                        href={`/karyawan/${employee.id}`}
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
        <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          Menampilkan {employees.length} karyawan
        </div>
      </Card>
    </>
  );
}
