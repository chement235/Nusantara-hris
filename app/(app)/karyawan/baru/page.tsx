import Link from "next/link";
import { Card, CardHeader, Field, PageHeader } from "@/components/ui";
import { createEmployeeAction } from "@/lib/actions";
import { requireRole } from "@/lib/auth";
import { all } from "@/lib/db";
import { todayISO } from "@/lib/format";

export default async function NewEmployeePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole(["hr"]);
  const { error } = await searchParams;

  const departments = all<{ id: number; name: string }>(
    "SELECT id, name FROM departments ORDER BY name",
  );
  const managers = all<{ id: number; full_name: string; position: string }>(
    "SELECT id, full_name, position FROM employees WHERE status = 'Aktif' ORDER BY full_name",
  );

  return (
    <>
      <PageHeader title="Tambah Karyawan" description="Lengkapi data kepegawaian karyawan baru.">
        <Link href="/karyawan" className="btn btn-ghost">
          Batal
        </Link>
      </PageHeader>

      {error && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <form action={createEmployeeAction} className="space-y-5">
        <Card>
          <CardHeader title="Data pribadi" subtitle="Informasi dasar karyawan" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Nama lengkap" name="full_name" required placeholder="Nama sesuai KTP" />
            <Field label="Email perusahaan" name="email" type="email" required placeholder="nama@nusantara.co.id" />
            <Field label="Nomor telepon" name="phone" placeholder="0812-xxxx-xxxx" />
            <Field label="Tanggal lahir" name="birth_date" type="date" />
            <Field label="Alamat" name="address" placeholder="Jl. ..." className="sm:col-span-2" />
            <div>
              <label className="label" htmlFor="marital_status">
                Status PTKP
              </label>
              <select id="marital_status" name="marital_status" className="input" defaultValue="TK/0">
                {["TK/0", "TK/1", "TK/2", "TK/3", "K/0", "K/1", "K/2", "K/3"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Data kepegawaian" subtitle="Posisi, departemen, dan kontrak" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="department_id">
                Departemen
              </label>
              <select id="department_id" name="department_id" className="input" required>
                <option value="">Pilih departemen</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Jabatan" name="position" required placeholder="Contoh: Backend Engineer" />
            <div>
              <label className="label" htmlFor="job_level">
                Level jabatan
              </label>
              <select id="job_level" name="job_level" className="input" defaultValue="Staff">
                {["Staff", "Senior", "Head", "Intern"].map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="employment_type">
                Jenis kepegawaian
              </label>
              <select id="employment_type" name="employment_type" className="input" defaultValue="Tetap">
                {["Tetap", "Kontrak", "Magang"].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Tanggal bergabung" name="join_date" type="date" required defaultValue={todayISO()} />
            <Field label="Berakhir kontrak (opsional)" name="contract_end" type="date" />
            <div className="sm:col-span-2">
              <label className="label" htmlFor="manager_id">
                Atasan langsung
              </label>
              <select id="manager_id" name="manager_id" className="input" defaultValue="">
                <option value="">Tanpa atasan langsung</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.full_name} — {manager.position}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Komponen gaji" subtitle="Gaji pokok dan tunjangan tetap per bulan" />
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <Field label="Gaji pokok (Rp)" name="base_salary" type="number" required placeholder="10000000" min="1" step="100000" />
            <Field label="Tunjangan transport (Rp)" name="allowance_transport" type="number" defaultValue={650000} step="50000" />
            <Field label="Tunjangan makan (Rp)" name="allowance_meal" type="number" defaultValue={500000} step="50000" />
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Link href="/karyawan" className="btn btn-ghost">
            Batal
          </Link>
          <button type="submit" className="btn btn-primary">
            Simpan karyawan
          </button>
        </div>
      </form>
    </>
  );
}
