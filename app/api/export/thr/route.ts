import { getSession } from "@/lib/auth";
import { csvDocument } from "@/lib/csv";
import { all } from "@/lib/db";
import { thrFor } from "@/lib/payroll";

export async function GET(): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (session.role !== "hr") {
    return new Response("Forbidden", { status: 403 });
  }

  const employees = all<{
    nip: string;
    full_name: string;
    department_name: string;
    join_date: string;
    base_salary: number;
    allowance_transport: number;
    allowance_meal: number;
  }>(
    `SELECT e.nip, e.full_name, d.name AS department_name, e.join_date,
            e.base_salary, e.allowance_transport, e.allowance_meal
     FROM employees e
     JOIN departments d ON d.id = e.department_id
     WHERE e.status = 'Aktif'
     ORDER BY e.full_name`,
  );

  const rows = employees.map((employee) => {
    const thr = thrFor(employee);
    return [
      employee.nip,
      employee.full_name,
      employee.department_name,
      employee.join_date,
      thr.months_worked,
      thr.monthly_wage,
      thr.prorated ? "Proporsional" : "1 bulan penuh",
      thr.amount,
    ];
  });

  const csv = csvDocument([
    ["NIP", "Nama", "Departemen", "Bergabung", "Masa kerja (bulan)", "Upah/bulan", "Kategori", "THR"],
    ...rows,
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="thr-keagamaan.csv"',
      "Cache-Control": "no-store",
    },
  });
}
