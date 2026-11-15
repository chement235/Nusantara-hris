import { NextResponse } from "next/server";
import { one } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { auditLog, checkLoginAllowed, clearLoginFailures, recordLoginFailure } from "@/lib/security";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function safeBaseUrl(request: Request): string {
  const url = new URL(request.url);
  // Prefer the validated Host header so the redirect matches the user's origin.
  const host = request.headers.get("host");
  if (host && /^[A-Za-z0-9.:\[\]-]+$/.test(host)) {
    return `${url.protocol}//${host}`;
  }
  // Never trust client-provided X-Forwarded-Host; fall back to request URL origin.
  return `${url.protocol}//${url.host}`;
}

function redirectTo(request: Request, path: string, status = 303): NextResponse {
  return NextResponse.redirect(new URL(path, safeBaseUrl(request)), status);
}

function isAllowedOrigin(request: Request): boolean {
  const host = request.headers.get("host");
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  const referer = request.headers.get("referer");
  if (referer && host) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }
  return false;
}

function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim().slice(0, 80);
  return "unknown";
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isAllowedOrigin(request)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) {
    return redirectTo(request, "/login?error=Email%20dan%20kata%20sandi%20wajib%20diisi.");
  }

  const ip = clientIp(request);
  const key = `${ip}|${email}`;
  const allowed = checkLoginAllowed(key);
  if (!allowed.allowed) {
    auditLog({ action: "login.locked", targetType: "user_email", targetId: email, ip, details: "rate limited" });
    return redirectTo(request, "/login?error=Terlalu%20banyak%20percobaan.%20Coba%20lagi%20nanti.");
  }

  const user = one<{ id: number; password_hash: string; role?: string }>(
    "SELECT id, password_hash, role FROM users WHERE lower(email) = ?",
    email,
  );

  if (!user || !verifyPassword(password, user.password_hash)) {
    recordLoginFailure(key);
    auditLog({ action: "login.failed", targetType: "user_email", targetId: email, ip });
    return redirectTo(request, "/login?error=Email%20atau%20kata%20sandi%20salah.");
  }

  clearLoginFailures(key);
  const { token } = createSessionToken(Number(user.id));
  const response = redirectTo(request, "/");
  const isProd = process.env.NODE_ENV === "production";
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProd,
    maxAge: MAX_AGE_SECONDS,
  });
  // Remove legacy cookie name if present (skip when it is the active cookie name in dev).
  if (SESSION_COOKIE !== "nusantara_session") {
    response.cookies.set({ name: "nusantara_session", value: "", path: "/", maxAge: 0 });
  }
  auditLog({
    actorUserId: Number(user.id),
    actorRole: user.role ?? null,
    action: "login.success",
    targetType: "user",
    targetId: String(user.id),
    ip,
  });
  return response;
}
