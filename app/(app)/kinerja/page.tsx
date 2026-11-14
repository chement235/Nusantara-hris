import Link from "next/link";
import { Badge, Card, CardHeader, EmptyState, Field, PageHeader, StatCard } from "@/components/ui";
import { createCycleAction } from "@/lib/performance-actions";
import { requireSession } from "@/lib/auth";
import { all } from "@/lib/db";
import { dateID, todayISO } from "@/lib/format";
import type { AppraisalCycleRow, AppraisalRow } from "@/lib/types";

const APPRAISAL_QUERY = (where: string) => `
  SELECT a.*, c.name AS cycle_name, c.period_start, c.period_end,
         e.full_name AS employee_name, e.position, d.name AS department_name,
         r.full_name AS reviewer_name
  FROM appraisals a
  JOIN appraisal_cycles c ON c.id = a.cycle_id
  JOIN employees e ON e.id = a.employee_id
  JOIN departments d ON d.id = e.department_id
  LEFT JOIN employees r ON r.id = a.reviewer_id
  WHERE ${where}
  ORDER BY c.id DESC, e.full_name`;

function scoreTone(score: number | null): "emerald" | "amber" | "rose" | "slate" {
  if (score === null) return "slate";
  if (score >= 3.5) return "emerald";
  if (score >= 2.5) return "amber";
  return "rose";
}

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const today = todayISO();

  const cycles = all<AppraisalCycleRow>(
    `SELECT c.*,
            (SELECT COUNT(*) FROM appraisals a WHERE a.cycle_id = c.id) AS total,
            (SELECT COUNT(*) FROM appraisals a WHERE a.cycle_id = c.id AND a.status = 'Selesai') AS done
     FROM appraisal_cycles c
     ORDER BY c.id DESC`,
  );

  const mine = all<AppraisalRow>(APPRAISAL_QUERY("a.employee_id = ?"), session.employeeId);

  const pending =
    session.role === "hr"
      ? all<AppraisalRow>(APPRAISAL_QUERY("a.status = 'Menunggu'"))
      : session.role === "manager"
        ? all<AppraisalRow>(
            APPRAISAL_QUERY("a.reviewer_id = ? AND a.status = 'Menunggu'"),
            session.employeeId,
          )
        : [];

  const average = (() => {
    const scores = mine.filter((row) => row.final_score !== null).map((row) => Number(row.final_score));
    if (scores.length === 0) return null;
    return Math.round((scores.reduce((acc, score) => acc + score, 0) / scores.length) * 100) / 100;
  })();

  return (
    <>
      <PageHeader
        title="Penilaian Kinerja"
        description="Siklus penilaian, bobot kriteria, dan hasil evaluasi karyawan"
      />

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
          label="Siklus penilaian"
          value={cycles.length}
          hint={cycles[0] ? cycles[0].name : "Belum ada siklus"}
          icon="calendar"
          tone="indigo"
        />
        <StatCard
          label="Nilai rata-rata saya"
          value={average === null ? "—" : average.toFixed(2)}
          hint={mine[0]?.rating ?? "Belum ada hasil"}
          icon="check"
          tone="emerald"
        />
        <StatCard
          label="Menunggu penilaian"
          value={pending.length}
          hint={session.role === "hr" ? "Seluruh perusahaan" : "Tim langsung Anda"}
          icon="clock"
          tone="amber"
        />
        <StatCard
          label="Penilaian saya"
          value={mine.length}
          hint="Sepanjang riwayat"
          icon="users"
          tone="sky"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Siklus penilaian" subtitle="Progres penyelesaian per siklus" />
          {cycles.length === 0 ? (
            <EmptyState
              title="Belum ada siklus"
              description="HR dapat membuat siklus penilaian baru dari panel samping."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {cycles.map((cycle) => {
                const percent =
                  cycle.total > 0 ? Math.round((Number(cycle.done) / Number(cycle.total)) * 100) : 0;
                return (
                  <li key={cycle.id} className="px-4 py-4 sm:px-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{cycle.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {dateID(cycle.period_start)} – {dateID(cycle.period_end)}
                        </p>
                      </div>
                      <Badge tone={cycle.status === "Selesai" ? "emerald" : "amber"}>
                        {cycle.status}
                      </Badge>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${percent}%` }} />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      {cycle.done} dari {cycle.total} penilaian selesai ({percent}%)
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {session.role === "hr" ? (
          <Card>
            <CardHeader title="Siklus baru" subtitle="Buat penilaian untuk semua karyawan aktif" />
            <form action={createCycleAction} className="space-y-3 p-5">
              <Field
                label="Nama siklus"
                name="name"
                required
                placeholder="Penilaian Kinerja 2027"
                defaultValue="Penilaian Kinerja Semester I 2027"
              />
              <Field
                label="Mulai"
                name="period_start"
                type="date"
                required
                defaultValue={`${today.slice(0, 4)}-01-01`}
              />
              <Field label="Selesai" name="period_end" type="date" required defaultValue={`${today.slice(0, 4)}-06-30`} />
              <p className="text-[11px] leading-relaxed text-slate-500">
                Sistem membuat satu penilaian per karyawan aktif dengan atasan langsung sebagai
                penilai. Kriteria: kualitas, produktivitas, kerja sama, inisiatif, dan disiplin.
              </p>
              <button type="submit" className="btn btn-primary w-full">
                Buat siklus
              </button>
            </form>
          </Card>
        ) : (
          <Card>
            <CardHeader title="Hasil penilaian saya" subtitle="Dinilai oleh atasan langsung" />
            <div className="p-4">
              {mine.length === 0 ? (
                <p className="py-2 text-center text-xs text-slate-500">Belum ada penilaian.</p>
              ) : (
                <ul className="space-y-3">
                  {mine.slice(0, 4).map((appraisal) => (
                    <li key={appraisal.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0 leading-tight">
                        <p className="truncate text-sm font-medium text-slate-900">{appraisal.cycle_name}</p>
                        <p className="text-[11px] text-slate-500">
                          {appraisal.reviewer_name ?? "Belum ada penilai"} · {appraisal.status}
                        </p>
                      </div>
                      <Link href={`/kinerja/${appraisal.id}`} className="text-xs font-medium text-indigo-600">
                        Lihat →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        )}
      </div>

      <Card className="mt-5">
        <CardHeader
          title={session.role === "hr" ? "Menunggu penilaian" : "Tim yang perlu dinilai"}
          subtitle={pending.length === 0 ? "Tidak ada penilaian tertunda" : `${pending.length} penilaian`}
        />
        {pending.length === 0 ? (
          <EmptyState title="Semua penilaian sudah selesai" description="Terima kasih, tidak ada yang tertunda." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Karyawan</th>
                  <th className="th">Departemen</th>
                  <th className="th">Siklus</th>
                  <th className="th">Penilai</th>
                  <th className="th">Status</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pending.map((appraisal) => (
                  <tr key={appraisal.id} className="hover:bg-slate-50/60">
                    <td className="td">
                      <p className="font-medium text-slate-900">{appraisal.employee_name}</p>
                      <p className="text-[11px] text-slate-500">{appraisal.position}</p>
                    </td>
                    <td className="td text-slate-600">{appraisal.department_name}</td>
                    <td className="td text-slate-600">{appraisal.cycle_name}</td>
                    <td className="td text-slate-600">{appraisal.reviewer_name ?? "—"}</td>
                    <td className="td">
                      <Badge tone="amber">{appraisal.status}</Badge>
                    </td>
                    <td className="td text-right">
                      <Link
                        href={`/kinerja/${appraisal.id}`}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        Nilai →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {mine.length > 0 && (
        <Card className="mt-5">
          <CardHeader title="Riwayat penilaian saya" subtitle={`${mine.length} penilaian`} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Siklus</th>
                  <th className="th">Penilai</th>
                  <th className="th">Nilai</th>
                  <th className="th">Predikat</th>
                  <th className="th">Status</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mine.map((appraisal) => (
                  <tr key={appraisal.id} className="hover:bg-slate-50/60">
                    <td className="td font-medium text-slate-900">{appraisal.cycle_name}</td>
                    <td className="td text-slate-600">{appraisal.reviewer_name ?? "—"}</td>
                    <td className="td">
                      {appraisal.final_score === null ? "—" : Number(appraisal.final_score).toFixed(2)}
                    </td>
                    <td className="td">
                      <Badge tone={scoreTone(appraisal.final_score)}>
                        {appraisal.rating ?? "Belum dinilai"}
                      </Badge>
                    </td>
                    <td className="td text-slate-600">{appraisal.status}</td>
                    <td className="td text-right">
                      <Link
                        href={`/kinerja/${appraisal.id}`}
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
        </Card>
      )}
    </>
  );
}
