import { NextResponse } from "next/server";
import { adminError, requireAdmin } from "@/lib/admin-guard";
import { parsePageQuery } from "@/lib/pagination";
import { createItem, listItemsPage } from "@/lib/store";

const STATUSES = ["available", "reserved", "sold"] as const;

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const page = parsePageQuery(request.url, STATUSES);
    if (!page) {
      return NextResponse.json({ error: "Parâmetros de paginação inválidos." }, { status: 400 });
    }
    const { rows, nextCursor } = await listItemsPage(page);
    return NextResponse.json({ items: rows, nextCursor });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CURSOR") {
      return NextResponse.json({ error: "Parâmetros de paginação inválidos." }, { status: 400 });
    }
    return adminError(error, "Erro ao listar itens.");
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const price = Number(body.price);
    const photos = Array.isArray(body.photos)
      ? body.photos.map(String).filter(Boolean)
      : [];

    if (!title || !description || !Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { error: "Preencha título, descrição e um valor válido." },
        { status: 400 },
      );
    }
    if (photos.length === 0) {
      return NextResponse.json(
        { error: "Adicione pelo menos uma foto." },
        { status: 400 },
      );
    }

    const item = await createItem({ title, description, price, photos });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return adminError(error, "Erro ao criar item.");
  }
}
