import { NextResponse } from "next/server";
import { one } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function baseUrl(request: Request): string {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

function redirectTo(request: Request, path: string, status = 303): NextResponse {
  return NextResponse.redirect(new URL(path, baseUrl(request)), status);
}

export async function POST(request: Request): Promise<NextResponse> {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  if (!email || !password) {
    return redirectTo(request, "/login?error=Email%20dan%20kata%20sandi%20wajib%20diisi.");
  }

  const user = one<{ id: number; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE lower(email) = ?",
    email,
  );

  if (!user || !verifyPassword(password, user.password_hash)) {
    return redirectTo(request, "/login?error=Email%20atau%20kata%20sandi%20salah.");
  }

  const response = redirectTo(request, "/");
  response.cookies.set({
    name: SESSION_COOKIE,
    value: createSessionToken(Number(user.id)),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return response;
}
