import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyDialog } from "@/components/buy-dialog";
import { PhotoCarousel } from "@/components/photo-carousel";
import { Badge } from "@/components/ui/badge";
import { formatBRL, statusLabel } from "@/lib/format";
import { getItem } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ItemPage({ params }: Props) {
  const { id } = await params;
  const item = await getItem(id);
  if (!item) notFound();

  const available = item.status === "available";

  return (
    <main className="flex-1 bg-[var(--foam)]">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <Link
          href="/#itens"
          className="-my-3 inline-flex min-h-11 items-center text-sm font-medium text-[var(--ocean)] transition hover:text-[var(--ocean-ink)]"
        >
          ← Voltar aos itens
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
          <PhotoCarousel photos={item.photos} title={item.title} />

          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={available ? "default" : "secondary"}>
                {statusLabel(item.status)}
              </Badge>
              <span className="text-sm text-[var(--ink-soft)]">1 unidade</span>
            </div>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--ocean-ink)] sm:text-5xl">
              {item.title}
            </h1>
            <p className="mt-4 text-2xl font-semibold text-[var(--ink)]">
              {formatBRL(item.price)}
            </p>
            <div className="mt-6 whitespace-pre-wrap text-base leading-relaxed text-[var(--ink-soft)]">
              {item.description}
            </div>
            <div className="mt-8 border-t border-[var(--line)] pt-8">
              {available ? (
                <BuyDialog
                  itemId={item.id}
                  title={item.title}
                  price={item.price}
                />
              ) : (
                <p className="rounded-lg bg-[var(--mist)] px-4 py-3 text-sm text-[var(--ocean-ink)]">
                  Este item já está {statusLabel(item.status).toLowerCase()}. Se
                  quiser, fala com a gente — às vezes surge outra opção.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
