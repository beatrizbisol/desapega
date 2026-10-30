import { NextResponse } from "next/server";
import { assertAdmin, createItem, listItems } from "@/lib/store";

export async function GET() {
  const items = await listItems();
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  try {
    assertAdmin(request);
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
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro ao criar item." }, { status: 500 });
  }
}
