import { ArrowRight } from "lucide-react";

export default function PreSellPage() {
  return (
    <main className="presell-stage min-h-screen bg-ink text-bone">
      <section className="presell-hero-red relative isolate min-h-screen overflow-hidden px-5 py-6 sm:px-8 lg:px-12">
        <div className="presell-red-bg absolute inset-0" aria-hidden="true" />
        <div className="presell-red-depth absolute inset-0" aria-hidden="true" />
        <div className="presell-red-grid absolute inset-0" aria-hidden="true" />
        <div className="presell-red-scan absolute inset-0" aria-hidden="true" />
        <div className="presell-red-line presell-red-line-top" aria-hidden="true" />
        <div className="presell-red-line presell-red-line-bottom" aria-hidden="true" />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col items-center justify-center text-center">
          <div className="presell-brand-lockup mb-8">
            <img
              src="/brand/bento-silva-logo-mark.svg"
              alt="Bento Silva"
              className="presell-brand-mark"
            />
            <div className="presell-brand-ring" aria-hidden="true" />
          </div>

          <div className="presell-red-copy">
            <p className="presell-red-kicker">Entrada reservada</p>

            <h1 className="presell-red-title font-display text-5xl font-semibold leading-none text-bone sm:text-7xl">
              Bento Silva
            </h1>

            <p className="presell-red-subtitle mt-5 text-xl leading-8 text-bone/78 sm:text-2xl">
              Uma experiencia inesquecivel para quem gosta de um clima quente.
            </p>

            <a
              href="/principal"
              className="presell-red-cta premium-button mt-9 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-sm border border-[#ff5362]/60 bg-[#ff2638] px-7 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white sm:w-auto"
            >
              <span>Continuar</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>

            <p className="presell-red-note mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-bone/42">
              Experiencia discreta
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
