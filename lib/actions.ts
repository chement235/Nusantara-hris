"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { all, one, run } from "./db";
import { requireRole, requireSession } from "./auth";
import {
  addDays,
  businessDays,
  isISODate,
  monthRange,
  nowHHMM,
  periodOf,
  todayISO,
} from "./format";
import { computePayslip, periodWorkdays } from "./payroll";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function ok(path: string, message: string): never {
  redirect(`${path}?ok=${encodeURIComponent(message)}`);
}

export async function clockInAction(): Promise<void> {
  const session = await requireSession();
  const today = todayISO();
  const time = nowHHMM();
  const late = time > "08:30";

  const existing = one<{ id: number; clock_in: string | null }>(
    "SELECT id, clock_in FROM attendance WHERE employee_id = ? AND date = ?",
    session.employeeId,
    today,
  );

  if (existing?.clock_in) fail("/kehadiran", "Anda sudah melakukan absen masuk hari ini.");

  if (existing) {
    run(
      "UPDATE attendance SET clock_in = ?, status = ?, note = ? WHERE id = ?",
      time,
      late ? "Terlambat" : "Hadir",
      late ? "Absen masuk setelah 08:30" : null,
      existing.id,
    );
  } else {
    run(
      "INSERT INTO attendance (employee_id, date, clock_in, clock_out, status, note) VALUES (?, ?, ?, NULL, ?, ?)",
      session.employeeId,
      today,
      time,
      late ? "Terlambat" : "Hadir",
      late ? "Absen masuk setelah 08:30" : null,
    );
  }

  revalidatePath("/kehadiran");
  revalidatePath("/");
  ok("/kehadiran", `Absen masuk tercatat pukul ${time} WIB.`);
}

export async function clockOutAction(): Promise<void> {
  const session = await requireSession();
  const today = todayISO();
  const time = nowHHMM();

  const existing = one<{ id: number; clock_in: string | null; clock_out: string | null }>(
    "SELECT id, clock_in, clock_out FROM attendance WHERE employee_id = ? AND date = ?",
    session.employeeId,
    today,
  );

  if (!existing?.clock_in) fail("/kehadiran", "Anda belum melakukan absen masuk hari ini.");
  if (existing.clock_out) fail("/kehadiran", "Anda sudah melakukan absen pulang hari ini.");

  run("UPDATE attendance SET clock_out = ? WHERE id = ?", time, existing.id);
  revalidatePath("/kehadiran");
  ok("/kehadiran", `Absen pulang tercatat pukul ${time} WIB.`);
}

export async function requestLeaveAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const leaveTypeId = Number(formData.get("leave_type_id") ?? 0);
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!leaveTypeId) fail("/cuti", "Pilih jenis cuti terlebih dahulu.");
  if (!isISODate(startDate) || !isISODate(endDate)) fail("/cuti", "Tanggal tidak valid.");
  if (endDate < startDate) fail("/cuti", "Tanggal selesai tidak boleh sebelum tanggal mulai.");
  if (startDate < addDays(todayISO(), -1)) fail("/cuti", "Tanggal mulai tidak boleh di masa lalu.");
  if (reason.length < 5) fail("/cuti", "Alasan minimal 5 karakter.");

  const leaveType = one<{ id: number; name: string; quota: number }>(
    "SELECT id, name, quota FROM leave_types WHERE id = ?",
    leaveTypeId,
  );
  if (!leaveType) fail("/cuti", "Jenis cuti tidak ditemukan.");

  const days = businessDays(startDate, endDate);
  if (days <= 0) fail("/cuti", "Rentang tanggal tidak mengandung hari kerja.");

  const yearStart = `${startDate.slice(0, 4)}-01-01`;
  const yearEnd = `${startDate.slice(0, 4)}-12-31`;
  const used = one<{ total: number }>(
    `SELECT COALESCE(SUM(days), 0) AS total FROM leave_requests
     WHERE employee_id = ? AND leave_type_id = ? AND status = 'Disetujui'
       AND start_date BETWEEN ? AND ?`,
    session.employeeId,
    leaveTypeId,
    yearStart,
    yearEnd,
  );
  const usedDays = Number(used?.total ?? 0);
  if (leaveType.quota > 0 && usedDays + days > leaveType.quota) {
    fail(
      "/cuti",
      `Saldo ${leaveType.name} tidak cukup. Sisa ${leaveType.quota - usedDays} hari, diminta ${days} hari.`,
    );
  }

  const overlap = one<{ c: number }>(
    `SELECT COUNT(*) AS c FROM leave_requests
     WHERE employee_id = ? AND status IN ('Menunggu', 'Disetujui')
       AND NOT (end_date < ? OR start_date > ?)`,
    session.employeeId,
    startDate,
    endDate,
  );
  if (Number(overlap?.c ?? 0) > 0) {
    fail("/cuti", "Terdapat pengajuan lain pada rentang tanggal tersebut.");
  }

  run(
    `INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, days, reason, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'Menunggu', ?)`,
    session.employeeId,
    leaveTypeId,
    startDate,
    endDate,
    days,
    reason,
    new Date().toISOString(),
  );

  revalidatePath("/cuti");
  revalidatePath("/");
  ok("/cuti", "Pengajuan cuti terkirim dan menunggu persetujuan.");
}

