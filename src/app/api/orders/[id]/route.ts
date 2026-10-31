import { NextResponse } from "next/server";
import { assertAdmin, updateOrderStatus } from "@/lib/store";
import type { Order } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    assertAdmin(request);
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
    if (error instanceof Error && error.message === "INVALID_TRANSITION") {
      return NextResponse.json(
        { error: "Só um pedido pendente pode ser confirmado ou voltar a pendente." },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro ao atualizar pedido." }, { status: 500 });
  }
}
