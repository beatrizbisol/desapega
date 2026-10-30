"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, QrCode } from "lucide-react";
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
import { formatBRL } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

type Step = "details" | "payment" | "done";

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
  const [step, setStep] = useState<Step>("details");
  const [buyerName, setBuyerName] = useState("");
  const [buyerContact, setBuyerContact] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setStep("details");
    setBuyerName("");
    setBuyerContact("");
    setPaymentMethod(null);
    setError(null);
    setLoading(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  async function submitOrder() {
    if (!paymentMethod) {
      setError("Escolha Pix ou cartão.");
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
          buyerContact,
          paymentMethod,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Não foi possível reservar.");
      }
      setStep("done");
      router.refresh();
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
        <DialogContent className="sm:max-w-md">
          {step === "details" && (
            <>
              <DialogHeader>
                <DialogTitle>Reservar {title}</DialogTitle>
                <DialogDescription>
                  Estoque de 1 unidade. Conta pra gente quem é você e como te
                  encontramos — {formatBRL(price)}.
                </DialogDescription>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!buyerName.trim() || !buyerContact.trim()) {
                    setError("Preencha nome e contato.");
                    return;
                  }
                  setError(null);
                  setStep("payment");
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="buyerName">Seu nome</Label>
                  <Input
                    id="buyerName"
                    value={buyerName}
                    onChange={(event) => setBuyerName(event.target.value)}
                    placeholder="Como te chamamos"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buyerContact">WhatsApp ou e-mail</Label>
                  <Input
                    id="buyerContact"
                    value={buyerContact}
                    onChange={(event) => setBuyerContact(event.target.value)}
                    placeholder="Pra combinarmos a retirada"
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full">
                  Continuar para o pagamento
                </Button>
              </form>
            </>
          )}

          {step === "payment" && (
            <>
              <DialogHeader>
                <DialogTitle>Como prefere pagar?</DialogTitle>
                <DialogDescription>
                  O front já está pronto. A integração de pagamento (Pix/cartão)
                  entra depois — por enquanto isso reserva o item pra você.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("pix")}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${
                    paymentMethod === "pix"
                      ? "border-[var(--ocean)] bg-[var(--mist)]"
                      : "border-[var(--line)] hover:border-[var(--ocean)]/50"
                  }`}
                >
                  <QrCode className="size-5 text-[var(--ocean)]" />
                  <span>
                    <span className="block font-medium">Pix</span>
                    <span className="text-sm text-muted-foreground">
                      Pagamento instantâneo
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${
                    paymentMethod === "card"
                      ? "border-[var(--ocean)] bg-[var(--mist)]"
                      : "border-[var(--line)] hover:border-[var(--ocean)]/50"
                  }`}
                >
                  <CreditCard className="size-5 text-[var(--ocean)]" />
                  <span>
                    <span className="block font-medium">Cartão</span>
                    <span className="text-sm text-muted-foreground">
                      Crédito ou débito
                    </span>
                  </span>
                </button>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("details")}
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={loading}
                  onClick={submitOrder}
                >
                  {loading ? "Reservando…" : "Confirmar reserva"}
                </Button>
              </div>
            </>
          )}

          {step === "done" && (
            <>
              <DialogHeader>
                <DialogTitle>Item reservado pra você</DialogTitle>
                <DialogDescription>
                  Recebemos seu interesse em <strong>{title}</strong> via{" "}
                  {paymentMethod === "pix" ? "Pix" : "cartão"}. Em breve te
                  chamamos no contato informado para combinar a retirada e
                  finalizar o pagamento.
                </DialogDescription>
              </DialogHeader>
              <Button
                type="button"
                className="w-full"
                onClick={() => handleOpenChange(false)}
              >
                Fechar
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
