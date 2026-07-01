import { ArrowRight, Lock } from "lucide-react";

export default function PreSellPage() {
  return (
    <main className="presell-stage min-h-screen bg-ink text-bone">
      <section className="presell-hero relative isolate min-h-screen overflow-hidden px-5 py-5 sm:px-8 lg:px-12">
        <img
          src="/images/presell/presell-bg.jpg"
          alt="Bento Silva em previa reservada"
          className="presell-bg absolute inset-0 h-full w-full object-cover"
        />
        <div className="presell-blackout absolute inset-0" />
        <div className="presell-wine absolute inset-0" />

        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between">
          <a href="/" className="text-sm font-semibold uppercase tracking-[0.3em] text-bone">
            Bento Silva
          </a>
          <span className="rounded-full border border-bone/15 bg-ink/45 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-bone/70 backdrop-blur">
            +18
          </span>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-end pb-12 pt-16 sm:pb-16 lg:items-center lg:pb-0">
          <div className="presell-copy max-w-xl">
            <div className="presell-lock mb-5 inline-flex items-center gap-2 border border-bone/15 bg-ink/50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-bone/78 backdrop-blur">
              <Lock className="h-3.5 w-3.5 text-[#ff2a3d]" aria-hidden="true" />
              Área reservada
            </div>

            <h1 className="presell-headline font-display text-5xl font-semibold leading-none text-bone sm:text-7xl lg:text-8xl">
              Isso aqui
              <br />
              não é tudo.
            </h1>

            <p className="presell-subhead mt-5 max-w-md text-xl leading-8 text-bone/78 sm:text-2xl sm:leading-9">
              A melhor parte começa agora...
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <a
                href="/principal"
                className="presell-cta premium-button inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-sm border border-[#ff6a75]/60 bg-[#ff2a3d] px-6 py-4 text-sm font-bold uppercase tracking-[0.14em] text-white sm:w-auto"
              >
                Desbloquear acesso
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            <div className="presell-preview mt-7 inline-flex items-center gap-3 border border-bone/10 bg-ink/42 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-bone/58 backdrop-blur">
              <span className="h-px w-10 bg-bone/20" />
              prévia quase liberada
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
