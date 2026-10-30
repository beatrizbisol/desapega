export function Story() {
  return (
    <section
      id="historia"
      className="relative overflow-hidden border-b border-[var(--line)] bg-[var(--foam)]"
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--ocean)]">
            Porto Alegre → Fortaleza
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--ocean-ink)] sm:text-4xl">
            De volta pra terrinha — e perto de quem nos apoia.
          </h2>
        </div>
        <div className="space-y-4 text-base leading-relaxed text-[var(--ink-soft)] sm:text-lg">
          <p>
            Eu sou cearense, e o Filipe morou vários anos em Fortaleza — foi lá
            que nos conhecemos. Agora que os dois trabalham remoto, queremos
            voltar para ficar mais perto da nossa rede de apoio.
          </p>
          <p>
            Como temos família aqui, vamos sempre voltar ao Rio Grande do Sul e
            manter o contato com os amigos que nos acolheram tão bem. Este site
            é um jeito carinhoso de deixar alguns móveis e itens com gente
            querida, em vez de guardar tudo numa mudança longa.
          </p>
        </div>
      </div>
    </section>
  );
}
