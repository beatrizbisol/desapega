import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-[var(--foam)] px-5 py-24 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--ocean-ink)]">
        Item não encontrado
      </h1>
      <p className="mt-3 max-w-md text-[var(--ink-soft)]">
        Esse anúncio pode ter sido removido ou o link está incompleto.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
      >
        Voltar para a vitrine
      </Link>
    </main>
  );
}
