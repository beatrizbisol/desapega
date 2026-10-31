import { NextResponse } from "next/server";
import { adminError, requireAdmin } from "@/lib/admin-guard";
import { parsePageQuery } from "@/lib/pagination";
import { listOrdersPage } from "@/lib/store";

const STATUSES = ["pending", "confirmed", "cancelled"] as const;

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const page = parsePageQuery(request.url, STATUSES);
    if (!page) {
      return NextResponse.json({ error: "Parâmetros de paginação inválidos." }, { status: 400 });
    }
    const { rows, nextCursor } = await listOrdersPage(page);
    return NextResponse.json({ orders: rows, nextCursor });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CURSOR") {
      return NextResponse.json({ error: "Parâmetros de paginação inválidos." }, { status: 400 });
    }
    return adminError(error, "Erro ao listar pedidos.");
  }
}
