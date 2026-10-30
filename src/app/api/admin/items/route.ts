import { NextResponse } from "next/server";
import { adminError, requireAdmin } from "@/lib/admin-guard";
import { createItem } from "@/lib/store";

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
