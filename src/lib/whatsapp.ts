const WHATSAPP_NUMBER = "5585988391139";

export const WHATSAPP_DISPLAY = "(85) 98839-1139";

export function whatsappLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
