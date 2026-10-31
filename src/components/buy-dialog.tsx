"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { useRouter } from "next/navigation";
import { CreditCard, QrCode, Truck, MapPin, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL, deliveryLabel, paymentLabel } from "@/lib/format";
import { formatPhoneInput, isValidMobilePhone } from "@/lib/phone";
import type { DeliveryMethod, PaymentMethod } from "@/lib/types";

export function BuyDialog({
  itemId,
  title,
  price,
  disabled,
}: {
  itemId: string;
  title: string;
  price: number;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setDone(false);
    setBuyerName("");
    setBuyerPhone("");
    setPaymentMethod(null);
    setDeliveryMethod(null);
    setError(null);
    setLoading(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) return;
    // why: refreshing while the confirmation is open re-renders the item as
    // reserved, which unmounts this dialog before the buyer can read it.
    if (done) router.refresh();
    reset();
  }

  async function submitOrder(event: FormEvent) {
    event.preventDefault();
    if (!paymentMethod) {
      setError("Escolha Pix ou cartão.");
      return;
    }
    if (!deliveryMethod) {
      setError("Escolha a forma de entrega.");
      return;
    }
    if (!buyerName.trim()) {
      setError("Informe seu nome.");
      return;
    }
    if (!isValidMobilePhone(buyerPhone)) {
      setError("Celular com DDD (2 dígitos) + 9 dígitos, ex.: (51) 99999-0000.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          buyerName,
          buyerPhone,
          paymentMethod,
          deliveryMethod,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Não foi possível reservar.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="lg"
        disabled={disabled}
        className="w-full sm:w-auto"
        onClick={() => handleOpenChange(true)}
      >
        Comprar
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {done && paymentMethod && deliveryMethod ? (
            <>
              <DialogHeader>
                <DialogTitle>Pedido registrado</DialogTitle>
                <DialogDescription>
                  Reservamos <strong>{title}</strong> ({formatBRL(price)}) pra
                  você ({paymentLabel(paymentMethod)} ·{" "}
                  {deliveryLabel(deliveryMethod)}). Em até 24h entraremos em
                  contato com o link de pagamento. Você terá 24h para pagar e
                  garantir o item; depois disso a reserva cai e o anúncio volta
                  a ficar disponível.
                </DialogDescription>
              </DialogHeader>
              <WhatsAppButton
                label="Avisar a Beatriz no WhatsApp"
                message={`Oi, Beatriz! Acabei de reservar "${title}" (${formatBRL(price)}) no desapega. Meu nome é ${buyerName.trim()}.`}
              />
              <Button
                type="button"
                className="w-full"
                onClick={() => handleOpenChange(false)}
              >
                Fechar
              </Button>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Comprar {title}</DialogTitle>
                <DialogDescription>
                  Estoque de 1 unidade · {formatBRL(price)}. Enviaremos o link de
                  pagamento; taxas de cartão ficam por conta do comprador. Frete
                  (Uber Flash ou Correios) também é por conta de quem compra.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-lg border border-[var(--ocean)]/25 bg-[var(--mist)] px-3 py-3 text-sm leading-relaxed text-[var(--ocean-ink)]">
                Em até <strong>24 horas</strong> entraremos em contato. Depois
                disso, você terá <strong>24 horas</strong> para fazer o
                pagamento e garantir o item. Passado esse prazo, a reserva cai e
                o anúncio volta a ficar disponível no site.
              </div>

              <form className="space-y-5" onSubmit={submitOrder}>
                <fieldset className="space-y-2">
                  <Legend>Pagamento</Legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <ChoiceCard
                      selected={paymentMethod === "pix"}
                      onClick={() => setPaymentMethod("pix")}
                      icon={<QrCode className="size-5 text-[var(--ocean)]" />}
                      title="Pix"
                      subtitle="Enviaremos o link/QR"
                    />
                    <ChoiceCard
                      selected={paymentMethod === "card"}
                      onClick={() => setPaymentMethod("card")}
                      icon={<CreditCard className="size-5 text-[var(--ocean)]" />}
                      title="Cartão"
                      subtitle="Taxas por conta do comprador"
                    />
                  </div>
                </fieldset>

                <fieldset className="space-y-2">
                  <Legend>Entrega</Legend>
                  <div className="grid gap-2">
                    <ChoiceCard
                      selected={deliveryMethod === "pickup"}
                      onClick={() => setDeliveryMethod("pickup")}
                      icon={<MapPin className="size-5 text-[var(--ocean)]" />}
                      title="Retirada em Boa Vista — Porto Alegre"
                      subtitle="Presencial, combinamos o horário"
                    />
                    <ChoiceCard
                      selected={deliveryMethod === "uber_flash"}
                      onClick={() => setDeliveryMethod("uber_flash")}
                      icon={<Truck className="size-5 text-[var(--ocean)]" />}
                      title="Uber Flash"
                      subtitle="Frete pago pelo comprador"
                    />
                    <ChoiceCard
                      selected={deliveryMethod === "correios"}
                      onClick={() => setDeliveryMethod("correios")}
                      icon={<Package className="size-5 text-[var(--ocean)]" />}
                      title="Correios"
                      subtitle="Frete pago pelo comprador"
                    />
                  </div>
                </fieldset>

                <div className="space-y-2">
                  <Label htmlFor="buyerName">Nome</Label>
                  <Input
                    id="buyerName"
                    value={buyerName}
                    onChange={(event) => setBuyerName(event.target.value)}
                    placeholder="Seu nome completo"
                    required
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buyerPhone">Celular (DDD + número)</Label>
                  <Input
                    id="buyerPhone"
                    inputMode="tel"
                    autoComplete="tel"
                    value={buyerPhone}
                    onChange={(event) =>
                      setBuyerPhone(formatPhoneInput(event.target.value))
                    }
                    placeholder="(51) 99999-0000"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    2 dígitos de DDD + 9 dígitos do celular.
                  </p>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Enviando…" : "Confirmar pedido"}
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Legend({ children }: { children: ReactNode }) {
  return (
    <legend className="text-sm font-medium text-[var(--ocean-ink)]">
      {children}
    </legend>
  );
}

function ChoiceCard({
  selected,
  onClick,
  icon,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-lg border px-3 py-3 text-left transition ${
        selected
          ? "border-[var(--ocean)] bg-[var(--mist)]"
          : "border-[var(--line)] hover:border-[var(--ocean)]/50"
      }`}
    >
      <span className="mt-0.5">{icon}</span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}
