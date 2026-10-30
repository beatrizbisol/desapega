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
