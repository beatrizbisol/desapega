import { NextResponse } from "next/server";
import { adminError, requireAdmin } from "@/lib/admin-guard";
import { updateOrderStatus } from "@/lib/store";
import type { Order } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const status = String(body.status ?? "") as Order["status"];

    if (status !== "pending" && status !== "confirmed" && status !== "cancelled") {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }

    const order = await updateOrderStatus(id, status);
    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error) {
    return adminError(error, "Erro ao atualizar pedido.");
  }
}
