import { describe, expect, it } from "vitest";
import { WHATSAPP_DISPLAY, whatsappLink } from "@/lib/whatsapp";

describe("whatsapp", () => {
  it("whatsapp link: wa.me with Beatriz's number and the message url-encoded", () => {
    const link = whatsappLink('Oi, Beatriz! Vi o "Cadeira" & queria saber mais.');
    expect(link).toBe(
      "https://wa.me/5585988391139?text=Oi%2C%20Beatriz!%20Vi%20o%20%22Cadeira%22%20%26%20queria%20saber%20mais.",
    );
    expect(WHATSAPP_DISPLAY).toBe("(85) 98839-1139");
  });
});
