import { ItemCard } from "@/components/item-card";
import type { Item } from "@/lib/types";

export function ItemGrid({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--line)] bg-white/60 px-6 py-16 text-center">
        <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--ocean-ink)]">
          Ainda estamos preparando a vitrine
        </p>
        <p className="mx-auto mt-3 max-w-md text-[var(--ink-soft)]">
          Em breve os primeiros itens aparecem aqui. Se você já conversou
          conosco, pode pedir o link do cadastro.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