export async function decideLeaveAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (session.role !== "hr" && session.role !== "manager") {
    fail("/cuti", "Anda tidak memiliki akses untuk menyetujui pengajuan.");
  }

  const requestId = Number(formData.get("request_id") ?? 0);
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!["Disetujui", "Ditolak"].includes(decision)) fail("/cuti", "Keputusan tidak valid.");

  const request = one<{
    id: number;
    employee_id: number;
    manager_id: number | null;
    status: string;
    start_date: string;
    end_date: string;
    days: number;
    leave_type_name: string;
    quota: number;
  }>(
    `SELECT lr.id, lr.employee_id, e.manager_id, lr.status, lr.start_date, lr.end_date,
            lr.days, lt.name AS leave_type_name, lt.quota
     FROM leave_requests lr
     JOIN employees e ON e.id = lr.employee_id
     JOIN leave_types lt ON lt.id = lr.leave_type_id
     WHERE lr.id = ?`,
    requestId,
  );

  if (!request) fail("/cuti", "Pengajuan tidak ditemukan.");
  if (request.status !== "Menunggu") fail("/cuti", "Pengajuan sudah diproses.");
  if (request.employee_id === session.employeeId) {
    fail("/cuti", "Anda tidak dapat memproses pengajuan milik sendiri.");
  }
  if (session.role === "manager" && Number(request.manager_id) !== session.employeeId) {
    fail("/cuti", "Anda hanya dapat memproses pengajuan anggota tim langsung.");
  }

  if (decision === "Disetujui" && request.quota > 0) {
    const yearStart = `${request.start_date.slice(0, 4)}-01-01`;
    const yearEnd = `${request.start_date.slice(0, 4)}-12-31`;
    const used = one<{ total: number }>(
      `SELECT COALESCE(SUM(days), 0) AS total FROM leave_requests
       WHERE employee_id = ? AND status = 'Disetujui' AND leave_type_id = (
         SELECT leave_type_id FROM leave_requests WHERE id = ?
       ) AND start_date BETWEEN ? AND ?`,
      request.employee_id,
      requestId,
      yearStart,
      yearEnd,
    );
    if (Number(used?.total ?? 0) + Number(request.days) > request.quota) {
      fail("/cuti", "Saldo cuti karyawan tidak mencukupi untuk disetujui.");
    }
  }

  run(
    "UPDATE leave_requests SET status = ?, reviewer_id = ?, reviewed_at = ?, review_note = ? WHERE id = ?",
    decision,
    session.employeeId,
    new Date().toISOString(),
    note || null,
    requestId,
  );

  if (decision === "Disetujui") {
    for (let date = request.start_date; date <= request.end_date; date = addDays(date, 1)) {
      const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
      if (weekday === 0 || weekday === 6) continue;
      run(
        `INSERT INTO attendance (employee_id, date, clock_in, clock_out, status, note)
         VALUES (?, ?, NULL, NULL, 'Cuti', ?)
         ON CONFLICT (employee_id, date) DO UPDATE SET status = 'Cuti', note = excluded.note`,
        request.employee_id,
        date,
        `Cuti disetujui (${request.leave_type_name})`,
      );
    }
  }

  revalidatePath("/cuti");
  revalidatePath("/");
  revalidatePath("/kehadiran");
  ok("/cuti", `Pengajuan ${decision.toLowerCase()}.`);
}

