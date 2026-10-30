import { NextResponse } from "next/server";
import { assertAdmin, deleteItem, getItem, updateItem } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const item = await getItem(id);
  if (!item) {
    return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    assertAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const patch: Parameters<typeof updateItem>[1] = {};

    if (body.title !== undefined) patch.title = String(body.title).trim();
    if (body.description !== undefined) {
      patch.description = String(body.description).trim();
    }
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price <= 0) {
        return NextResponse.json({ error: "Valor inválido." }, { status: 400 });
      }
      patch.price = price;
    }
    if (body.photos !== undefined) {
      patch.photos = Array.isArray(body.photos)
        ? body.photos.map(String).filter(Boolean)
        : [];
    }
    if (body.status !== undefined) {
      if (!["available", "reserved", "sold"].includes(body.status)) {
        return NextResponse.json({ error: "Status inválido." }, { status: 400 });
      }
      patch.status = body.status;
    }

    const item = await updateItem(id, patch);
    if (!item) {
      return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro ao atualizar item." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    assertAdmin(request);
    const { id } = await params;
    const ok = await deleteItem(id);
    if (!ok) {
      return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro ao excluir item." }, { status: 500 });
  }
}
