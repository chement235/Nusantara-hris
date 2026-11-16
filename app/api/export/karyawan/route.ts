import { getSession } from "@/lib/auth";
import { csvDocument } from "@/lib/csv";
import { all } from "@/lib/db";

export async function GET(): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (session.role !== "hr" && session.role !== "manager") {
    return new Response("Forbidden", { status: 403 });
  }

  const rows = all<{
    nip: string;
    full_name: string;
    department_name: string;
    position: string;
    job_level: string;
    employment_type: string;
    status: string;
    join_date: string;
    manager_name: string | null;
  }>(
    `SELECT e.nip, e.full_name, d.name AS department_name, e.position, e.job_level,
            e.employment_type, e.status, e.join_date, m.full_name AS manager_name
     FROM employees e
     JOIN departments d ON d.id = e.department_id
     LEFT JOIN employees m ON m.id = e.manager_id
     ORDER BY e.nip`,
  );

  const csv = csvDocument([
    ["NIP", "Nama", "Departemen", "Posisi", "Jenjang", "Jenis", "Status", "Bergabung", "Atasan"],
    ...rows.map((row) => [
      row.nip,
      row.full_name,
      row.department_name,
      row.position,
      row.job_level,
      row.employment_type,
      row.status,
      row.join_date,
      row.manager_name ?? "",
    ]),
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="direktori-karyawan.csv"',
      "Cache-Control": "no-store",
    },
  });
}
