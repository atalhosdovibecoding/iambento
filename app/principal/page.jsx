import {
  ArrowRight,
  Crown,
  Gem,
  KeyRound,
  Lock,
  Mail,
  QrCode,
  ShieldCheck,
  Sparkles,
  UserRoundCheck
} from "lucide-react";
import { plans as memberPlans } from "../../lib/plans";
import SensitiveImage from "./SensitiveImage";

const previews = [
  { id: "registro-reservado", title: "Registro reservado", mediaId: "impact", position: "50% 50%", featured: true },
  { id: "registro-limitado", title: "Registro limitado", mediaId: "gymWhiteShorts", position: "50% 92%", zoom: 1.32, origin: "50% 84%" },
  { id: "bastidor-reservado", title: "Bastidor reservado", mediaId: "gymMirrorGrey", position: "50% 34%" },
  { id: "registro-premium", title: "Registro premium", mediaId: "bathroomBlack", position: "50% 62%" },
  { id: "bastidor-discreto", title: "Bastidor discreto", mediaId: "bedClose", position: "52% 48%" },
  { id: "depois-do-treino", title: "Depois do treino", mediaId: "gymWhite", position: "50% 82%", zoom: 1.16, origin: "50% 80%" },
  { id: "espaco-reservado", title: "Espaco reservado", mediaId: "lockerBlack", position: "50% 34%" },
  { id: "bastidor-premium", title: "Bastidor premium", mediaId: "bathroomGreen", position: "50% 20%" }
];

const privacy = [
  { icon: KeyRound, title: "Acesso imediato" },
  { icon: ShieldCheck, title: "Compra discreta" },
  { icon: Lock, title: "Area reservada" },
  { icon: UserRoundCheck, title: "Entrada protegida" }
];

const proofs = [
  { icon: QrCode, title: "Pix seguro" },
  { icon: Mail, title: "Link no email" },
  { icon: Lock, title: "Sessao salva" },
  { icon: ShieldCheck, title: "Acesso reservado" }
];

function CTAButton({ children, variant = "gold", href = "#acesso" }) {
  const classes =
    variant === "outline"
      ? "border border-bone/20 bg-ink/35 text-bone hover:border-gold/60 hover:bg-bone/[0.07]"
      : "border border-gold/55 bg-gradient-to-r from-[#ff2a3d] to-[#9b0f1d] text-bone";

  return (
    <a
      href={href}
      className={`premium-button inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-sm px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] sm:w-auto ${classes}`}
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </a>
  );
}

