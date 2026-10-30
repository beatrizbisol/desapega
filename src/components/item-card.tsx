import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatBRL, statusLabel } from "@/lib/format";
import type { Item } from "@/lib/types";

export function ItemCard({ item }: { item: Item }) {
  const soldOut = item.status !== "available";

  return (
    <article className="group">
      <Link href={`/item/${item.id}`} className="block outline-none">
        <div className="relative aspect-[4/5] overflow-hidden bg-[var(--mist)]">
          {item.photos[0] ? (
            <Image
              src={item.photos[0]}
              alt={item.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className={`object-cover transition duration-500 group-hover:scale-[1.03] ${
                soldOut ? "opacity-70 grayscale-[30%]" : ""
              }`}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[var(--ink-soft)]">
              Sem foto
            </div>
          )}
          {soldOut && (
            <Badge className="absolute left-3 top-3 bg-[var(--ocean-ink)] text-white">
              {statusLabel(item.status)}
            </Badge>
          )}
        </div>
        <div className="pt-4">
          <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--ocean-ink)] transition group-hover:text-[var(--ocean)]">
            {item.title}
          </h3>
          <p className="mt-1 text-base font-medium text-[var(--ink)]">
            {formatBRL(item.price)}
          </p>
        </div>
      </Link>
    </article>
  );
}
