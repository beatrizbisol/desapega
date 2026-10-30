import type { DeliveryMethod } from "./types";

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function statusLabel(status: "available" | "reserved" | "sold"): string {
  switch (status) {
    case "available":
      return "Disponível";
    case "reserved":
      return "Reservado";
    case "sold":
      return "Vendido";
  }
}

export function deliveryLabel(method: DeliveryMethod): string {
  switch (method) {
    case "pickup":
      return "Retirada presencial em Boa Vista";
    case "uber_flash":
      return "Uber Flash (frete por conta do comprador)";
    case "correios":
      return "Correios (frete por conta do comprador)";
  }
}

export function paymentLabel(method: "pix" | "card"): string {
  return method === "pix" ? "Pix" : "Cartão";
}

export function orderStatusLabel(
  status: "pending" | "confirmed" | "cancelled",
): string {
  switch (status) {
    case "pending":
      return "Aguardando pagamento";
    case "confirmed":
      return "Confirmado";
    case "cancelled":
      return "Cancelado / expirado";
  }
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}
