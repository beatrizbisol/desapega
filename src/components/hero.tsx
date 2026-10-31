export function Hero() {
  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden text-white">
      <div className="hero-sky absolute inset-0" aria-hidden />
      <div className="hero-glow absolute inset-0" aria-hidden />
      <div className="hero-waves absolute inset-x-[-3%] bottom-0 h-[42%]" aria-hidden />

      <div className="relative mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-end px-5 pb-16 pt-28 sm:px-8 sm:pb-20">
        <p className="hero-fade font-[family-name:var(--font-display)] text-4xl leading-none tracking-tight sm:text-6xl md:text-7xl">
          Beatriz &amp; Filipe
        </p>
        <h1 className="hero-fade-delay mt-5 max-w-2xl text-2xl font-medium leading-snug sm:text-3xl md:text-4xl">
          Estamos voltando pra Fortaleza — e liberando o que não cabe na mudança.
        </h1>
        <p className="hero-fade-delay-2 mt-4 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
          Itens únicos, cada um com uma unidade só. Quem chegar primeiro, leva.
        </p>
        <div className="hero-fade-delay-3 mt-8">
          <a
            href="#itens"
            className="inline-flex items-center rounded-md bg-white px-5 py-3 text-sm font-semibold text-[var(--ocean-ink)] transition hover:bg-[var(--sun-soft)]"
          >
            Ver o que estamos vendendo
          </a>
        </div>
      </div>
    </section>
  );
}
