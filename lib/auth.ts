import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { one } from "./db";
import { isSessionRevoked, revokeSessionJti } from "./security";
import type { Role, SessionUser } from "./types";

export const SESSION_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-nusantara_session" : "nusantara_session";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    throw new Error("SESSION_SECRET wajib diatur. Set environment variable SESSION_SECRET.");
  }
  return value;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export interface SessionTokenPayload {
  uid: number;
  jti: string;
  exp: number; // unix seconds
}

export function createSessionToken(userId: number): { token: string; payload: SessionTokenPayload } {
  const payload: SessionTokenPayload = {
    uid: userId,
    jti: crypto.randomUUID(),
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { token: `${body}.${sign(body)}`, payload };
}

function verifySessionToken(token: string): SessionTokenPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  if (!safeEqual(sign(body), signature)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<SessionTokenPayload>;
    if (
      !payload ||
      typeof payload.uid !== "number" ||
      !Number.isInteger(payload.uid) ||
      typeof payload.jti !== "string" ||
      !payload.jti ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload as SessionTokenPayload;
  } catch {
    return null;
  }
}

function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    secure: isProd,
    maxAge: MAX_AGE_SECONDS,
  };
}

export async function setSessionCookie(userId: number): Promise<void> {
  const { token } = createSessionToken(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions());
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  // Clear legacy cookie names from previous deployments.
  store.delete("nusantara_session");
  store.delete("__Host-nusantara_session");
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token =
    store.get(SESSION_COOKIE)?.value ??
    store.get("nusantara_session")?.value ??
    store.get("__Host-nusantara_session")?.value;
  if (!token) return null;
  const payload = verifySessionToken(token);
  if (!payload) return null;
  try {
    if (isSessionRevoked(payload.jti)) return null;
  } catch {
    // Fail closed when the revocation store is unavailable.
    return null;
  }

  const row = one<{
    user_id: number;
    employee_id: number;
    email: string;
    full_name: string;
    role: Role;
    position: string;
    department: string;
    status: string;
  }>(
    `SELECT u.id AS user_id, u.email, u.role, e.id AS employee_id, e.full_name,
            e.position, d.name AS department, e.status
     FROM users u
     JOIN employees e ON e.id = u.employee_id
     JOIN departments d ON d.id = e.department_id
     WHERE u.id = ? AND e.status = 'Aktif'`,
    payload.uid,
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

export async function revokeCurrentSession(): Promise<void> {
  const store = await cookies();
  const token =
    store.get(SESSION_COOKIE)?.value ??
    store.get("nusantara_session")?.value ??
    store.get("__Host-nusantara_session")?.value;
  if (token) {
    const payload = verifySessionToken(token);
    if (payload) {
      try {
        revokeSessionJti(payload.jti, payload.uid, payload.exp);
      } catch {
        // best effort
      }
    }
  }
  await clearSessionCookie();
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
