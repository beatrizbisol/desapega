import { NextResponse } from "next/server";
import { adminError, requireAdmin } from "@/lib/admin-guard";
import { listOrders } from "@/lib/store";

export async function GET() {
  try {
    await requireAdmin();
    const orders = await listOrders();
    return NextResponse.json(orders);
  } catch (error) {
    return adminError(error, "Erro ao listar pedidos.");
  }
}
