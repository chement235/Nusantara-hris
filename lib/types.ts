export type Role = "hr" | "manager" | "employee";

export type SessionUser = {
  userId: number;
  employeeId: number;
  email: string;
  name: string;
  role: Role;
  position: string;
  department: string;
};

export const ROLE_LABEL: Record<Role, string> = {
  hr: "HR Admin",
  manager: "Manager",
  employee: "Karyawan",
};

export type DepartmentRow = {
  id: number;
  code: string;
  name: string;
};

export type EmployeeRow = {
  id: number;
  nip: string;
  full_name: string;
  email: string;
  phone: string | null;
  department_id: number;
  department_name: string;
  department_code: string;
  position: string;
  job_level: string;
  employment_type: string;
  status: string;
  join_date: string;
  contract_end: string | null;
  manager_id: number | null;
  manager_name: string | null;
  base_salary: number;
  allowance_transport: number;
  allowance_meal: number;
  bank_name: string | null;
  bank_account: string | null;
  npwp: string | null;
  birth_date: string | null;
  address: string | null;
  marital_status: string;
};

export type AttendanceRow = {
  id: number;
  employee_id: number;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: string;
  note: string | null;
};

export type LeaveTypeRow = {
  id: number;
  name: string;
  quota: number;
};

export type LeaveRequestRow = {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_nip: string;
  department_name: string;
  leave_type_id: number;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: string;
  reviewer_id: number | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
};

export type PayrollRunRow = {
  id: number;
  period: string;
  status: string;
  created_at: string;
  finalized_at: string | null;
  employee_count: number;
  total_gross: number;
  total_deduction: number;
  total_net: number;
};

export type PayslipRow = {
  id: number;
  run_id: number;
  employee_id: number;
  employee_name: string;
  employee_nip: string;
  department_name: string;
  position: string;
  marital_status: string;
  present_days: number;
  base_salary: number;
  allowance_transport: number;
  allowance_meal: number;
  overtime: number;
  gross: number;
  bpjs_kes: number;
  bpjs_jht: number;
  bpjs_jp: number;
  bpjs_jkk: number;
  bpjs_jkm: number;
  pph21: number;
  alpha_deduction: number;
  other_deduction: number;
  total_deduction: number;
  net: number;
};
