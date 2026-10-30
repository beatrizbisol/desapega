import { NextResponse } from "next/server";
import { isValidMobilePhone, phoneDigits } from "@/lib/phone";
import { assertAdmin, createOrder, listOrders } from "@/lib/store";
import type { DeliveryMethod, PaymentMethod } from "@/lib/types";

export async function GET(request: Request) {
  try {
    assertAdmin(request);
    const orders = await listOrders();
    return NextResponse.json(orders);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro ao listar pedidos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const itemId = String(body.itemId ?? "");
    const buyerName = String(body.buyerName ?? "").trim();
    const buyerPhone = String(body.buyerPhone ?? "").trim();
    const paymentMethod = String(body.paymentMethod ?? "") as PaymentMethod;
    const deliveryMethod = String(body.deliveryMethod ?? "") as DeliveryMethod;

    if (!itemId || !buyerName || !buyerPhone) {
      return NextResponse.json(
        { error: "Preencha nome e telefone." },
        { status: 400 },
      );
    }
    if (!isValidMobilePhone(buyerPhone)) {
      return NextResponse.json(
        { error: "Informe um celular com DDD (2 dígitos) + 9 dígitos." },
        { status: 400 },
      );
    }
    if (paymentMethod !== "pix" && paymentMethod !== "card") {
      return NextResponse.json(
        { error: "Escolha Pix ou cartão." },
        { status: 400 },
      );
    }
    if (
      deliveryMethod !== "pickup" &&
      deliveryMethod !== "uber_flash" &&
      deliveryMethod !== "correios"
    ) {
      return NextResponse.json(
        { error: "Escolha a forma de entrega." },
        { status: 400 },
      );
    }

    const order = await createOrder({
      itemId,
      buyerName,
      buyerPhone: phoneDigits(buyerPhone),
      paymentMethod,
      deliveryMethod,
    });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "ITEM_NOT_FOUND") {
      return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "ITEM_UNAVAILABLE") {
      return NextResponse.json(
        { error: "Este item já foi reservado ou vendido." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Erro ao criar pedido." }, { status: 500 });
  }
}
