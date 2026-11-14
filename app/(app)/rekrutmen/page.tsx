import Link from "next/link";
import { Badge, Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { dateID } from "@/lib/format";
import type { JobOpeningRow } from "@/lib/types";

type OpeningWithCounts = JobOpeningRow & {
  applicant_count: number;
  interview_count: number;
  hired_count: number;
};

export default async function RecruitmentPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const session = await requireRole(["hr", "manager"]);
  const params = await searchParams;

  const openings = all<OpeningWithCounts>(
    `SELECT jo.*, d.name AS department_name,
            (SELECT COUNT(*) FROM applicants a WHERE a.job_opening_id = jo.id) AS applicant_count,
            (SELECT COUNT(*) FROM applicants a WHERE a.job_opening_id = jo.id
              AND a.stage IN ('Interview', 'Penawaran')) AS interview_count,
            (SELECT COUNT(*) FROM applicants a WHERE a.job_opening_id = jo.id
              AND a.stage = 'Diterima') AS hired_count
     FROM job_openings jo
     JOIN departments d ON d.id = jo.department_id
     ORDER BY CASE jo.status WHEN 'Dibuka' THEN 0 ELSE 1 END, jo.opened_at DESC`,
  );

  const openCount = openings.filter((opening) => opening.status === "Dibuka").length;
  const totalApplicants = Number(
    one<{ c: number }>("SELECT COUNT(*) AS c FROM applicants")?.c ?? 0,
  );
  const inPipeline = Number(
    one<{ c: number }>(
      "SELECT COUNT(*) AS c FROM applicants WHERE stage IN ('Baru', 'Screening', 'Interview', 'Penawaran')",
    )?.c ?? 0,
  );
  const hired = Number(
    one<{ c: number }>("SELECT COUNT(*) AS c FROM applicants WHERE stage = 'Diterima'")?.c ?? 0,
  );

  return (
    <>
      <PageHeader
        title="Rekrutmen"
        description="Lowongan, pipeline pelamar, dan konversi kandidat menjadi karyawan"
      >
        {session.role === "hr" && (
          <Link href="/rekrutmen/baru" className="btn btn-primary">
            + Lowongan baru
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Lowongan dibuka"
          value={openCount}
          hint={`${openings.length} total lowongan`}
          icon="briefcase"
          tone="indigo"
        />
        <StatCard
          label="Total pelamar"
          value={totalApplicants}
          hint="Seluruh lowongan"
          icon="users"
          tone="sky"
        />
        <StatCard
          label="Dalam pipeline"
          value={inPipeline}
          hint="Baru sampai penawaran"
          icon="clock"
          tone="amber"
        />
        <StatCard
          label="Diterima"
          value={hired}
          hint="Siap dikonversi jadi karyawan"
          icon="check"
          tone="emerald"
        />
      </div>

      <Card className="mt-5">
        <CardHeader title="Daftar lowongan" subtitle="Klik lowongan untuk melihat pipeline pelamar" />
        {openings.length === 0 ? (
          <EmptyState
            title="Belum ada lowongan"
            description="Buat lowongan pertama untuk mulai menerima pelamar."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Posisi</th>
                  <th className="th">Departemen</th>
                  <th className="th">Tipe</th>
                  <th className="th">Pelamar</th>
                  <th className="th">Interview</th>
                  <th className="th">Diterima</th>
                  <th className="th">Status</th>
                  <th className="th">Dibuka</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {openings.map((opening) => (
                  <tr key={opening.id} className="hover:bg-slate-50/60">
                    <td className="td">
                      <Link
                        href={`/rekrutmen/${opening.id}`}
                        className="font-medium text-slate-900 hover:text-indigo-600"
                      >
                        {opening.title}
                      </Link>
                      <p className="text-[11px] text-slate-500">
                        {opening.location} · butuh {opening.headcount} orang
                      </p>
                    </td>
                    <td className="td text-slate-600">{opening.department_name}</td>
                    <td className="td text-slate-600">{opening.employment_type}</td>
                    <td className="td text-slate-600">{opening.applicant_count}</td>
                    <td className="td text-slate-600">{opening.interview_count}</td>
                    <td className="td text-slate-600">{opening.hired_count}</td>
                    <td className="td">
                      <Badge tone={opening.status === "Dibuka" ? "emerald" : "slate"}>
                        {opening.status}
                      </Badge>
                    </td>
                    <td className="td whitespace-nowrap text-slate-600">
                      {dateID(opening.opened_at)}
                    </td>
                    <td className="td text-right">
                      <Link
                        href={`/rekrutmen/${opening.id}`}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        Pipeline →
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
