"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { one, run } from "./db";
import { requireRole } from "./auth";
import { todayISO } from "./format";
import { APPLICANT_STAGES } from "./recruitment";
import { auditLog } from "./security";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function ok(path: string, message: string): never {
  redirect(`${path}?ok=${encodeURIComponent(message)}`);
}

export async function createOpeningAction(formData: FormData): Promise<void> {
  const session = await requireRole(["hr"]);
  const title = String(formData.get("title") ?? "").trim();
  const departmentId = Number(formData.get("department_id") ?? 0);
  const employmentType = String(formData.get("employment_type") ?? "Tetap");
  const location = String(formData.get("location") ?? "").trim() || "Jakarta";
  const headcount = Number(formData.get("headcount") ?? 1);
  const description = String(formData.get("description") ?? "").trim();
  const requirements = String(formData.get("requirements") ?? "").trim();

  if (title.length < 3) fail("/rekrutmen/baru", "Judul lowongan minimal 3 karakter.");
  if (!Number.isInteger(departmentId) || departmentId <= 0) {
    fail("/rekrutmen/baru", "Pilih departemen tujuan.");
  }
  if (!["Tetap", "Kontrak", "Magang"].includes(employmentType)) {
    fail("/rekrutmen/baru", "Jenis kepegawaian tidak valid.");
  }
  if (!Number.isInteger(headcount) || headcount < 1 || headcount > 50) {
    fail("/rekrutmen/baru", "Jumlah kebutuhan harus 1–50 orang.");
  }

  const department = one<{ id: number }>("SELECT id FROM departments WHERE id = ?", departmentId);
  if (!department) fail("/rekrutmen/baru", "Departemen tidak ditemukan.");

  const inserted = run(
    `INSERT INTO job_openings (
      title, department_id, employment_type, location, description, requirements,
      headcount, status, opened_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Dibuka', ?, ?)`,
    title,
    departmentId,
    employmentType,
    location,
    description || null,
    requirements || null,
    headcount,
    todayISO(),
    session.employeeId,
  );

  revalidatePath("/rekrutmen");
  auditLog({
    actorUserId: session.userId,
    actorRole: "hr",
    action: "recruitment.opening.create",
    targetType: "job_opening",
    targetId: String(inserted.lastInsertRowid),
    details: title,
  });
  ok("/rekrutmen", `Lowongan "${title}" dibuka.`);
}

export async function addApplicantAction(formData: FormData): Promise<void> {
  const session = await requireRole(["hr"]);
  const openingId = Number(formData.get("job_opening_id") ?? 0);
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const back = `/rekrutmen/${openingId}`;

  if (!Number.isInteger(openingId) || openingId <= 0) fail("/rekrutmen", "Lowongan tidak valid.");
  if (fullName.length < 2 || fullName.length > 120) fail(back, "Nama pelamar 2–120 karakter.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    fail(back, "Format email pelamar tidak valid.");
  }
  if (phone.length > 30) fail(back, "Nomor telepon terlalu panjang.");
  if (source.length > 60) fail(back, "Sumber rekrutmen terlalu panjang.");
  if (notes.length > 500) fail(back, "Catatan terlalu panjang.");

  const opening = one<{ id: number; status: string }>(
    "SELECT id, status FROM job_openings WHERE id = ?",
    openingId,
  );
  if (!opening) fail("/rekrutmen", "Lowongan tidak ditemukan.");
  if (opening.status !== "Dibuka") fail(back, "Lowongan sudah ditutup.");

  const duplicate = one<{ id: number }>(
    "SELECT id FROM applicants WHERE job_opening_id = ? AND lower(email) = ?",
    openingId,
    email,
  );
  if (duplicate) fail(back, "Email pelamar sudah terdaftar pada lowongan ini.");

  const inserted = run(
    `INSERT INTO applicants (
      job_opening_id, full_name, email, phone, source, stage, notes, applied_at
    ) VALUES (?, ?, ?, ?, ?, 'Baru', ?, ?)`,
    openingId,
    fullName,
    email,
    phone || null,
    source || null,
    notes || null,
    todayISO(),
  );

  revalidatePath("/rekrutmen");
  revalidatePath(back);
  auditLog({
    actorUserId: session.userId,
    actorRole: "hr",
    action: "recruitment.applicant.create",
    targetType: "applicant",
    targetId: String(inserted.lastInsertRowid),
    details: `${fullName} · ${email}`,
  });
  ok(back, `Pelamar ${fullName} ditambahkan ke pipeline.`);
}

export async function moveApplicantStageAction(formData: FormData): Promise<void> {
  const session = await requireRole(["hr"]);
  const applicantId = Number(formData.get("applicant_id") ?? 0);
  const stage = String(formData.get("stage") ?? "");

  if (!Number.isInteger(applicantId) || applicantId <= 0) fail("/rekrutmen", "Pelamar tidak valid.");
  if (!APPLICANT_STAGES.includes(stage as (typeof APPLICANT_STAGES)[number])) {
    fail("/rekrutmen", "Tahap rekrutmen tidak valid.");
  }

  const applicant = one<{ id: number; job_opening_id: number; full_name: string }>(
    "SELECT id, job_opening_id, full_name FROM applicants WHERE id = ?",
    applicantId,
  );
  if (!applicant) fail("/rekrutmen", "Pelamar tidak ditemukan.");

  run("UPDATE applicants SET stage = ? WHERE id = ?", stage, applicantId);
  revalidatePath("/rekrutmen");
  revalidatePath(`/rekrutmen/${applicant.job_opening_id}`);
  auditLog({
    actorUserId: session.userId,
    actorRole: "hr",
    action: "recruitment.applicant.stage",
    targetType: "applicant",
    targetId: String(applicantId),
    details: stage,
  });
  ok(`/rekrutmen/${applicant.job_opening_id}`, `${applicant.full_name} dipindahkan ke tahap ${stage}.`);
}

export async function closeOpeningAction(formData: FormData): Promise<void> {
  const session = await requireRole(["hr"]);
  const openingId = Number(formData.get("job_opening_id") ?? 0);
  const opening = one<{ id: number; status: string }>(
    "SELECT id, status FROM job_openings WHERE id = ?",
    openingId,
  );
  if (!opening) fail("/rekrutmen", "Lowongan tidak ditemukan.");
  if (opening.status === "Ditutup") fail(`/rekrutmen/${openingId}`, "Lowongan sudah ditutup.");

  run(
    "UPDATE job_openings SET status = 'Ditutup', closed_at = ? WHERE id = ?",
    todayISO(),
    openingId,
  );
  revalidatePath("/rekrutmen");
  revalidatePath(`/rekrutmen/${openingId}`);
  auditLog({
    actorUserId: session.userId,
    actorRole: "hr",
    action: "recruitment.opening.close",
    targetType: "job_opening",
    targetId: String(openingId),
  });
  ok(`/rekrutmen/${openingId}`, "Lowongan ditutup.");
}
