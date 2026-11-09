import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { one } from "./db";
import type { Role, SessionUser } from "./types";

export const SESSION_COOKIE = "nusantara_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function secret(): string {
  return process.env.SESSION_SECRET ?? "nusantara-hris-dev-secret";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(userId: number): string {
  const body = Buffer.from(
    JSON.stringify({ uid: userId, exp: Date.now() + MAX_AGE_SECONDS * 1000 }),
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

function readToken(token: string): number | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  if (
    expected.length !== signature.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as {
      uid?: number;
      exp?: number;
    };
    if (!payload.uid || !payload.exp || payload.exp < Date.now()) return null;
    return payload.uid;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: number): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = readToken(token);
  if (!userId) return null;

  const row = one<{
    user_id: number;
    employee_id: number;
    email: string;
    full_name: string;
    role: Role;
    position: string;
    department: string;
  }>(
    `SELECT u.id AS user_id, u.email, u.role, e.id AS employee_id, e.full_name,
            e.position, d.name AS department
     FROM users u
     JOIN employees e ON e.id = u.employee_id
     JOIN departments d ON d.id = e.department_id
     WHERE u.id = ? AND e.status = 'Aktif'`,
    userId,
  );
  if (!row) return null;

  return {
    userId: Number(row.user_id),
    employeeId: Number(row.employee_id),
    email: row.email,
    name: row.full_name,
    role: row.role,
    position: row.position,
    department: row.department,
  };
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const session = await requireSession();
  if (!roles.includes(session.role)) redirect("/?denied=1");
  return session;
}

export function canApprove(role: Role): boolean {
  return role === "hr" || role === "manager";
}
