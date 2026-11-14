import type { DatabaseSync } from "node:sqlite";
import {
  addDays,
  businessDays,
  dateRange,
  hhmm,
  monthRange,
  periodOf,
  previousPeriod,
  todayISO,
} from "./format";
import { computePayslip } from "./payroll";
import { CRITERIA, ratingFor, weightedScore } from "./performance";
import { hashPassword } from "./password";

type SeedEmployee = {
  name: string;
  dept: string;
  position: string;
  level: "Head" | "Senior" | "Staff" | "Intern";
  type: "Tetap" | "Kontrak" | "Magang";
  join: string;
  base: number;
  manager?: string;
  marital: string;
  birth: string;
  contractEnd?: string;
  role?: "hr" | "manager" | "employee";
};

const DEPARTMENTS = [
  { code: "ENG", name: "Engineering" },
  { code: "HRD", name: "People & Culture" },
  { code: "FIN", name: "Finance & Accounting" },
  { code: "MKT", name: "Sales & Marketing" },
  { code: "OPS", name: "Operations" },
];

const EMPLOYEES: SeedEmployee[] = [
  { name: "Rani Puspita", dept: "HRD", position: "Head of People & Culture", level: "Head", type: "Tetap", join: "2018-03-05", base: 28_000_000, marital: "K/1", birth: "1988-04-12", role: "hr" },
  { name: "Budi Santoso", dept: "ENG", position: "Head of Engineering", level: "Head", type: "Tetap", join: "2017-08-14", base: 32_000_000, marital: "K/2", birth: "1986-09-23", role: "manager" },
  { name: "Sri Wahyuni", dept: "FIN", position: "Head of Finance & Accounting", level: "Head", type: "Tetap", join: "2016-11-21", base: 27_000_000, marital: "K/1", birth: "1984-01-30", role: "manager" },
  { name: "Andi Kurniawan", dept: "MKT", position: "Head of Sales & Marketing", level: "Head", type: "Tetap", join: "2019-02-11", base: 26_000_000, marital: "K/2", birth: "1987-07-08", role: "manager" },
  { name: "Maya Anggraini", dept: "OPS", position: "Head of Operations", level: "Head", type: "Tetap", join: "2019-07-01", base: 25_000_000, marital: "K/0", birth: "1989-12-02", role: "manager" },
  { name: "Dewi Lestari", dept: "ENG", position: "Frontend Engineer", level: "Senior", type: "Tetap", join: "2020-01-06", base: 15_000_000, manager: "Budi Santoso", marital: "TK/0", birth: "1995-06-17", role: "employee" },
  { name: "Agus Pratama", dept: "ENG", position: "Backend Engineer", level: "Senior", type: "Tetap", join: "2020-08-17", base: 16_500_000, manager: "Budi Santoso", marital: "K/0", birth: "1993-02-25" },
  { name: "Fitri Handayani", dept: "ENG", position: "QA Engineer", level: "Staff", type: "Tetap", join: "2021-04-05", base: 11_500_000, manager: "Budi Santoso", marital: "TK/0", birth: "1997-10-19", role: "employee" },
  { name: "Rizky Ramadhan", dept: "ENG", position: "DevOps Engineer", level: "Senior", type: "Tetap", join: "2021-09-13", base: 17_000_000, manager: "Budi Santoso", marital: "K/1", birth: "1992-11-30" },
  { name: "Putri Maharani", dept: "ENG", position: "UI/UX Designer", level: "Staff", type: "Tetap", join: "2022-02-07", base: 12_500_000, manager: "Budi Santoso", marital: "TK/0", birth: "1996-03-14" },
  { name: "Hendra Wijaya", dept: "ENG", position: "Mobile Engineer", level: "Staff", type: "Tetap", join: "2022-06-20", base: 15_000_000, manager: "Budi Santoso", marital: "K/1", birth: "1994-08-21" },
  { name: "Joko Susilo", dept: "ENG", position: "IT Support", level: "Staff", type: "Tetap", join: "2019-10-14", base: 8_500_000, manager: "Budi Santoso", marital: "K/1", birth: "1991-05-09" },
  { name: "Tania Putri", dept: "ENG", position: "Business Analyst", level: "Staff", type: "Tetap", join: "2023-03-06", base: 12_000_000, manager: "Budi Santoso", marital: "TK/0", birth: "1998-07-27" },
  { name: "Siti Nurhaliza", dept: "FIN", position: "Payroll Specialist", level: "Staff", type: "Tetap", join: "2020-05-04", base: 11_000_000, manager: "Sri Wahyuni", marital: "K/0", birth: "1994-12-11" },
  { name: "Bayu Nugroho", dept: "FIN", position: "Accountant", level: "Staff", type: "Tetap", join: "2021-01-11", base: 10_500_000, manager: "Sri Wahyuni", marital: "K/2", birth: "1992-04-03" },
  { name: "Lestari Wulandari", dept: "FIN", position: "Accounts Receivable Officer", level: "Staff", type: "Tetap", join: "2022-08-01", base: 9_000_000, manager: "Sri Wahyuni", marital: "TK/0", birth: "1997-02-16" },
  { name: "Dimas Saputra", dept: "MKT", position: "Account Executive", level: "Staff", type: "Tetap", join: "2021-11-08", base: 9_500_000, manager: "Andi Kurniawan", marital: "TK/0", birth: "1996-09-05" },
  { name: "Nadia Safira", dept: "MKT", position: "Marketing Specialist", level: "Staff", type: "Tetap", join: "2022-04-18", base: 9_000_000, manager: "Andi Kurniawan", marital: "TK/0", birth: "1998-01-22" },
  { name: "Yoga Permana", dept: "MKT", position: "Content Creator", level: "Staff", type: "Tetap", join: "2023-01-09", base: 8_000_000, manager: "Andi Kurniawan", marital: "TK/0", birth: "1999-06-30" },
  { name: "Eko Prasetyo", dept: "MKT", position: "Sales Support", level: "Staff", type: "Kontrak", join: "2024-02-12", base: 7_500_000, manager: "Andi Kurniawan", marital: "K/0", birth: "1995-11-18" },
  { name: "Indah Permatasari", dept: "OPS", position: "Customer Success Officer", level: "Staff", type: "Tetap", join: "2021-06-07", base: 8_500_000, manager: "Maya Anggraini", marital: "K/0", birth: "1996-12-24" },
  { name: "Fajar Hidayat", dept: "OPS", position: "Warehouse Supervisor", level: "Staff", type: "Tetap", join: "2020-10-12", base: 8_000_000, manager: "Maya Anggraini", marital: "K/1", birth: "1993-07-01" },
  { name: "Ayu Kusuma", dept: "OPS", position: "Admin Officer", level: "Staff", type: "Tetap", join: "2023-05-15", base: 7_000_000, manager: "Maya Anggraini", marital: "TK/0", birth: "1999-03-08" },
  { name: "Reza Mahendra", dept: "HRD", position: "Recruiter", level: "Staff", type: "Tetap", join: "2021-03-01", base: 9_500_000, manager: "Rani Puspita", marital: "K/0", birth: "1994-05-26" },
  { name: "Wulan Sari", dept: "HRD", position: "People Ops Admin", level: "Staff", type: "Tetap", join: "2022-09-19", base: 8_000_000, manager: "Rani Puspita", marital: "TK/0", birth: "1997-08-13" },
  { name: "Bagas Ardiansyah", dept: "ENG", position: "Data Analyst Intern", level: "Intern", type: "Magang", join: "2026-02-02", base: 4_000_000, manager: "Budi Santoso", marital: "TK/0", birth: "2003-10-04" },
  { name: "Karina Dewi", dept: "OPS", position: "Operations Analyst", level: "Staff", type: "Tetap", join: "2026-04-06", base: 9_000_000, manager: "Maya Anggraini", marital: "TK/0", birth: "2000-02-19" },
];