export default function PrincipalPage() {
  const primaryPlan = memberPlans[0];

  return (
    <main className="bg-ink text-bone">
      <section className="reserved-hero relative isolate min-h-screen overflow-hidden">
        <div className="sales-hero-safe absolute inset-0" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/12 via-ink/44 to-ink" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/86 via-ink/46 to-ink/62" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_54%_18%,transparent_0,rgba(5,5,5,0.08)_22%,rgba(5,5,5,0.78)_82%)]" />

        <header className="absolute left-0 right-0 top-0 z-20 px-5 py-5 sm:px-8 lg:px-12">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <a href="/" className="text-sm font-semibold uppercase tracking-[0.3em] text-bone">
              Bento Silva
            </a>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-gold/35 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold backdrop-blur">
                Reservado
              </span>
              <a
                href="#acesso"
                className="rounded-full border border-bone/15 bg-ink/35 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-bone/76 backdrop-blur transition hover:border-gold/45 hover:text-gold"
              >
                Entrar
              </a>
            </div>
          </div>
        </header>

        <div className="relative z-10 flex min-h-screen items-end px-5 pb-8 pt-24 sm:px-8 lg:px-12 lg:pb-14">
          <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.84fr_1.16fr] lg:items-end">
            <div className="hero-fade max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/35 bg-ink/56 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold backdrop-blur">
                <span className="live-dot" />
                Entrada reservada
              </div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-bone/58">
                Experiencia privada
              </p>
              <h1 className="font-display text-5xl font-semibold leading-none text-bone sm:text-7xl lg:text-8xl">
                Bento Silva,
                <br />
                em bastidores reservados.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-smoke sm:text-xl">
                Um clima mais intenso, reservado e feito para quem gosta de sentir a presenca mais de perto.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <CTAButton>Liberar acesso</CTAButton>
                <CTAButton href="#registros" variant="outline">
                  Ver registros
                </CTAButton>
              </div>
            </div>

            <div className="reserved-strip grid grid-cols-3 gap-2 sm:gap-3">
              {previews.slice(1, 4).map((item, index) => (
                <div
                  key={item.title}
                  className="reserved-thumb group relative aspect-[3/4] overflow-hidden border border-bone/12 bg-ink/45"
                  style={{ animationDelay: `${index * 240}ms` }}
                >
                  <SensitiveImage
                    mediaId={item.mediaId}
                    alt={item.title}
                    title={item.title}
                    className="h-full w-full object-cover"
                    wrapperClassName="absolute inset-0"
                    compact
                    revealHref={`#${item.id}`}
                    style={{
                      objectPosition: item.position,
                      transform: item.zoom ? `scale(${item.zoom})` : undefined,
                      transformOrigin: item.origin ?? item.position
                    }}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/10 via-ink/20 to-ink/72" />
                  <Lock className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-gold" aria-hidden="true" />
                  <p className="pointer-events-none absolute bottom-3 left-3 right-3 text-sm font-semibold text-bone">
                    {item.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-bone/10 bg-coal px-5 py-5 sm:px-8 lg:px-14">
        <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-4">
          {privacy.map(({ icon: Icon, title }) => (
            <div key={title} className="flex items-center gap-3 text-sm font-medium text-bone/76">
              <Icon className="h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
              {title}
            </div>
          ))}
        </div>
      </section>

      <section id="registros" className="px-5 py-16 sm:px-8 lg:px-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold">
                Acesso limitado
              </p>
              <h2 className="font-display text-3xl font-semibold leading-tight text-bone sm:text-5xl">
                Registros selecionados
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-smoke">
              Toque para ver com mais nitidez. O carregamento inicial preserva as imagens e mantem a pagina segura.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {previews.map((item) => (
              <article
                id={item.id}
                tabIndex={0}
                key={item.title}
                className={`preview-tile reveal-card group relative scroll-mt-24 overflow-hidden border border-bone/10 bg-ink shadow-premium outline-none ${
                  item.featured ? "preview-tile-featured aspect-[16/10] sm:col-span-2 lg:col-span-2" : "aspect-[4/5]"
                }`}
              >
                <SensitiveImage
                  mediaId={item.mediaId}
                  alt={`Registro editorial: ${item.title}`}
                  title={item.title}
                  className="h-full w-full object-cover"
                  wrapperClassName="absolute inset-0"
                  compact={!item.featured}
                  style={{
                    objectPosition: item.position,
                    transform: item.zoom ? `scale(${item.zoom})` : undefined,
                    transformOrigin: item.origin ?? item.position
                  }}
                />
                <div className="pointer-events-none absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-bone/15 bg-ink/60 backdrop-blur">
                  <Lock className="h-4 w-4 text-gold" aria-hidden="true" />
                </div>
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-5">
                  <Sparkles className="mb-3 h-5 w-5 text-gold" aria-hidden="true" />
                  <h3 className={item.featured ? "text-2xl font-semibold text-bone sm:text-3xl" : "text-xl font-semibold text-bone"}>
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-bone/58">
                    {item.featured ? "O registro de maior impacto fica reservado para o acesso." : "Disponivel no acesso reservado."}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="acesso" className="px-5 py-16 sm:px-8 lg:px-14">
        <div className="mx-auto max-w-6xl">
          <div className="offer-panel offer-motion reveal-card overflow-hidden border border-bone/10 bg-bone/[0.035] shadow-premium">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
              <div className="p-6 sm:p-8 lg:p-10">
                <div className="offer-badge mb-7 inline-flex items-center gap-2 border border-gold/35 bg-gold/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-gold">
                  <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                  Acesso liberado
                </div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold">
                  Proximo passo
                </p>
                <h2 className="font-display text-4xl font-semibold leading-tight text-bone sm:text-6xl">
                  Libere sua entrada por R$30.
                </h2>
                <p className="mt-5 max-w-xl text-sm leading-7 text-smoke sm:text-base">
                  O Pix confirma a entrada, envia o link para o email da compra e mantem sua sessao salva para voltar sem atrito.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {proofs.map(({ icon: Icon, title }) => (
                    <div className="offer-proof" key={title}>
                      <Icon className="h-4 w-4 text-gold" aria-hidden="true" />
                      <span>{title}</span>
                    </div>
                  ))}
                </div>

                <div className="offer-flow mt-8 grid gap-2 sm:grid-cols-3">
                  <span>01 Entrada</span>
                  <span>02 Pix seguro</span>
                  <span>03 Link no email</span>
                </div>
              </div>

              <aside className="offer-checkout flex flex-col justify-between border-t border-bone/10 p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
                <div>
                  <p className="offer-live text-xs font-semibold uppercase tracking-[0.18em] text-bone/55">
                    Oferta ativa
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold text-bone">{primaryPlan.name}</h3>
                  <p className="offer-price mt-6 font-display text-6xl font-semibold leading-none text-bone">
                    {primaryPlan.priceLabel}
                  </p>
                  <p className="mt-3 text-sm text-smoke">
                    A parte reservada fica depois da confirmacao.
                  </p>
                </div>
                <div className="mt-8 space-y-4">
                  <a
                    href="/checkout"
                    className="offer-cta premium-button inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-sm border border-gold/55 bg-gradient-to-r from-[#ff2a3d] to-[#9b0f1d] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-bone"
                  >
                    Continuar por R$30
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                  <p className="text-xs leading-5 text-bone/48">
                    Use um email valido. O acesso chega nele apos a confirmacao do pagamento.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <section className="closing-cta relative isolate overflow-hidden border-y border-bone/10 px-5 py-24 sm:px-8 lg:px-14">
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-gold/35 bg-gold/10">
            <Gem className="h-6 w-6 text-gold" aria-hidden="true" />
          </div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-gold">
            Reservado
          </p>
          <h2 className="font-display text-4xl font-semibold leading-tight text-bone sm:text-6xl">
            Quer continuar?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-smoke sm:text-lg">
            Plano unico de R$30 para acessar a area reservada do Bento Silva.
          </p>
          <div className="mt-8">
            <CTAButton>Entrar agora</CTAButton>
            <p className="mt-4 text-xs uppercase tracking-[0.16em] text-bone/55">
              Acesso permitido apenas para maiores de idade.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-bone/10 px-5 py-8 sm:px-8 lg:px-14">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 text-sm text-bone/60 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold uppercase tracking-[0.22em] text-bone">Bento Silva</p>
            <p className="mt-2">Aviso: acesso permitido apenas para maiores de idade.</p>
          </div>
          <nav className="flex flex-wrap gap-5">
            <a href="#" className="hover:text-gold">
              Termos
            </a>
            <a href="#" className="hover:text-gold">
              Privacidade
            </a>
            <a href="#" className="hover:text-gold">
              Suporte
            </a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
