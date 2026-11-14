import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar, Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { saveAppraisalAction } from "@/lib/performance-actions";
import { requireSession } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { dateID } from "@/lib/format";
import { CRITERIA, SCORE_LABEL } from "@/lib/performance";
import type { AppraisalRow, AppraisalScoreRow } from "@/lib/types";

export default async function AppraisalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const feedback = await searchParams;
  const appraisalId = Number(id);
  if (!Number.isFinite(appraisalId)) notFound();

  const appraisal = one<AppraisalRow>(
    `SELECT a.*, c.name AS cycle_name, c.period_start, c.period_end,
            e.full_name AS employee_name, e.position, d.name AS department_name,
            r.full_name AS reviewer_name
     FROM appraisals a
     JOIN appraisal_cycles c ON c.id = a.cycle_id
     JOIN employees e ON e.id = a.employee_id
     JOIN departments d ON d.id = e.department_id
     LEFT JOIN employees r ON r.id = a.reviewer_id
     WHERE a.id = ?`,
    appraisalId,
  );
  if (!appraisal) notFound();

  const scores = all<AppraisalScoreRow>(
    "SELECT * FROM appraisal_scores WHERE appraisal_id = ? ORDER BY id",
    appraisalId,
  );

  const canEdit =
    session.role === "hr" || Number(appraisal.reviewer_id) === session.employeeId;
  if (!canEdit && Number(appraisal.employee_id) !== session.employeeId) {
    redirect("/kinerja");
  }

  const finalScore = appraisal.final_score === null ? null : Number(appraisal.final_score);

  return (
    <>
      <PageHeader
        title={`Penilaian ${appraisal.employee_name}`}
        description={`${appraisal.cycle_name} · ${dateID(appraisal.period_start)} – ${dateID(appraisal.period_end)}`}
      >
        <Link href="/kinerja" className="btn btn-ghost">
          ← Kembali
        </Link>
        <Badge tone={appraisal.status === "Selesai" ? "emerald" : "amber"}>{appraisal.status}</Badge>
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

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Kriteria penilaian"
            subtitle="Skala 1–5, nilai akhir adalah rata-rata berbobot"
          />
          {canEdit && appraisal.status !== "Selesai" ? (
            <form action={saveAppraisalAction} className="space-y-1 p-5">
              <input type="hidden" name="appraisal_id" value={appraisal.id} />
              {CRITERIA.map((criterion) => {
                const current = scores.find((row) => row.criterion === criterion.key);
                return (
                  <div
                    key={criterion.key}
                    className="grid gap-3 border-b border-slate-100 py-4 last:border-0 sm:grid-cols-[1fr_160px]"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {criterion.label}
                        <span className="ml-2 text-[11px] font-normal text-slate-400">
                          bobot {criterion.weight}%
                        </span>
                      </p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                        {criterion.description}
                      </p>
                    </div>
                    <select
                      name={`score_${criterion.key}`}
                      defaultValue={current?.score ?? 3}
                      className="input self-center"
                      aria-label={`Nilai ${criterion.label}`}
                    >
                      {[1, 2, 3, 4, 5].map((score) => (
                        <option key={score} value={score}>
                          {score} — {SCORE_LABEL[score]}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}

              <div className="pt-4">
                <label className="label" htmlFor="manager_note">
                  Catatan & umpan balik
                </label>
                <textarea
                  id="manager_note"
                  name="manager_note"
                  rows={4}
                  className="input"
                  required
                  defaultValue={appraisal.manager_note ?? ""}
                  placeholder="Kekuatan, area pengembangan, dan rencana tindak lanjut..."
                />
              </div>

              <div className="flex justify-end pt-3">
                <button type="submit" className="btn btn-primary">
                  Simpan & finalisasi penilaian
                </button>
              </div>
            </form>
          ) : (
            <div className="divide-y divide-slate-100">
              {CRITERIA.map((criterion) => {
                const row = scores.find((item) => item.criterion === criterion.key);
                const score = row?.score ?? null;
                return (
                  <div
                    key={criterion.key}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{criterion.label}</p>
                      <p className="text-[11px] text-slate-500">
                        Bobot {criterion.weight}% · {criterion.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-slate-900">
                        {score === null ? "—" : score}
                        <span className="text-xs font-normal text-slate-400">/5</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {score === null ? "Belum dinilai" : SCORE_LABEL[score]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Ringkasan" subtitle="Hasil evaluasi" />
            <div className="p-5">
              <div className="flex items-center gap-3">
                <Avatar name={appraisal.employee_name} size="lg" />
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {appraisal.employee_name}
                  </p>
                  <p className="truncate text-xs text-slate-500">{appraisal.position}</p>
                  <p className="truncate text-[11px] text-slate-500">{appraisal.department_name}</p>
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-center">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Nilai akhir</p>
                <p className="mt-1 text-3xl font-semibold text-slate-900">
                  {finalScore === null ? "—" : finalScore.toFixed(2)}
                </p>
                <p className="text-xs text-slate-600">{appraisal.rating ?? "Belum ada predikat"}</p>
              </div>

              <dl className="mt-5 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Penilai</dt>
                  <dd className="text-slate-800">{appraisal.reviewer_name ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Status</dt>
                  <dd className="text-slate-800">{appraisal.status}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Difinalisasi</dt>
                  <dd className="text-slate-800">
                    {appraisal.submitted_at ? dateID(appraisal.submitted_at.slice(0, 10)) : "—"}
                  </dd>
                </div>
              </dl>

              {appraisal.manager_note && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Catatan penilai
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">
                    {appraisal.manager_note}
                  </p>
                </div>
              )}

              {canEdit && appraisal.status === "Selesai" && (
                <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
                  Penilaian sudah difinalisasi. Hubungi HR bila perlu revisi.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