export async function createEmployeeAction(formData: FormData): Promise<void> {
  await requireRole(["hr"]);

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const position = String(formData.get("position") ?? "").trim();
  const departmentId = Number(formData.get("department_id") ?? 0);
  const joinDate = String(formData.get("join_date") ?? "");
  const employmentType = String(formData.get("employment_type") ?? "Tetap");
  const jobLevel = String(formData.get("job_level") ?? "Staff");
  const baseSalary = Number(formData.get("base_salary") ?? 0);
  const transport = Number(formData.get("allowance_transport") ?? 0);
  const meal = Number(formData.get("allowance_meal") ?? 0);
  const contractEnd = String(formData.get("contract_end") ?? "");
  const managerId = Number(formData.get("manager_id") ?? 0);
  const maritalStatus = String(formData.get("marital_status") ?? "TK/0");
  const phone = String(formData.get("phone") ?? "").trim();
  const birthDate = String(formData.get("birth_date") ?? "");
  const address = String(formData.get("address") ?? "").trim();
  const applicantId = Number(formData.get("applicant_id") ?? 0);

  if (!fullName || !email || !position) {
    fail("/karyawan/baru", "Nama, email, dan jabatan wajib diisi.");
  }
  if (!email.includes("@")) fail("/karyawan/baru", "Format email tidak valid.");
  if (!departmentId) fail("/karyawan/baru", "Pilih departemen.");
  if (!isISODate(joinDate)) fail("/karyawan/baru", "Tanggal bergabung tidak valid.");
  if (baseSalary <= 0) fail("/karyawan/baru", "Gaji pokok harus lebih dari 0.");
  if (employmentType !== "Tetap" && !isISODate(contractEnd)) {
    fail("/karyawan/baru", "Tanggal berakhir kontrak wajib untuk karyawan kontrak/magang.");
  }

  const duplicate = one<{ id: number }>("SELECT id FROM employees WHERE lower(email) = ?", email);
  if (duplicate) fail("/karyawan/baru", "Email sudah digunakan karyawan lain.");

  const last = one<{ nip: string }>("SELECT nip FROM employees ORDER BY id DESC LIMIT 1");
  const nextNumber = last ? Number(last.nip.replace(/\D/g, "")) + 1 : 1;
  const nip = `EMP-${String(nextNumber).padStart(4, "0")}`;

  const inserted = run(
    `INSERT INTO employees (
      nip, full_name, email, phone, department_id, position, job_level, employment_type,
      status, join_date, contract_end, manager_id, base_salary, allowance_transport,
      allowance_meal, bank_name, bank_account, npwp, birth_date, address, marital_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Aktif', ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?)`,
    nip,
    fullName,
    email,
    phone || null,
    departmentId,
    position,
    jobLevel,
    employmentType,
    joinDate,
    employmentType === "Tetap" ? null : contractEnd,
    managerId || null,
    baseSalary,
    transport,
    meal,
    isISODate(birthDate) ? birthDate : null,
    address || null,
    maritalStatus,
  );

  if (applicantId) {
    const applicant = one<{ id: number; job_opening_id: number; stage: string }>(
      "SELECT id, job_opening_id, stage FROM applicants WHERE id = ?",
      applicantId,
    );
    if (applicant && applicant.stage !== "Ditolak") {
      run(
        "UPDATE applicants SET stage = 'Diterima', employee_id = ? WHERE id = ?",
        inserted.lastInsertRowid,
        applicantId,
      );
      const opening = one<{ id: number; headcount: number; status: string }>(
        "SELECT id, headcount, status FROM job_openings WHERE id = ?",
        applicant.job_opening_id,
      );
      const accepted = one<{ c: number }>(
        "SELECT COUNT(*) AS c FROM applicants WHERE job_opening_id = ? AND stage = 'Diterima'",
        applicant.job_opening_id,
      );
      if (
        opening &&
        opening.status === "Dibuka" &&
        Number(accepted?.c ?? 0) >= Number(opening.headcount)
      ) {
        run(
          "UPDATE job_openings SET status = 'Ditutup', closed_at = ? WHERE id = ?",
          todayISO(),
          opening.id,
        );
      }
    }
    revalidatePath("/rekrutmen");
    revalidatePath(`/rekrutmen/${applicant?.job_opening_id ?? ""}`);
  }

  revalidatePath("/karyawan");
  revalidatePath("/");
  ok("/karyawan", `Karyawan ${fullName} (${nip}) berhasil ditambahkan.`);
}

