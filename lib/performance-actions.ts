"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { all, one, run } from "./db";
import { requireRole, requireSession } from "./auth";
import { isISODate } from "./format";
import { CRITERIA, ratingFor, weightedScore } from "./performance";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function ok(path: string, message: string): never {
  redirect(`${path}?ok=${encodeURIComponent(message)}`);
}

export async function createCycleAction(formData: FormData): Promise<void> {
  await requireRole(["hr"]);
  const name = String(formData.get("name") ?? "").trim();
  const periodStart = String(formData.get("period_start") ?? "");
  const periodEnd = String(formData.get("period_end") ?? "");

  if (name.length < 3) fail("/kinerja", "Nama siklus minimal 3 karakter.");
  if (!isISODate(periodStart) || !isISODate(periodEnd)) {
    fail("/kinerja", "Periode penilaian tidak valid.");
  }
  if (periodEnd <= periodStart) {
    fail("/kinerja", "Tanggal selesai harus setelah tanggal mulai.");
  }

  const employees = all<{ id: number; manager_id: number | null }>(
    "SELECT id, manager_id FROM employees WHERE status = 'Aktif' ORDER BY id",
  );
  if (employees.length === 0) fail("/kinerja", "Belum ada karyawan aktif untuk dinilai.");

  run(
    "INSERT INTO appraisal_cycles (name, period_start, period_end, status, created_at) VALUES (?, ?, ?, 'Berjalan', ?)",
    name,
    periodStart,
    periodEnd,
    new Date().toISOString(),
  );
  const cycle = one<{ id: number }>("SELECT id FROM appraisal_cycles ORDER BY id DESC LIMIT 1");
  if (!cycle) fail("/kinerja", "Gagal membuat siklus penilaian.");

  for (const employee of employees) {
    const inserted = run(
      `INSERT INTO appraisals (cycle_id, employee_id, reviewer_id, status)
       VALUES (?, ?, ?, 'Menunggu')`,
      cycle.id,
      employee.id,
      employee.manager_id,
    );
    for (const criterion of CRITERIA) {
      run(
        "INSERT INTO appraisal_scores (appraisal_id, criterion, weight) VALUES (?, ?, ?)",
        inserted.lastInsertRowid,
        criterion.key,
        criterion.weight,
      );
    }
  }

  revalidatePath("/kinerja");
  ok("/kinerja", `Siklus "${name}" dibuat untuk ${employees.length} karyawan.`);
}

export async function saveAppraisalAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const appraisalId = Number(formData.get("appraisal_id") ?? 0);
  const managerNote = String(formData.get("manager_note") ?? "").trim();
  const back = `/kinerja/${appraisalId}`;

  if (!Number.isInteger(appraisalId) || appraisalId <= 0) fail("/kinerja", "Penilaian tidak valid.");

  const appraisal = one<{
    id: number;
    employee_id: number;
    reviewer_id: number | null;
    status: string;
    cycle_id: number;
  }>(
    "SELECT id, employee_id, reviewer_id, status, cycle_id FROM appraisals WHERE id = ?",
    appraisalId,
  );
  if (!appraisal) fail("/kinerja", "Penilaian tidak ditemukan.");

  const isReviewer = Number(appraisal.reviewer_id) === session.employeeId;
  if (session.role !== "hr" && !isReviewer) {
    fail(back, "Anda tidak memiliki akses menilai karyawan ini.");
  }

  const scores = CRITERIA.map((criterion) => ({
    criterion: criterion.key,
    score: Number(formData.get(`score_${criterion.key}`) ?? 0),
  }));

  if (scores.some((row) => !Number.isInteger(row.score) || row.score < 1 || row.score > 5)) {
    fail(back, "Semua kriteria harus dinilai dengan skala 1–5.");
  }
  if (managerNote.length < 10) {
    fail(back, "Catatan penilaian minimal 10 karakter agar umpan balik bermakna.");
  }

  const finalScore = weightedScore(scores);
  if (finalScore === null) fail(back, "Nilai akhir tidak dapat dihitung.");

  for (const row of scores) {
    run(
      "UPDATE appraisal_scores SET score = ? WHERE appraisal_id = ? AND criterion = ?",
      row.score,
      appraisalId,
      row.criterion,
    );
  }

  run(
    `UPDATE appraisals
     SET status = 'Selesai', manager_note = ?, final_score = ?, rating = ?, submitted_at = ?
     WHERE id = ?`,
    managerNote,
    finalScore,
    ratingFor(finalScore),
    new Date().toISOString(),
    appraisalId,
  );

  revalidatePath("/kinerja");
  revalidatePath(back);
  ok(back, "Penilaian kinerja disimpan dan difinalisasi.");
}
