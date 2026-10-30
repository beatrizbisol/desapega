import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg tracking-tight text-white drop-shadow-sm sm:text-xl"
        >
          Beatriz &amp; Filipe
        </Link>
        <nav className="flex items-center gap-5 text-sm text-white/90">
          <a href="#itens" className="transition hover:text-white">
            Itens
          </a>
          <a href="#historia" className="hidden transition hover:text-white sm:inline">
            Nossa história
          </a>
        </nav>
      </div>
    </header>
  );
}