function payrollTotals(period: string) {
  const { start, end } = monthRange(period);
  const workdays = periodWorkdays(period);
  const year = period.slice(0, 4);

  // PPh 21 yang sudah dipotong pada periode sebelumnya di tahun yang sama,
  // dipakai untuk rekonsiliasi masa pajak terakhir (Desember).
  const priorRows = all<{ employee_id: number; total: number }>(
    `SELECT p.employee_id, COALESCE(SUM(p.pph21), 0) AS total
     FROM payslips p
     JOIN payroll_runs r ON r.id = p.run_id
     WHERE r.period LIKE ? AND r.period < ?
     GROUP BY p.employee_id`,
    `${year}-%`,
    period,
  );
  const priorWithheld = new Map(
    priorRows.map((row) => [Number(row.employee_id), Number(row.total)]),
  );

  const employees = all<{
    id: number;
    base_salary: number;
    allowance_transport: number;
    allowance_meal: number;
    marital_status: string;
  }>(
    `SELECT id, base_salary, allowance_transport, allowance_meal, marital_status
     FROM employees WHERE status = 'Aktif' AND join_date <= ? ORDER BY id`,
    end,
  );

  const attendance = all<{ employee_id: number; status: string; c: number }>(
    `SELECT employee_id, status, COUNT(*) AS c FROM attendance
     WHERE date BETWEEN ? AND ? GROUP BY employee_id, status`,
    start,
    end,
  );

  const byEmployee = new Map<number, Map<string, number>>();
  for (const row of attendance) {
    const map = byEmployee.get(Number(row.employee_id)) ?? new Map<string, number>();
    map.set(row.status, Number(row.c));
    byEmployee.set(Number(row.employee_id), map);
  }

  return employees.map((employee) => {
    const statuses = byEmployee.get(Number(employee.id)) ?? new Map<string, number>();
    const present =
      (statuses.get("Hadir") ?? 0) +
      (statuses.get("Terlambat") ?? 0) +
      (statuses.get("WFH") ?? 0);
    const excused =
      (statuses.get("Cuti") ?? 0) + (statuses.get("Sakit") ?? 0) + (statuses.get("Izin") ?? 0);
    const alpha = Math.max(0, workdays.length - present - excused);
    return {
      employee,
      present,
      calc: computePayslip(employee, {
        presentDays: present,
        alphaDays: alpha,
        period,
        priorWithheld: priorWithheld.get(Number(employee.id)) ?? 0,
      }),
    };
  });
}

function insertPayroll(period: string, status: "Draft" | "Final"): number {
  const slips = payrollTotals(period);
  const totals = slips.reduce(
    (acc, item) => ({
      gross: acc.gross + item.calc.gross,
      deduction: acc.deduction + item.calc.total_deduction,
      net: acc.net + item.calc.net,
    }),
    { gross: 0, deduction: 0, net: 0 },
  );

  const inserted = run(
    `INSERT INTO payroll_runs (period, status, created_at, finalized_at, employee_count, total_gross, total_deduction, total_net)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    period,
    status,
    new Date().toISOString(),
    status === "Final" ? new Date().toISOString() : null,
    slips.length,
    totals.gross,
    totals.deduction,
    totals.net,
  );
  const runId = inserted.lastInsertRowid;

  for (const { employee, present, calc } of slips) {
    run(
      `INSERT INTO payslips (
        run_id, employee_id, present_days, base_salary, allowance_transport, allowance_meal,
        overtime, gross, bpjs_kes, bpjs_jht, bpjs_jp, bpjs_jkk, bpjs_jkm, pph21,
        alpha_deduction, other_deduction, total_deduction, net,
        bpjs_base, ter_category, ter_rate, pph21_annual, employer_kes, employer_jht, employer_jp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      runId,
      employee.id,
      present,
      calc.base_salary,
      calc.allowance_transport,
      calc.allowance_meal,
      calc.overtime,
      calc.gross,
      calc.bpjs_kes,
      calc.bpjs_jht,
      calc.bpjs_jp,
      calc.bpjs_jkk,
      calc.bpjs_jkm,
      calc.pph21,
      calc.alpha_deduction,
      calc.other_deduction,
      calc.total_deduction,
      calc.net,
      calc.bpjs_base,
      calc.ter_category,
      calc.ter_rate,
      calc.pph21_annual,
      calc.employer_kes,
      calc.employer_jht,
      calc.employer_jp,
    );
  }

  return runId;
}

