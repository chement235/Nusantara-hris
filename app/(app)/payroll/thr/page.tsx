import Link from "next/link";
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { all } from "@/lib/db";
import { dateID, rupiah, todayISO } from "@/lib/format";
import { thrFor } from "@/lib/payroll";

type ThrEmployee = {
  id: number;
  full_name: string;
  nip: string;
  position: string;
  department_name: string;
  join_date: string;
  base_salary: number;
  allowance_transport: number;
  allowance_meal: number;
};

export default async function ThrPage() {
  await requireRole(["hr"]);
  const today = todayISO();

  const employees = all<ThrEmployee>(
    `SELECT e.id, e.full_name, e.nip, e.position, e.join_date,
            e.base_salary, e.allowance_transport, e.allowance_meal,
            d.name AS department_name
     FROM employees e
     JOIN departments d ON d.id = e.department_id
     WHERE e.status = 'Aktif'
     ORDER BY e.full_name`,
  );

  const rows = employees.map((employee) => ({
    ...employee,
    ...thrFor(employee, today),
  }));
  const total = rows.reduce((acc, row) => acc + row.amount, 0);
  const prorated = rows.filter((row) => row.prorated).length;

  return (
    <>
      <PageHeader
        title="THR Keagamaan"
        description="Estimasi tunjangan hari raya sesuai UU 13/2003 dan Permenaker 6/2016"
      >
        <Link href="/payroll" className="btn btn-ghost">
          ← Payroll
        </Link>
        <a href="/api/export/thr" className="btn btn-primary">
          Unduh CSV
        </a>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total THR" value={rupiah(total)} hint={`Per ${dateID(today)}`} icon="wallet" tone="violet" />
        <StatCard label="Karyawan berhak" value={rows.length} hint="Karyawan aktif" icon="users" tone="indigo" />
        <StatCard label="Proporsional" value={prorated} hint="Masa kerja kurang dari 12 bulan" icon="clock" tone="amber" />
      </div>

      <Card className="mt-5">
        <CardHeader
          title="Rincian THR per karyawan"
          subtitle="Upah sebulan = gaji pokok + tunjangan tetap · proporsional untuk masa kerja 1–11 bulan"
        />
        {rows.length === 0 ? (
          <EmptyState title="Belum ada karyawan aktif" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Karyawan</th>
                  <th className="th">Departemen</th>
                  <th className="th">Bergabung</th>
                  <th className="th">Masa kerja</th>
                  <th className="th">Upah/bulan</th>
                  <th className="th">Kategori</th>
                  <th className="th">THR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60">
                    <td className="td">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={row.full_name} size="sm" />
                        <div className="leading-tight">
                          <p className="text-sm font-medium text-slate-900">{row.full_name}</p>
                          <p className="text-[11px] text-slate-500">{row.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td text-slate-600">{row.department_name}</td>
                    <td className="td text-slate-600">{dateID(row.join_date)}</td>
                    <td className="td text-slate-600">{row.months_worked} bulan</td>
                    <td className="td">{rupiah(row.monthly_wage)}</td>
                    <td className="td">
                      {row.prorated ? (
                        <Badge tone="amber">Proporsional</Badge>
                      ) : (
                        <Badge tone="emerald">1 bulan penuh</Badge>
                      )}
                    </td>
                    <td className="td font-medium text-slate-900">{rupiah(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td className="td font-semibold text-slate-900" colSpan={6}>
                    Total THR keagamaan
                  </td>
                  <td className="td font-semibold text-slate-900">{rupiah(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Karyawan dengan masa kerja 12 bulan atau lebih menerima satu bulan upah penuh; masa kerja
        1–11 bulan menerima proporsional (bulan kerja ÷ 12 × upah sebulan). Angka ini estimasi —
        jadwal pembayaran dan pemotongan pajak THR (bila PPh 21 dipotong terpisah) tetap mengikuti
        kebijakan perusahaan dan aturan yang berlaku.
      </p>
    </>
  );
}
