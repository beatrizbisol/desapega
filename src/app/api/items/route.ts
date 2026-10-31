import { NextResponse } from "next/server";
import { parsePageQuery } from "@/lib/pagination";
import { listItemsPage } from "@/lib/store";

const STATUSES = ["available", "reserved", "sold"] as const;

export async function GET(request: Request) {
  const page = parsePageQuery(request.url, STATUSES);
  if (!page) {
    return NextResponse.json({ error: "Parâmetros de paginação inválidos." }, { status: 400 });
  }
  try {
    const { rows, nextCursor } = await listItemsPage(page);
    return NextResponse.json({ items: rows, nextCursor });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CURSOR") {
      return NextResponse.json({ error: "Parâmetros de paginação inválidos." }, { status: 400 });
    }
    console.error("[items] Erro ao listar itens.", error);
    return NextResponse.json({ error: "Erro ao listar itens." }, { status: 500 });
  }
}