export async function createPayrollRunAction(formData: FormData): Promise<void> {
  await requireRole(["hr"]);

  const period = String(formData.get("period") ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(period)) fail("/payroll", "Format periode tidak valid.");

  const currentPeriod = periodOf(todayISO());
  if (period > currentPeriod) fail("/payroll", "Periode payroll belum berjalan.");

  const existing = one<{ id: number }>("SELECT id FROM payroll_runs WHERE period = ?", period);
  if (existing) fail("/payroll", "Payroll untuk periode tersebut sudah dibuat.");

  const runId = insertPayroll(period, "Draft");

  revalidatePath("/payroll");
  ok(`/payroll/${runId}`, "Payroll draft berhasil dihitung.");
}

export async function recalculatePayrollAction(formData: FormData): Promise<void> {
  await requireRole(["hr"]);
  const runId = Number(formData.get("run_id") ?? 0);
  const payrollRun = one<{ id: number; period: string; status: string }>(
    "SELECT id, period, status FROM payroll_runs WHERE id = ?",
    runId,
  );
  if (!payrollRun) fail("/payroll", "Payroll tidak ditemukan.");
  if (payrollRun.status === "Final") fail(`/payroll/${runId}`, "Payroll final tidak dapat dihitung ulang.");

  const slips = payrollTotals(payrollRun.period);
  run("DELETE FROM payslips WHERE run_id = ?", runId);
  const totals = slips.reduce(
    (acc, item) => ({
      gross: acc.gross + item.calc.gross,
      deduction: acc.deduction + item.calc.total_deduction,
      net: acc.net + item.calc.net,
    }),
    { gross: 0, deduction: 0, net: 0 },
  );
  run(
    `UPDATE payroll_runs SET employee_count = ?, total_gross = ?, total_deduction = ?, total_net = ? WHERE id = ?`,
    slips.length,
    totals.gross,
    totals.deduction,
    totals.net,
    runId,
  );
  for (const { employee, present, calc } of slips) {
    run(
      `INSERT INTO payslips (
        run_id, employee_id, present_days, base_salary, allowance_transport, allowance_meal,
        overtime, gross, bpjs_kes, bpjs_jht, bpjs_jp, bpjs_jkk, bpjs_jkm, pph21,
        alpha_deduction, other_deduction, total_deduction, net,
        bpjs_base, ter_category, ter_rate, pph21_annual, employer_kes, employer_jht, employer_jp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      runId,
      employee.id,
      present,
      calc.base_salary,
      calc.allowance_transport,
      calc.allowance_meal,
      calc.overtime,
      calc.gross,
      calc.bpjs_kes,
      calc.bpjs_jht,
      calc.bpjs_jp,
      calc.bpjs_jkk,
      calc.bpjs_jkm,
      calc.pph21,
      calc.alpha_deduction,
      calc.other_deduction,
      calc.total_deduction,
      calc.net,
      calc.bpjs_base,
      calc.ter_category,
      calc.ter_rate,
      calc.pph21_annual,
      calc.employer_kes,
      calc.employer_jht,
      calc.employer_jp,
    );
  }

  revalidatePath(`/payroll/${runId}`);
  ok(`/payroll/${runId}`, "Payroll berhasil dihitung ulang.");
}

export async function finalizePayrollAction(formData: FormData): Promise<void> {
  await requireRole(["hr"]);
  const runId = Number(formData.get("run_id") ?? 0);
  const payrollRun = one<{ id: number; status: string }>(
    "SELECT id, status FROM payroll_runs WHERE id = ?",
    runId,
  );
  if (!payrollRun) fail("/payroll", "Payroll tidak ditemukan.");
  if (payrollRun.status === "Final") fail(`/payroll/${runId}`, "Payroll sudah final.");

  run(
    "UPDATE payroll_runs SET status = 'Final', finalized_at = ? WHERE id = ?",
    new Date().toISOString(),
    runId,
  );

  revalidatePath(`/payroll/${runId}`);
  revalidatePath("/payroll");
  ok(`/payroll/${runId}`, "Payroll difinalisasi. Slip gaji siap dibagikan.");
}
