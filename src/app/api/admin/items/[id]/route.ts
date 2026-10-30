import { NextResponse } from "next/server";
import { adminError, requireAdmin } from "@/lib/admin-guard";
import { deleteItem, updateItem } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin();
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
    return adminError(error, "Erro ao atualizar item.");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const ok = await deleteItem(id);
    if (!ok) {
      return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminError(error, "Erro ao excluir item.");
  }
}
