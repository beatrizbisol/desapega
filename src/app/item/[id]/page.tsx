import Link from "next/link";
import { WhatsAppButton } from "@/components/whatsapp-button";
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
  // why: sold items are off the storefront but keep their page, so links
  // shared on WhatsApp land on a clear "vendido" notice instead of a 404.
  if (!item) notFound();

  const available = item.status === "available";
  const sold = item.status === "sold";

  return (
    <main className="flex-1 bg-[var(--foam)]">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <Link
          href="/#itens"
          className="-my-3 inline-flex min-h-11 items-center text-sm font-medium text-[var(--ocean)] transition hover:text-[var(--ocean-ink)]"
        >
          ← Voltar aos itens
        </Link>

        {sold && (
          <div
            role="status"
            className="mt-6 rounded-lg border border-[var(--ocean-ink)] bg-[var(--ocean-ink)] px-5 py-4 text-white"
          >
            <p className="font-[family-name:var(--font-display)] text-2xl">
              Este item já foi vendido
            </p>
            <p className="mt-1 text-sm text-white/80">
              Ele não está mais disponível. Veja os outros itens da vitrine ou
              fala com a gente pelo WhatsApp.
            </p>
          </div>
        )}

        <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div className={sold ? "opacity-70 grayscale" : undefined}>
            <PhotoCarousel photos={item.photos} title={item.title} />
          </div>

          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant={available ? "default" : "secondary"}
                className={sold ? "bg-[var(--ocean-ink)] text-white uppercase tracking-wide" : undefined}
              >
                {statusLabel(item.status)}
              </Badge>
              <span className="text-sm text-[var(--ink-soft)]">1 unidade</span>
            </div>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--ocean-ink)] sm:text-5xl">
              {item.title}
            </h1>
            <p
              className={`mt-4 text-2xl font-semibold ${
                sold ? "text-[var(--ink-soft)] line-through" : "text-[var(--ink)]"
              }`}
            >
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
              ) : sold ? (
                <Link
                  href="/#itens"
                  className="inline-flex min-h-11 items-center rounded-lg bg-[var(--mist)] px-4 py-3 text-sm font-medium text-[var(--ocean-ink)] transition hover:bg-[var(--line)]"
                >
                  Ver outros itens disponíveis →
                </Link>
              ) : (
                <p className="rounded-lg bg-[var(--mist)] px-4 py-3 text-sm text-[var(--ocean-ink)]">
                  Este item já está {statusLabel(item.status).toLowerCase()}. Se
                  quiser, fala com a gente — às vezes surge outra opção.
                </p>
              )}
              <div className="mt-4">
                <WhatsAppButton
                  label="Falar com a Beatriz no WhatsApp"
                  message={`Oi, Beatriz! Vi o anúncio "${item.title}" no desapega e queria saber mais.`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
