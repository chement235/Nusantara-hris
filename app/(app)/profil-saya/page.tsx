import Link from "next/link";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { updateMyProfileAction } from "@/lib/actions";
import { requireSession } from "@/lib/auth";
import { one } from "@/lib/db";
import { dateID } from "@/lib/format";
import type { EmployeeRow } from "@/lib/types";

export default async function MyProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  const profile = one<EmployeeRow>(
    `SELECT e.*, d.name AS department_name, d.code AS department_code,
            m.full_name AS manager_name
     FROM employees e
     JOIN departments d ON d.id = e.department_id
     LEFT JOIN employees m ON m.id = e.manager_id
     WHERE e.id = ?`,
    session.employeeId,
  );

  if (!profile) {
    return (
      <PageHeader title="Profil Saya" description="Data Anda tidak ditemukan." />
    );
  }

  const personal = [
    { label: "Nama lengkap", value: profile.full_name },
    { label: "NIP", value: profile.nip },
    { label: "Email", value: profile.email },
    { label: "Posisi", value: profile.position },
    { label: "Departemen", value: profile.department_name },
    { label: "Atasan langsung", value: profile.manager_name ?? "—" },
    { label: "Status kerja", value: `${profile.status} · ${profile.employment_type}` },
    { label: "Bergabung", value: profile.join_date ? dateID(profile.join_date) : "—" },
    { label: "Status PTKP", value: profile.marital_status },
    { label: "Tanggal lahir", value: profile.birth_date ? dateID(profile.birth_date) : "—" },
  ];

  return (
    <>
      <PageHeader
        title="Profil Saya"
        description="Kelola data pribadi dan kontak darurat Anda (ESS)"
      >
        {session.role !== "hr" ? (
          <Link href="/payroll" className="btn btn-ghost">
            Slip gaji saya
          </Link>
        ) : (
          <Link href={`/karyawan/${session.employeeId}`} className="btn btn-ghost">
            Lihat sebagai HR
          </Link>
        )}
      </PageHeader>

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

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Data pribadi" subtitle="Tercatat di sistem kepegawaian" />
          <dl className="divide-y divide-slate-100">
            {personal.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-4 px-5 py-3">
                <dt className="text-sm text-slate-500">{row.label}</dt>
                <dd className="text-right text-sm font-medium text-slate-900">{row.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Kontak & kontak darurat"
            subtitle="Anda dapat memperbarui sendiri; perubahan dicatat di audit trail"
            action={<Badge tone="indigo">ESS</Badge>}
          />
          <form action={updateMyProfileAction} className="space-y-4 p-5">
            <div>
              <label className="label" htmlFor="phone">
                Nomor telepon
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="input"
                defaultValue={profile.phone ?? ""}
                placeholder="08xx-xxxx-xxxx"
              />
            </div>
            <div>
              <label className="label" htmlFor="address">
                Alamat domisili
              </label>
              <textarea
                id="address"
                name="address"
                rows={3}
                className="input resize-none"
                defaultValue={profile.address ?? ""}
                placeholder="Alamat lengkap sesuai KTP..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="emergency_name">
                  Nama kontak darurat
                </label>
                <input
                  id="emergency_name"
                  name="emergency_name"
                  className="input"
                  defaultValue={profile.emergency_name ?? ""}
                  placeholder="Nama kerabat terdekat"
                />
              </div>
              <div>
                <label className="label" htmlFor="emergency_phone">
                  Telepon darurat
                </label>
                <input
                  id="emergency_phone"
                  name="emergency_phone"
                  type="tel"
                  className="input"
                  defaultValue={profile.emergency_phone ?? ""}
                  placeholder="08xx-xxxx-xxxx"
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full">
              Simpan perubahan
            </button>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Nomor rekening dan NPWP tidak dapat diubah dari sini demi keamanan data — silakan
              ajukan perubahan kepada HR.
            </p>
          </form>
        </Card>
      </div>
    </>
  );
}
