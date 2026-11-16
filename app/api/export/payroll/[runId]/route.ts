import { getSession } from "@/lib/auth";
import { csvDocument } from "@/lib/csv";
import { all, one } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (session.role !== "hr") {
    return new Response("Forbidden", { status: 403 });
  }

  const { runId: rawRunId } = await params;
  const runId = Number(rawRunId);
  if (!Number.isFinite(runId) || runId <= 0) {
    return new Response("Not Found", { status: 404 });
  }

  const payrollRun = one<{ id: number; period: string }>(
    "SELECT id, period FROM payroll_runs WHERE id = ?",
    runId,
  );
  if (!payrollRun) {
    return new Response("Not Found", { status: 404 });
  }

  const rows = all<{
    nip: string;
    full_name: string;
    bank_name: string | null;
    bank_account: string | null;
    net: number;
  }>(
    `SELECT e.nip, e.full_name, e.bank_name, e.bank_account, p.net
     FROM payslips p
     JOIN employees e ON e.id = p.employee_id
     WHERE p.run_id = ?
     ORDER BY e.full_name`,
    runId,
  );

  const csv = csvDocument([
    ["NIP", "Nama", "Bank", "Nomor Rekening", "Jumlah Transfer (IDR)"],
    ...rows.map((row) => [
      row.nip,
      row.full_name,
      row.bank_name ?? "",
      row.bank_account ?? "",
      row.net,
    ]),
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payroll-transfer-${payrollRun.period}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
