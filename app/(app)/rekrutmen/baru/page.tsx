import Link from "next/link";
import { Card, CardHeader, Field, PageHeader } from "@/components/ui";
import { createOpeningAction } from "@/lib/recruitment-actions";
import { requireRole } from "@/lib/auth";
import { all } from "@/lib/db";
import { todayISO } from "@/lib/format";

export default async function NewOpeningPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole(["hr"]);
  const { error } = await searchParams;

  const departments = all<{ id: number; name: string }>(
    "SELECT id, name FROM departments ORDER BY name",
  );

  return (
    <>
      <PageHeader title="Lowongan Baru" description="Buka posisi baru dan mulai kumpulkan pelamar.">
        <Link href="/rekrutmen" className="btn btn-ghost">
          Batal
        </Link>
      </PageHeader>

      {error && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <form action={createOpeningAction} className="space-y-5">
        <Card>
          <CardHeader title="Detail posisi" subtitle="Informasi dasar lowongan" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field
              label="Judul posisi"
              name="title"
              required
              placeholder="Contoh: Senior Backend Engineer"
              className="sm:col-span-2"
            />
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
            <Field label="Lokasi kerja" name="location" defaultValue="Jakarta" />
            <Field
              label="Jumlah dibutuhkan"
              name="headcount"
              type="number"
              min="1"
              max="50"
              defaultValue={1}
              required
            />
            <Field label="Tanggal dibuka" name="opened_at" type="date" defaultValue={todayISO()} className="sm:col-span-2" />
          </div>
          <p className="px-5 pb-4 text-[11px] text-slate-500">
            Tanggal dibuka mengikuti tanggal hari ini saat lowongan disimpan.
          </p>
        </Card>

        <Card>
          <CardHeader title="Deskripsi & kualifikasi" subtitle="Tampil di halaman pipeline rekruter" />
          <div className="grid gap-4 p-5">
            <div>
              <label className="label" htmlFor="description">
                Deskripsi pekerjaan
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="input"
                placeholder="Tanggung jawab utama posisi ini..."
              />
            </div>
            <div>
              <label className="label" htmlFor="requirements">
                Kualifikasi
              </label>
              <textarea
                id="requirements"
                name="requirements"
                rows={4}
                className="input"
                placeholder="Pengalaman, keahlian, dan kualifikasi yang dibutuhkan..."
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Link href="/rekrutmen" className="btn btn-ghost">
            Batal
          </Link>
          <button type="submit" className="btn btn-primary">
            Simpan lowongan
          </button>
        </div>
      </form>
    </>
  );
}
