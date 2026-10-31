import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/whatsapp";

export function WhatsAppButton({ message, label }: { message: string; label: string }) {
  return (
    <a
      href={whatsappLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#1fa855] bg-white px-4 text-sm font-semibold text-[#128c4a] transition hover:bg-[#effaf3] sm:w-auto"
    >
      <MessageCircle className="size-4" aria-hidden />
      {label}
    </a>
  );
}
