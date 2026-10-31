import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAllowedEmail } from "@/auth.config";

export async function isAdmin() {
  const session = await auth();
  return isAllowedEmail(session?.user?.email);
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("UNAUTHORIZED");
}

export function adminError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  console.error(`[admin] ${fallback}`, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
