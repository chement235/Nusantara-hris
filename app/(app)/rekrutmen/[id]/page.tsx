import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui";
import {
  addApplicantAction,
  closeOpeningAction,
  moveApplicantStageAction,
} from "@/lib/recruitment-actions";
import { APPLICANT_STAGES, STAGE_TONE } from "@/lib/recruitment";
import { requireRole } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { dateID } from "@/lib/format";
import type { ApplicantRow, JobOpeningRow } from "@/lib/types";

type OpeningDetail = JobOpeningRow & { creator_name: string | null };

export default async function OpeningDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const session = await requireRole(["hr", "manager"]);
  const { id } = await params;
  const feedback = await searchParams;
  const openingId = Number(id);
  if (!Number.isFinite(openingId)) notFound();

  const opening = one<OpeningDetail>(
    `SELECT jo.*, d.name AS department_name, c.full_name AS creator_name
     FROM job_openings jo
     JOIN departments d ON d.id = jo.department_id
     LEFT JOIN employees c ON c.id = jo.created_by
     WHERE jo.id = ?`,
    openingId,
  );
  if (!opening) notFound();

  const applicants = all<ApplicantRow>(
    `SELECT * FROM applicants WHERE job_opening_id = ? ORDER BY applied_at DESC, id DESC`,
    openingId,
  );

  const counts = APPLICANT_STAGES.map((stage) => ({
    stage,
    count: applicants.filter((applicant) => applicant.stage === stage).length,
  }));
  const active = applicants.filter(
    (applicant) => !["Diterima", "Ditolak"].includes(applicant.stage),
  ).length;

  return (
    <>
      <PageHeader title={opening.title} description={`${opening.department_name} · ${opening.location}`}>
        <Link href="/rekrutmen" className="btn btn-ghost">
          ← Kembali
        </Link>
        <Badge tone={opening.status === "Dibuka" ? "emerald" : "slate"}>{opening.status}</Badge>
        {session.role === "hr" && opening.status === "Dibuka" && (
          <form action={closeOpeningAction}>
            <input type="hidden" name="job_opening_id" value={opening.id} />
            <button type="submit" className="btn btn-danger">
              Tutup lowongan
            </button>
          </form>
        )}
      </PageHeader>

      {feedback.ok && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {feedback.ok}
        </div>
      )}
      {feedback.error && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {feedback.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total pelamar"
          value={applicants.length}
          hint={`${active} masih berproses`}
          icon="users"
          tone="indigo"
        />
        <StatCard
          label="Butuh"
          value={opening.headcount}
          hint={`${counts.find((row) => row.stage === "Diterima")?.count ?? 0} sudah diterima`}
          icon="briefcase"
          tone="sky"
        />
        <StatCard
          label="Dibuka"
          value={dateID(opening.opened_at)}
          hint={opening.creator_name ? `oleh ${opening.creator_name}` : ""}
          icon="calendar"
          tone="amber"
        />
        <StatCard
          label="Tipe"
          value={opening.employment_type}
          hint={opening.status === "Ditutup" && opening.closed_at ? `Ditutup ${dateID(opening.closed_at)}` : "Rekrutmen aktif"}
          icon="check"
          tone="emerald"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Pipeline pelamar" subtitle={`${applicants.length} kandidat`} />
          {applicants.length === 0 ? (
            <EmptyState title="Belum ada pelamar" description="Tambahkan kandidat lewat formulir di samping." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {applicants.map((applicant) => (
                <li key={applicant.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                  <Avatar name={applicant.full_name} size="sm" />
                  <div className="min-w-[180px] flex-1 leading-tight">
                    <p className="text-sm font-medium text-slate-900">{applicant.full_name}</p>
                    <p className="text-[11px] text-slate-500">
                      {applicant.email}
                      {applicant.source ? ` · ${applicant.source}` : ""} · {dateID(applicant.applied_at)}
                    </p>
                    {applicant.notes && (
                      <p className="mt-1 text-[11px] text-slate-500">{applicant.notes}</p>
                    )}
                  </div>
                  {applicant.rating !== null && (
                    <Badge tone="amber">★ {applicant.rating}/5</Badge>
                  )}
                  <Badge tone={STAGE_TONE[applicant.stage as keyof typeof STAGE_TONE] ?? "slate"}>
                    {applicant.stage}
                  </Badge>
                  {applicant.employee_id && (
                    <Link
                      href={`/karyawan/${applicant.employee_id}`}
                      className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      Lihat karyawan →
                    </Link>
                  )}
                  {session.role === "hr" && (
                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                      <form action={moveApplicantStageAction} className="flex items-center gap-1.5">
                        <input type="hidden" name="applicant_id" value={applicant.id} />
                        <select
                          name="stage"
                          defaultValue={applicant.stage}
                          className="input w-auto py-1.5 text-xs"
                          aria-label={`Tahap ${applicant.full_name}`}
                        >
                          {APPLICANT_STAGES.map((stage) => (
                            <option key={stage} value={stage}>
                              {stage}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="btn btn-ghost btn-sm">
                          Simpan
                        </button>
                      </form>
                      {!applicant.employee_id && applicant.stage !== "Ditolak" && (
                        <Link
                          href={`/karyawan/baru?from_applicant=${applicant.id}`}
                          className="btn btn-primary btn-sm"
                        >
                          Terima
                        </Link>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Ringkasan tahap" subtitle="Distribusi kandidat" />
            <div className="space-y-2.5 p-5">
              {counts.map((row) => (
                <div key={row.stage} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{row.stage}</span>
                  <span className="font-medium text-slate-900">{row.count}</span>
                </div>
              ))}
            </div>
          </Card>

          {session.role === "hr" && opening.status === "Dibuka" && (
            <Card>
              <CardHeader title="Tambah pelamar" subtitle="Masukkan kandidat baru" />
              <form action={addApplicantAction} className="space-y-3 p-5">
                <input type="hidden" name="job_opening_id" value={opening.id} />
                <div>
                  <label className="label" htmlFor="full_name">
                    Nama lengkap
                  </label>
                  <input id="full_name" name="full_name" className="input" required placeholder="Nama kandidat" />
                </div>
                <div>
                  <label className="label" htmlFor="email">
                    Email
                  </label>
                  <input id="email" name="email" type="email" className="input" required placeholder="nama@email.com" />
                </div>
                <div>
                  <label className="label" htmlFor="phone">
                    Telepon
                  </label>
                  <input id="phone" name="phone" className="input" placeholder="0812-xxxx-xxxx" />
                </div>
                <div>
                  <label className="label" htmlFor="source">
                    Sumber
                  </label>
                  <select id="source" name="source" className="input" defaultValue="Job portal">
                    {["Job portal", "LinkedIn", "Referral", "Kampus", "Lainnya"].map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="notes">
                    Catatan
                  </label>
                  <textarea id="notes" name="notes" rows={2} className="input" placeholder="Opsional" />
                </div>
                <button type="submit" className="btn btn-primary w-full">
                  Tambah pelamar
                </button>
              </form>
            </Card>
          )}
        </div>
      </div>

      {(opening.description || opening.requirements) && (
        <Card className="mt-5">
          <CardHeader title="Deskripsi lowongan" subtitle="Informasi yang dibagikan ke kandidat" />
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            {opening.description && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Deskripsi
                </p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                  {opening.description}
                </p>
              </div>
            )}
            {opening.requirements && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Kualifikasi
                </p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                  {opening.requirements}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
