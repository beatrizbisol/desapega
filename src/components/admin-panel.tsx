"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deliveryLabel,
  formatBRL,
  formatDateTime,
  orderStatusLabel,
  paymentLabel,
  statusLabel,
} from "@/lib/format";
import { formatPhoneInput } from "@/lib/phone";
import type { Item, ItemStatus, Order } from "@/lib/types";

const SECRET_KEY = "bf-admin-secret";

export function AdminPanel() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-admin-secret": secret,
    }),
    [secret],
  );

  useEffect(() => {
    const stored = window.localStorage.getItem(SECRET_KEY);
    if (stored) setSecret(stored);
  }, []);

  async function loadData(activeSecret = secret) {
    const authHeaders = { "x-admin-secret": activeSecret };
    const [itemsRes, ordersRes] = await Promise.all([
      fetch("/api/items"),
      fetch("/api/orders", { headers: authHeaders }),
    ]);
    if (!ordersRes.ok) {
      throw new Error("Senha incorreta.");
    }
    setItems(await itemsRes.json());
    setOrders(await ordersRes.json());
  }

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await loadData(secret);
      window.localStorage.setItem(SECRET_KEY, secret);
      setUnlocked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao entrar.");
      setUnlocked(false);
    }
  }

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: { "x-admin-secret": secret },
          body,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Falha no upload.");
        uploaded.push(data.url);
      }
      setPhotos((current) => [...current, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no upload.");
    } finally {
      setUploading(false);
    }
  }

  async function createItem(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/items", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title,
          description,
          price: Number(price.replace(",", ".")),
          photos,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar.");
      setTitle("");
      setDescription("");
      setPrice("");
      setPhotos([]);
      setMessage("Item cadastrado.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: ItemStatus) {
    setError(null);
    const response = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error || "Não foi possível atualizar.");
      return;
    }
    await loadData();
  }

  async function removeItem(id: string) {
    if (!window.confirm("Excluir este item?")) return;
    const response = await fetch(`/api/items/${id}`, {
      method: "DELETE",
      headers: { "x-admin-secret": secret },
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error || "Não foi possível excluir.");
      return;
    }
    await loadData();
  }

  async function updateOrder(id: string, status: Order["status"]) {
    setError(null);
    const response = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error || "Não foi possível atualizar o pedido.");
      return;
    }
    await loadData();
  }

  if (!unlocked) {
    return (
      <form
        onSubmit={unlock}
        className="mx-auto max-w-md space-y-4 rounded-xl border border-[var(--line)] bg-white p-6"
      >
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ocean-ink)]">
            Cadastro de itens
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Área privada. Informe a senha de acesso.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="secret">Senha</Label>
          <Input
            id="secret"
            type="password"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full">
          Entrar
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-12">
      <form
        onSubmit={createItem}
        className="space-y-5 rounded-xl border border-[var(--line)] bg-white p-6"
      >
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ocean-ink)]">
            Novo item
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Cada anúncio vale para 1 unidade. Fotos, título, descrição e valor.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Sofá cinza de 3 lugares"
              required
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Estado de conservação, medidas, onde buscar…"
              rows={5}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Valor (R$)</Label>
            <Input
              id="price"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="450"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="photos">Fotos</Label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--line)] px-4 py-3 text-sm text-[var(--ink-soft)] transition hover:border-[var(--ocean)] hover:text-[var(--ocean)]">
              <Upload className="size-4" />
              {uploading ? "Enviando…" : "Selecionar fotos"}
              <input
                id="photos"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={(event) => onUpload(event.target.files)}
              />
            </label>
          </div>
        </div>
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {photos.map((photo) => (
              <div key={photo} className="relative h-24 w-20 overflow-hidden rounded-md">
                <Image src={photo} alt="" fill className="object-cover" sizes="80px" />
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white"
                  onClick={() =>
                    setPhotos((current) => current.filter((url) => url !== photo))
                  }
                  aria-label="Remover foto"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-[var(--ocean)]">{message}</p>}
        <Button type="submit" disabled={saving || uploading}>
          {saving ? "Salvando…" : "Publicar item"}
        </Button>
      </form>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ocean-ink)]">
          Itens publicados
        </h2>
        {items.length === 0 ? (
          <p className="text-[var(--ink-soft)]">Nenhum item ainda.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 rounded-xl border border-[var(--line)] bg-white p-4 sm:flex-row sm:items-center"
              >
                <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-[var(--mist)]">
                  {item.photos[0] && (
                    <Image
                      src={item.photos[0]}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-[var(--ocean-ink)]">{item.title}</p>
                    <Badge variant="secondary">{statusLabel(item.status)}</Badge>
                  </div>
                  <p className="text-sm text-[var(--ink-soft)]">{formatBRL(item.price)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={item.status}
                    onValueChange={(value) =>
                      updateStatus(item.id, value as ItemStatus)
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Disponível</SelectItem>
                      <SelectItem value="reserved">Reservado</SelectItem>
                      <SelectItem value="sold">Vendido</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    aria-label="Excluir"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ocean-ink)]">
          Pedidos / reservas
        </h2>
        <p className="text-sm text-[var(--ink-soft)]">
          Aqui entram os dados do formulário de compra: nome, celular, pagamento
          e entrega.
        </p>
        {orders.length === 0 ? (
          <p className="text-[var(--ink-soft)]">Nenhuma reserva ainda.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-[var(--ocean-ink)]">
                    {order.itemTitle}
                  </p>
                  <Badge variant="secondary">
                    {orderStatusLabel(order.status)}
                  </Badge>
                </div>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-[var(--ink-soft)]">Nome</dt>
                    <dd className="font-medium text-[var(--ocean-ink)]">
                      {order.buyerName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--ink-soft)]">Celular</dt>
                    <dd className="font-medium text-[var(--ocean-ink)]">
                      <a
                        className="underline-offset-2 hover:underline"
                        href={`https://wa.me/55${order.buyerPhone}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {formatPhoneInput(order.buyerPhone)}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--ink-soft)]">Pagamento</dt>
                    <dd className="font-medium text-[var(--ocean-ink)]">
                      {paymentLabel(order.paymentMethod)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--ink-soft)]">Entrega</dt>
                    <dd className="font-medium text-[var(--ocean-ink)]">
                      {deliveryLabel(order.deliveryMethod)}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[var(--ink-soft)]">Pedido em</dt>
                    <dd className="font-medium text-[var(--ocean-ink)]">
                      {formatDateTime(order.createdAt)}
                    </dd>
                  </div>
                </dl>
                {order.status === "pending" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => updateOrder(order.id, "confirmed")}
                    >
                      Marcar como pago / vendido
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => updateOrder(order.id, "cancelled")}
                    >
                      Cancelar e liberar item
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
