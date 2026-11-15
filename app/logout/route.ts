import { NextResponse } from "next/server";
import { revokeCurrentSession } from "@/lib/auth";

function safeRedirect(request: Request): NextResponse {
  const url = new URL(request.url);
  const host = request.headers.get("host");
  const base = host && /^[A-Za-z0-9.:\[\]-]+$/.test(host) ? host : url.host;
  return NextResponse.redirect(new URL("/login", `${url.protocol}//${base}`), 303);
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
  // GET fallback without Origin/Referer is allowed; POST is enforced by middleware.
  return request.method === "GET";
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  await revokeCurrentSession();
  return safeRedirect(request);
}

export async function GET(request: Request) {
  if (!isAllowedOrigin(request)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  await revokeCurrentSession();
  return safeRedirect(request);
}
