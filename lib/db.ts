import type { DatabaseSync } from "node:sqlite";
import { seedDatabase } from "./seed";

// Node builtins are resolved at runtime so bundlers never need to externalize
// them for client chunks.
const getBuiltin = (process as unknown as { getBuiltinModule: (id: string) => unknown })
  .getBuiltinModule;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nip TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  department_id INTEGER NOT NULL REFERENCES departments(id),
  position TEXT NOT NULL,
  job_level TEXT NOT NULL DEFAULT 'Staff',
  employment_type TEXT NOT NULL DEFAULT 'Tetap',
  status TEXT NOT NULL DEFAULT 'Aktif',
  join_date TEXT NOT NULL,
  contract_end TEXT,
  manager_id INTEGER REFERENCES employees(id),
  base_salary INTEGER NOT NULL DEFAULT 0,
  allowance_transport INTEGER NOT NULL DEFAULT 0,
  allowance_meal INTEGER NOT NULL DEFAULT 0,
  bank_name TEXT,
  bank_account TEXT,
  npwp TEXT,
  birth_date TEXT,
  address TEXT,
  marital_status TEXT NOT NULL DEFAULT 'TK/0'
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee'
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  date TEXT NOT NULL,
  clock_in TEXT,
  clock_out TEXT,
  status TEXT NOT NULL,
  note TEXT,
  UNIQUE (employee_id, date)
);

CREATE TABLE IF NOT EXISTS leave_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  quota INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  leave_type_id INTEGER NOT NULL REFERENCES leave_types(id),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  days INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Menunggu',
  reviewer_id INTEGER REFERENCES employees(id),
  reviewed_at TEXT,
  review_note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  period TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Draft',
  created_at TEXT NOT NULL,
  finalized_at TEXT,
  employee_count INTEGER NOT NULL DEFAULT 0,
  total_gross INTEGER NOT NULL DEFAULT 0,
  total_deduction INTEGER NOT NULL DEFAULT 0,
  total_net INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payslips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  present_days INTEGER NOT NULL DEFAULT 0,
  base_salary INTEGER NOT NULL DEFAULT 0,
  allowance_transport INTEGER NOT NULL DEFAULT 0,
  allowance_meal INTEGER NOT NULL DEFAULT 0,
  overtime INTEGER NOT NULL DEFAULT 0,
  gross INTEGER NOT NULL DEFAULT 0,
  bpjs_kes INTEGER NOT NULL DEFAULT 0,
  bpjs_jht INTEGER NOT NULL DEFAULT 0,
  bpjs_jp INTEGER NOT NULL DEFAULT 0,
  bpjs_jkk INTEGER NOT NULL DEFAULT 0,
  bpjs_jkm INTEGER NOT NULL DEFAULT 0,
  pph21 INTEGER NOT NULL DEFAULT 0,
  alpha_deduction INTEGER NOT NULL DEFAULT 0,
  other_deduction INTEGER NOT NULL DEFAULT 0,
  total_deduction INTEGER NOT NULL DEFAULT 0,
  net INTEGER NOT NULL DEFAULT 0,
  UNIQUE (run_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance (date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance (employee_id, date);
CREATE INDEX IF NOT EXISTS idx_leave_employee ON leave_requests (employee_id, status);
CREATE INDEX IF NOT EXISTS idx_payslip_run ON payslips (run_id);
`;

type GlobalWithDb = typeof globalThis & { __hrisDb?: DatabaseSync };

export function db(): DatabaseSync {
  const globalRef = globalThis as GlobalWithDb;
  if (globalRef.__hrisDb) return globalRef.__hrisDb;

  const { DatabaseSync: Sqlite } = getBuiltin("node:sqlite") as typeof import("node:sqlite");
  const nodePath = getBuiltin("node:path") as typeof import("node:path");
  const nodeFs = getBuiltin("node:fs") as typeof import("node:fs");

  const file = process.env.HRIS_DB_PATH ?? nodePath.join(process.cwd(), "data", "hris.db");
  nodeFs.mkdirSync(nodePath.dirname(file), { recursive: true });

  const connection = new Sqlite(file);
  connection.exec("PRAGMA journal_mode = WAL;");
  connection.exec("PRAGMA foreign_keys = ON;");
  connection.exec(SCHEMA);
  seedDatabase(connection);

  globalRef.__hrisDb = connection;
  return connection;
}

export function all<T>(sql: string, ...params: unknown[]): T[] {
  return db()
    .prepare(sql)
    .all(...(params as never[])) as unknown as T[];
}

export function one<T>(sql: string, ...params: unknown[]): T | undefined {
  return db()
    .prepare(sql)
    .get(...(params as never[])) as unknown as T | undefined;
}

export function run(sql: string, ...params: unknown[]): { changes: number; lastInsertRowid: number } {
  const result = db()
    .prepare(sql)
    .run(...(params as never[]));
  return {
    changes: Number(result.changes),
    lastInsertRowid: Number(result.lastInsertRowid),
  };
}
