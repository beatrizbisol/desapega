import { Hero } from "@/components/hero";
import { WHATSAPP_DISPLAY, whatsappLink } from "@/lib/whatsapp";
import { ItemGrid } from "@/components/item-grid";
import { SiteHeader } from "@/components/site-header";
import { Story } from "@/components/story";
import { UpdateBanner } from "@/components/update-banner";
import { listItems } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const items = await listItems({ hideSold: true });

  return (
    <main className="flex-1">
      <UpdateBanner />
      <div className="relative">
        <SiteHeader />
        <Hero />
      </div>
      <Story />
      <section id="itens" className="bg-[var(--foam)]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--ocean)]">
              Vitrine
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[var(--ocean-ink)] sm:text-4xl">
              Itens com história — e só uma unidade de cada
            </h2>
            <p className="mt-3 text-[var(--ink-soft)]">
              Clique na foto ou no título para ver detalhes, fotos e comprar.
            </p>
          </div>
          <ItemGrid items={items} />
        </div>
      </section>
      <footer className="border-t border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-[var(--ink-soft)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Beatriz &amp; Filipe · POA → Fortaleza</p>
          <p>Retirada em Boa Vista — Porto Alegre, Uber Flash ou Correios.</p>
          <a
            href={whatsappLink("Oi, Beatriz! Vi o desapega de vocês e queria falar sobre os itens.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center font-medium text-[#128c4a] hover:underline"
          >
            WhatsApp da Beatriz: {WHATSAPP_DISPLAY}
          </a>
        </div>
      </footer>
    </main>
  );
}
