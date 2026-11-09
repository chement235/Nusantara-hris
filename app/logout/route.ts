import { redirect } from "next/navigation";
import { clearSessionCookie } from "@/lib/auth";

export async function POST(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}

export async function GET(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