const LEAVE_TYPES = [
  { name: "Cuti Tahunan", quota: 12 },
  { name: "Cuti Sakit", quota: 14 },
  { name: "Izin Khusus", quota: 3 },
  { name: "Cuti Melahirkan", quota: 90 },
];

const BANKS = ["BCA", "Mandiri", "BNI", "BRI"];

function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function emailFor(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z ]/g, "").split(" ").slice(0, 2).join(".")}@nusantara.co.id`;
}

function allowanceFor(level: SeedEmployee["level"]): { transport: number; meal: number } {
  switch (level) {
    case "Head":
      return { transport: 1_200_000, meal: 700_000 };
    case "Senior":
      return { transport: 900_000, meal: 600_000 };
    case "Intern":
      return { transport: 300_000, meal: 300_000 };
    default:
      return { transport: 650_000, meal: 500_000 };
  }
}

export function seedDatabase(conn: DatabaseSync): void {
  const countRow = conn.prepare("SELECT COUNT(*) AS c FROM employees").get() as { c: number };
  if (Number(countRow.c) > 0) {
    seedRecruitment(conn);
    seedPerformance(conn);
    return;
  }

  const today = todayISO();
  const random = mulberry32(20260517);
  const PASSWORD = "demo1234";

  conn.exec("BEGIN");
  try {
    const deptIds = new Map<string, number>();
    const insertDept = conn.prepare("INSERT INTO departments (code, name) VALUES (?, ?)");
    for (const dept of DEPARTMENTS) {
      const result = insertDept.run(dept.code, dept.name);
      deptIds.set(dept.code, Number(result.lastInsertRowid));
    }

    const employeeIds = new Map<string, number>();
    const insertEmployee = conn.prepare(`
      INSERT INTO employees (
        nip, full_name, email, phone, department_id, position, job_level, employment_type,
        status, join_date, contract_end, manager_id, base_salary, allowance_transport,
        allowance_meal, bank_name, bank_account, npwp, birth_date, address, marital_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Aktif', ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    EMPLOYEES.forEach((employee, index) => {
      const nip = `EMP-${String(index + 1).padStart(4, "0")}`;
      const allowances = allowanceFor(employee.level);
      const contractEnd =
        employee.type === "Tetap" ? null : addDays(today, index % 2 === 0 ? 40 : 25);
      const result = insertEmployee.run(
        nip,
        employee.name,
        emailFor(employee.name),
        `0812-${String(3000 + index).padStart(4, "0")}-${String(1200 + index * 7).padStart(4, "0")}`,
        deptIds.get(employee.dept) ?? 1,
        employee.position,
        employee.level,
        employee.type,
        employee.join,
        contractEnd,
        employee.base,
        allowances.transport,
        allowances.meal,
        BANKS[index % BANKS.length],
        `•••• ${String(4100 + index * 13).slice(-4)}`,
        `09.${String(100 + index).padStart(3, "0")}.${String(300 + index).padStart(3, "0")}.${index % 9}-${String(400 + index).slice(-3)}.000`,
        employee.birth,
        `Jl. ${["Melati", "Kenanga", "Anggrek", "Cempaka", "Mawar"][index % 5]} No. ${12 + index}, Jakarta Selatan`,
        employee.marital,
      );
      employeeIds.set(employee.name, Number(result.lastInsertRowid));
    });

    const setManager = conn.prepare("UPDATE employees SET manager_id = ? WHERE id = ?");
    for (const employee of EMPLOYEES) {
      if (!employee.manager) continue;
      const managerId = employeeIds.get(employee.manager);
      const employeeId = employeeIds.get(employee.name);
      if (managerId && employeeId) setManager.run(managerId, employeeId);
    }

    const insertUser = conn.prepare(
      "INSERT INTO users (employee_id, email, password_hash, role) VALUES (?, ?, ?, ?)",
    );
    const passwordHash = hashPassword(PASSWORD);
    for (const employee of EMPLOYEES) {
      if (!employee.role) continue;
      const employeeId = employeeIds.get(employee.name);
      if (!employeeId) continue;
      insertUser.run(employeeId, emailFor(employee.name), passwordHash, employee.role);
    }

    const leaveTypeIds = new Map<string, number>();
    const insertLeaveType = conn.prepare("INSERT INTO leave_types (name, quota) VALUES (?, ?)");
    for (const type of LEAVE_TYPES) {
      const result = insertLeaveType.run(type.name, type.quota);
      leaveTypeIds.set(type.name, Number(result.lastInsertRowid));
    }

    const insertLeave = conn.prepare(`
      INSERT INTO leave_requests (
        employee_id, leave_type_id, start_date, end_date, days, reason, status,
        reviewer_id, reviewed_at, review_note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const addLeave = (options: {
      employee: string;
      type: string;
      start: string;
      end: string;
      reason: string;
      status: "Menunggu" | "Disetujui" | "Ditolak";
      reviewer?: string;
      reviewNote?: string | null;
      createdOffset?: number;
    }) => {
      const employeeId = employeeIds.get(options.employee);
      const leaveTypeId = leaveTypeIds.get(options.type);
      if (!employeeId || !leaveTypeId) return;
      const days = businessDays(options.start, options.end);
      const reviewerId = options.reviewer ? employeeIds.get(options.reviewer) ?? null : null;
      const reviewedAt =
        options.status === "Menunggu"
          ? null
          : `${addDays(options.start, -2)}T09:${String(10 + employeeId).slice(-2)}:00`;
      const createdAt =
        options.createdOffset === undefined
          ? `${addDays(today, -3)}T08:15:00`
          : `${addDays(today, options.createdOffset)}T08:15:00`;
      insertLeave.run(
        employeeId,
        leaveTypeId,
        options.start,
        options.end,
        days,
        options.reason,
        options.status,
        reviewerId,
        reviewedAt,
        options.reviewNote ?? null,
        createdAt,
      );
    };

    addLeave({
      employee: "Dewi Lestari",
      type: "Cuti Tahunan",
      start: addDays(today, 9),
      end: addDays(today, 11),
      reason: "Acara keluarga di Bandung dan perjalanan pulang kampung.",
      status: "Menunggu",
      createdOffset: -1,
    });
    addLeave({
      employee: "Siti Nurhaliza",
      type: "Cuti Tahunan",
      start: addDays(today, 14),
      end: addDays(today, 15),
      reason: "Mengurus dokumen pernikahan di kantor catatan sipil.",
      status: "Menunggu",
      createdOffset: -2,
    });
    addLeave({
      employee: "Fajar Hidayat",
      type: "Izin Khusus",
      start: addDays(today, 3),
      end: addDays(today, 3),
      reason: "Menghadiri wisuda adik di Yogyakarta.",
      status: "Menunggu",
      createdOffset: -1,
    });
    addLeave({
      employee: "Fitri Handayani",
      type: "Cuti Sakit",
      start: addDays(today, 1),
      end: addDays(today, 2),
      reason: "Demam dan perlu istirahat sesuai anjuran dokter.",
      status: "Menunggu",
      createdOffset: 0,
    });
    addLeave({
      employee: "Dimas Saputra",
      type: "Cuti Tahunan",
      start: addDays(today, 22),
      end: addDays(today, 24),
      reason: "Liburan akhir tahun bersama keluarga.",
      status: "Menunggu",
      createdOffset: -4,
    });

    addLeave({
      employee: "Dewi Lestari",
      type: "Cuti Tahunan",
      start: addDays(today, -21),
      end: addDays(today, -19),
      reason: "Liburan keluarga ke Bali.",
      status: "Disetujui",
      reviewer: "Rani Puspita",
      reviewNote: "Disetujui, pastikan handover sprint sudah selesai.",
      createdOffset: -30,
    });
    addLeave({
      employee: "Nadia Safira",
      type: "Cuti Tahunan",
      start: addDays(today, -7),
      end: addDays(today, -6),
      reason: "Keperluan keluarga.",
      status: "Disetujui",
      reviewer: "Andi Kurniawan",
      reviewNote: "Disetujui.",
      createdOffset: -14,
    });
    addLeave({
      employee: "Agus Pratama",
      type: "Cuti Sakit",
      start: addDays(today, -12),
      end: addDays(today, -12),
      reason: "Sakit dan surat dokter terlampir.",
      status: "Disetujui",
      reviewer: "Budi Santoso",
      reviewNote: "Disetujui, lekas sembuh.",
      createdOffset: -13,
    });
    addLeave({
      employee: "Rizky Ramadhan",
      type: "Cuti Tahunan",
      start: addDays(today, -30),
      end: addDays(today, -29),
      reason: "Mengurus renovasi rumah.",
      status: "Disetujui",
      reviewer: "Budi Santoso",
      reviewNote: "Disetujui.",
      createdOffset: -34,
    });
    addLeave({
      employee: "Yoga Permana",
      type: "Cuti Tahunan",
      start: addDays(today, -15),
      end: addDays(today, -13),
      reason: "Mengikuti festival musik di luar kota.",
      status: "Ditolak",
      reviewer: "Andi Kurniawan",
      reviewNote: "Bentrok dengan jadwal peluncuran kampanye produk. Silakan ajukan tanggal lain.",
      createdOffset: -20,
    });

    const leaveDates = new Set<string>();
    const approved = conn
      .prepare(
        "SELECT employee_id, start_date, end_date FROM leave_requests WHERE status = 'Disetujui'",
      )
      .all() as unknown as { employee_id: number; start_date: string; end_date: string }[];
    for (const leave of approved) {
      for (const date of dateRange(leave.start_date, leave.end_date)) {
        leaveDates.add(`${leave.employee_id}:${date}`);
      }
    }

    const employeeRows = conn
      .prepare("SELECT id, join_date FROM employees ORDER BY id")
      .all() as unknown as { id: number; join_date: string }[];

    const insertAttendance = conn.prepare(`
      INSERT INTO attendance (employee_id, date, clock_in, clock_out, status, note)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (employee_id, date) DO NOTHING
    `);

    for (let offset = 44; offset >= 0; offset -= 1) {
      const date = addDays(today, -offset);
      const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
      if (weekday === 0 || weekday === 6) continue;

      employeeRows.forEach((employee, index) => {
        if (date < employee.join_date) return;
        if (leaveDates.has(`${employee.id}:${date}`)) {
          insertAttendance.run(employee.id, date, null, null, "Cuti", "Cuti disetujui");
          return;
        }

        if (date === today && index % 7 === 3) return;

        const roll = random();
        let status = "Hadir";
        if (roll > 0.975) status = "Sakit";
        else if (roll > 0.955) status = "Izin";
        else if (roll > 0.915) status = "WFH";
        else if (roll > 0.845) status = "Terlambat";

        if (status === "Sakit" || status === "Izin") {
          insertAttendance.run(
            employee.id,
            date,
            null,
            null,
            status,
            status === "Sakit" ? "Surat dokter diterima" : "Izin keperluan pribadi",
          );
          return;
        }

        const late = status === "Terlambat";
        const clockInMinutes = late ? 511 + Math.floor(random() * 32) : 468 + Math.floor(random() * 41);
        const clockIn = hhmm(Math.min(clockInMinutes, 589));
        let clockOut: string | null = hhmm(1022 + Math.floor(random() * 70));
        if (date === today && random() > 0.55) clockOut = null;
        const note =
          status === "WFH"
            ? "Bekerja dari rumah"
            : late
              ? `Terlambat ${Math.max(1, Math.round((clockInMinutes - 510) / 1))} menit`
              : null;

        insertAttendance.run(employee.id, date, clockIn, clockOut, status, note);
      });
    }

    // Finalized payroll for the previous month.
    const period = previousPeriod(today);
    const { start, end } = monthRange(period);
    const previousWorkdays = dateRange(start, end).filter((date) => {
      const day = new Date(`${date}T00:00:00Z`).getUTCDay();
      return day !== 0 && day !== 6;
    });

    const payrollEmployees = conn
      .prepare(`
        SELECT id, join_date, base_salary, allowance_transport, allowance_meal, marital_status
        FROM employees WHERE status = 'Aktif' AND join_date <= ?
        ORDER BY id
      `)
      .all(end) as unknown as {
      id: number;
      join_date: string;
      base_salary: number;
      allowance_transport: number;
      allowance_meal: number;
      marital_status: string;
    }[];

    const insertRun = conn.prepare(`
      INSERT INTO payroll_runs (period, status, created_at, finalized_at, employee_count, total_gross, total_deduction, total_net)
      VALUES (?, 'Final', ?, ?, ?, ?, ?, ?)
    `);
    const insertPayslip = conn.prepare(`
      INSERT INTO payslips (
        run_id, employee_id, present_days, base_salary, allowance_transport, allowance_meal,
        overtime, gross, bpjs_kes, bpjs_jht, bpjs_jp, bpjs_jkk, bpjs_jkm, pph21,
        alpha_deduction, other_deduction, total_deduction, net,
        bpjs_base, ter_category, ter_rate, pph21_annual, employer_kes, employer_jht, employer_jp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const slips = payrollEmployees.map((employee) => {
      const attendance = conn
        .prepare("SELECT status, COUNT(*) AS c FROM attendance WHERE employee_id = ? AND date BETWEEN ? AND ? GROUP BY status")
        .all(employee.id, start, end) as unknown as { status: string; c: number }[];
      const byStatus = new Map(attendance.map((row) => [row.status, Number(row.c)]));
      const present = (byStatus.get("Hadir") ?? 0) + (byStatus.get("Terlambat") ?? 0) + (byStatus.get("WFH") ?? 0);
      const excused = (byStatus.get("Cuti") ?? 0) + (byStatus.get("Sakit") ?? 0) + (byStatus.get("Izin") ?? 0);
      const alpha = Math.max(0, previousWorkdays.length - present - excused);
      const calc = computePayslip(employee, {
        presentDays: present,
        alphaDays: alpha,
        period,
      });
      return { employee, present, calc };
    });

    const totals = slips.reduce(
      (acc, item) => ({
        gross: acc.gross + item.calc.gross,
        deduction: acc.deduction + item.calc.total_deduction,
        net: acc.net + item.calc.net,
      }),
      { gross: 0, deduction: 0, net: 0 },
    );

    const runResult = insertRun.run(
      period,
      `${addDays(today, -2)}T10:30:00`,
      `${addDays(today, -1)}T16:05:00`,
      slips.length,
      totals.gross,
      totals.deduction,
      totals.net,
    );
    const runId = Number(runResult.lastInsertRowid);

    for (const { employee, present, calc } of slips) {
      insertPayslip.run(
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

    conn.exec("COMMIT");
  } catch (error) {
    conn.exec("ROLLBACK");
    throw error;
  }

  seedRecruitment(conn);
  seedPerformance(conn);
}

function seedRecruitment(conn: DatabaseSync): void {
  const existing = conn.prepare("SELECT COUNT(*) AS c FROM job_openings").get() as {
    c: number;
  };
  if (Number(existing.c) > 0) return;

  const departmentId = (code: string) =>
    (conn.prepare("SELECT id FROM departments WHERE code = ?").get(code) as
      | { id: number }
      | undefined)?.id;
  const hr =
    (conn.prepare("SELECT id FROM employees WHERE email LIKE 'rani.%' LIMIT 1").get() as
      | { id: number }
      | undefined)?.id ?? null;
  const today = todayISO();

  const openings = [
    {
      title: "Senior Frontend Engineer",
      dept: "ENG",
      type: "Tetap",
      location: "Jakarta (Hybrid)",
      headcount: 2,
      status: "Dibuka",
      opened: -18,
      description:
        "Membangun dan memelihara antarmuka aplikasi HRIS yang dipakai puluhan ribu karyawan klien.",
      requirements:
        "Minimal 4 tahun pengalaman React/TypeScript, paham design system, dan terbiasa code review.",
    },
    {
      title: "Payroll Specialist",
      dept: "FIN",
      type: "Tetap",
      location: "Jakarta",
      headcount: 1,
      status: "Dibuka",
      opened: -25,
      description:
        "Menjalankan proses payroll bulanan, rekonsiliasi BPJS, dan pelaporan PPh 21.",
      requirements:
        "S1 Akuntansi, memahami PPh 21 TER dan BPJS Ketenagakerjaan, teliti dengan angka.",
    },
    {
      title: "Account Executive",
      dept: "MKT",
      type: "Kontrak",
      location: "Surabaya",
      headcount: 1,
      status: "Ditutup",
      opened: -60,
      closed: -20,
      description: "Menjaga hubungan klien korporat dan mencapai target penjualan regional timur.",
      requirements: "Minimal 2 tahun sales B2B, komunikasi kuat, bersedia perjalanan dinas.",
    },
  ];

  const applicantSeed = [
    { opening: 0, name: "Aditya Nugraha", email: "aditya.nugraha@gmail.com", source: "LinkedIn", stage: "Interview", rating: 4, notes: "Portofolio kuat, komunikasi jelas.", applied: -16 },
    { opening: 0, name: "Bella Kartika", email: "bella.kartika@gmail.com", source: "Job portal", stage: "Screening", rating: 3, notes: "Menunggu hasil tes teknis.", applied: -12 },
    { opening: 0, name: "Chris Martin", email: "chris.martin@gmail.com", source: "Referral", stage: "Baru", rating: null, notes: null, applied: -5 },
    { opening: 0, name: "Dinda Ayu", email: "dinda.ayu@gmail.com", source: "Job portal", stage: "Ditolak", rating: 2, notes: "Pengalaman belum sesuai kebutuhan.", applied: -14 },
    { opening: 1, name: "Eka Suryani", email: "eka.suryani@gmail.com", source: "Job portal", stage: "Penawaran", rating: 5, notes: "Kandidat utama, penawaran dikirim.", applied: -20 },
    { opening: 1, name: "Fajar Ramadhan", email: "fajar.ramadhan@gmail.com", source: "LinkedIn", stage: "Interview", rating: 4, notes: "Paham TER dan e-Bupot.", applied: -18 },
    { opening: 1, name: "Gita Permata", email: "gita.permata@gmail.com", source: "Referral", stage: "Ditolak", rating: 2, notes: "Belum berpengalaman payroll massal.", applied: -22 },
    { opening: 2, name: "Hendra Kusuma", email: "hendra.kusuma@gmail.com", source: "Job portal", stage: "Diterima", rating: 5, notes: "Diterima, kontrak berjalan.", applied: -55 },
  ];

  conn.exec("BEGIN");
  try {
    const insertOpening = conn.prepare(`
      INSERT INTO job_openings (
        title, department_id, employment_type, location, description, requirements,
        headcount, status, opened_at, closed_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const openingIds: number[] = [];
    for (const opening of openings) {
      const result = insertOpening.run(
        opening.title,
        departmentId(opening.dept) ?? 1,
        opening.type,
        opening.location,
        opening.description,
        opening.requirements,
        opening.headcount,
        opening.status,
        addDays(today, opening.opened),
        "closed" in opening && typeof opening.closed === "number"
          ? addDays(today, opening.closed)
          : null,
        hr,
      );
      openingIds.push(Number(result.lastInsertRowid));
    }

    const insertApplicant = conn.prepare(`
      INSERT INTO applicants (
        job_opening_id, full_name, email, phone, source, stage, rating, notes, applied_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    applicantSeed.forEach((applicant, index) => {
      insertApplicant.run(
        openingIds[applicant.opening],
        applicant.name,
        applicant.email,
        `0813-${String(7000 + index).padStart(4, "0")}-${String(2200 + index * 9).padStart(4, "0")}`,
        applicant.source,
        applicant.stage,
        applicant.rating,
        applicant.notes,
        addDays(today, applicant.applied),
      );
    });

    conn.exec("COMMIT");
  } catch (error) {
    conn.exec("ROLLBACK");
    throw error;
  }
}

function seedPerformance(conn: DatabaseSync): void {
  const existing = conn.prepare("SELECT COUNT(*) AS c FROM appraisal_cycles").get() as {
    c: number;
  };
  if (Number(existing.c) > 0) return;

  const employees = conn
    .prepare("SELECT id, manager_id FROM employees WHERE status = 'Aktif' ORDER BY id")
    .all() as unknown as { id: number; manager_id: number | null }[];
  if (employees.length === 0) return;

  const hrId =
    (conn.prepare("SELECT id FROM employees WHERE email LIKE 'rani.%' LIMIT 1").get() as
      | { id: number }
      | undefined)?.id ?? null;
  const today = todayISO();

  conn.exec("BEGIN");
  try {
    const cycle = conn
      .prepare(
        "INSERT INTO appraisal_cycles (name, period_start, period_end, status, created_at) VALUES (?, ?, ?, 'Berjalan', ?)",
      )
      .run(
        "Penilaian Kinerja Semester II 2026",
        "2026-07-01",
        "2026-12-31",
        `${addDays(today, -14)}T09:00:00`,
      );
    const cycleId = Number(cycle.lastInsertRowid);

    const insertAppraisal = conn.prepare(`
      INSERT INTO appraisals (
        cycle_id, employee_id, reviewer_id, status, manager_note, final_score, rating, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertScore = conn.prepare(`
      INSERT INTO appraisal_scores (appraisal_id, criterion, weight, score)
      VALUES (?, ?, ?, ?)
    `);

    for (const employee of employees) {
      const reviewerId = employee.manager_id ?? hrId;
      const completed = employee.id % 3 !== 0;
      const scores = CRITERIA.map((criterion, index) => ({
        criterion: criterion.key,
        score: completed ? 3 + ((employee.id + index) % 3) : null,
      }));
      const finalScore = completed ? weightedScore(scores) : null;

      const inserted = insertAppraisal.run(
        cycleId,
        employee.id,
        reviewerId,
        completed ? "Selesai" : "Menunggu",
        completed ? "Kinerja konsisten dan komunikasi lintas tim berjalan baik." : null,
        finalScore,
        finalScore === null ? null : ratingFor(finalScore),
        completed ? `${addDays(today, -7)}T15:30:00` : null,
      );
      const appraisalId = Number(inserted.lastInsertRowid);

      for (const [index, criterion] of CRITERIA.entries()) {
        insertScore.run(
          appraisalId,
          criterion.key,
          criterion.weight,
          completed ? 3 + ((employee.id + index) % 3) : null,
        );
      }
    }

    conn.exec("COMMIT");
  } catch (error) {
    conn.exec("ROLLBACK");
    throw error;
  }
}
