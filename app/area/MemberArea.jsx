"use client";

import {
  CalendarClock,
  Eye,
  ExternalLink,
  Lock,
  LogOut,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "../../lib/supabaseBrowser";

function formatDate(value) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function daysUntil(value) {
  const end = new Date(value).getTime();
  const diff = end - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

function formatContentType(value) {
  const type = String(value || "item").toLowerCase();
  if (type === "image") return "Imagem";
  if (type === "video") return "Video";
  if (type === "pdf") return "Arquivo";
  return type;
}

function LoadingState() {
  return (
    <div className="grid gap-5">
      <div className="h-28 animate-pulse border border-bone/10 bg-bone/[0.035]" />
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 animate-pulse border border-bone/10 bg-bone/[0.035]" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="aspect-[4/5] animate-pulse border border-bone/10 bg-bone/[0.035]" />
        ))}
      </div>
    </div>
  );
}

export default function MemberArea() {
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [openingId, setOpeningId] = useState("");
  const [activeType, setActiveType] = useState("all");
  const [viewer, setViewer] = useState(null);
  const [viewerError, setViewerError] = useState("");
  const [screenShield, setScreenShield] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const supabase = getSupabaseBrowser();
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (!token) {
          window.location.replace("/login");
          return;
        }

        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 15000);
        let response;

        try {
          response = await fetch("/api/member/summary", {
            headers: {
              Authorization: `Bearer ${token}`
            },
            signal: controller.signal
          });
        } finally {
          window.clearTimeout(timeout);
        }

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          setState({ loading: false, error: "Acesso inativo ou expirado.", data: null });
          return;
        }

        setState({ loading: false, error: "", data });
      } catch {
        setState({
          loading: false,
          error: "Nao foi possivel carregar sua area agora. Recarregue a pagina e tente novamente.",
          data: null
        });
      }
    }

    load();
  }, []);

  useEffect(() => {
    let shieldTimer;

    function clearShieldSoon(delay = 260) {
      window.clearTimeout(shieldTimer);
      shieldTimer = window.setTimeout(() => setScreenShield(false), delay);
    }

    function showShield() {
      window.clearTimeout(shieldTimer);
      setScreenShield(true);
    }

    function showShieldBriefly() {
      showShield();
      clearShieldSoon(1800);
    }

    function handleKeyDown(event) {
      const key = String(event.key || "").toLowerCase();
      const protectedShortcut =
        event.key === "PrintScreen" ||
        ((event.ctrlKey || event.metaKey) && (key === "p" || key === "s"));

      if (protectedShortcut) {
        event.preventDefault();
        showShieldBriefly();
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        showShield();
        return;
      }

      clearShieldSoon();
    }

    function handleBlur() {
      if (viewer) {
        document.querySelectorAll("video").forEach((video) => video.pause());
        showShield();
      }
    }

    function handleFocus() {
      clearShieldSoon();
    }

    function handleContextMenu(event) {
      if (viewer) {
        event.preventDefault();
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyDown, true);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("beforeprint", showShield);
    window.addEventListener("afterprint", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.clearTimeout(shieldTimer);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyDown, true);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("beforeprint", showShield);
      window.removeEventListener("afterprint", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [viewer]);

  async function openContent(item) {
    setOpeningId(item.id);
    setViewerError("");

    try {
      const supabase = getSupabaseBrowser();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        window.location.replace("/login");
        return;
      }

      const response = await fetch(`/api/member/content/${item.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.signedUrl) {
        throw new Error(data?.error || "content_open_error");
      }

      setViewer({ ...item, signedUrl: data.signedUrl });
    } catch (error) {
      setViewerError("Nao consegui abrir esse item agora. Recarregue a pagina e tente de novo.");
    } finally {
      setOpeningId("");
    }
  }

  async function signOut() {
    await getSupabaseBrowser().auth.signOut();
    window.location.replace("/");
  }

  if (state.loading) {
    return <LoadingState />;
  }

  if (state.error) {
    return (
      <div className="mx-auto max-w-lg border border-bone/10 bg-bone/[0.035] p-6 shadow-premium">
        <div className="mb-5 flex h-12 w-12 items-center justify-center border border-gold/35 bg-gold/10">
          <Lock className="h-5 w-5 text-gold" aria-hidden="true" />
        </div>
        <h1 className="font-display text-3xl font-semibold text-bone">Acesso indisponivel</h1>
        <p className="mt-4 text-sm leading-6 text-smoke">{state.error}</p>
        <a
          href="/checkout"
          className="premium-button mt-6 inline-flex min-h-11 items-center border border-gold/55 bg-gradient-to-r from-[#ff2a3d] to-[#9b0f1d] px-4 text-sm font-semibold uppercase tracking-[0.12em] text-bone"
        >
          Liberar entrada
        </a>
      </div>
    );
  }

  const content = state.data.content || [];
  const featured = content[0];
  const expiresInDays = daysUntil(state.data.membership.expiresAt);
  const isLifetimeAccess = expiresInDays >= 3650;
  const validityProgress = isLifetimeAccess ? 100 : Math.max(8, Math.min(100, Math.round((expiresInDays / 30) * 100)));
  const filters = [
    { id: "all", label: "Todos" },
    ...Array.from(new Set(content.map((item) => item.content_type))).map((type) => ({
      id: type,
      label: formatContentType(type)
    }))
  ];
  const visibleContent = activeType === "all" ? content : content.filter((item) => item.content_type === activeType);

  return (
    <div className="w-full space-y-7">
      {screenShield ? (
        <div className="member-blackout" aria-live="polite" aria-label="Midia protegida" />
      ) : null}

      <header className="member-topbar flex flex-col gap-4 border-b border-bone/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 border border-gold/25 bg-gold/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Area ativa
          </div>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-bone sm:text-5xl">
            Bento Silva
          </h1>
          <p className="mt-2 max-w-full truncate text-sm leading-6 text-smoke">{state.data.user.email}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="inline-flex min-h-10 w-fit items-center gap-2 border border-bone/10 bg-bone/[0.035] px-4 text-sm font-semibold text-bone/76 transition hover:border-gold/50 hover:text-bone"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sair
        </button>
      </header>

      <section className="member-access-panel relative overflow-hidden border border-bone/10 p-5 shadow-premium sm:p-6 lg:p-7">
        <div className="member-panel-shine" aria-hidden="true" />
        <div className="relative grid gap-5 lg:grid-cols-[1fr_0.78fr] lg:items-stretch">
          <div>
            <div className="member-status-mark">
              <span className="live-dot" aria-hidden="true" />
              Online agora
            </div>
            <h2 className="mt-4 max-w-xl font-display text-3xl font-semibold leading-tight text-bone sm:text-4xl">
              Area liberada para assistir.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-smoke sm:text-base">
              Escolha um item na biblioteca abaixo. Cada abertura acontece dentro da area, com link temporario e sessao protegida.
            </p>
            <div className="member-status-list mt-5">
              <span>
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Sessao ativa
              </span>
              <span>
                <Eye className="h-4 w-4" aria-hidden="true" />
                Visualizacao interna
              </span>
              <span>
                <CalendarClock className="h-4 w-4" aria-hidden="true" />
                {isLifetimeAccess ? "Acesso vitalicio" : `Valido ate ${formatDate(state.data.membership.expiresAt)}`}
              </span>
            </div>
          </div>

          <div className="member-session-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-bone/55">Status</p>
                <p className="mt-2 text-2xl font-semibold text-bone">Liberado</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-gold/35 bg-gold/10 text-gold">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-bone/55">
                <span>{isLifetimeAccess ? "Acesso" : "Renovacao"}</span>
                <span className="text-gold">{isLifetimeAccess ? "Vitalicio" : formatDate(state.data.membership.expiresAt)}</span>
              </div>
              <div className="member-progress" aria-hidden="true">
                <span style={{ width: `${validityProgress}%` }} />
              </div>
              <p className="mt-2 flex items-center gap-2 text-xs text-smoke">
                <CalendarClock className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                {state.data.membership.planName}
              </p>
            </div>

            <p className="member-session-note mt-5">
              Midia protegida contra acesso publico. Use esta tela para abrir as fotos e videos.
            </p>
          </div>
        </div>
      </section>

      {viewerError ? (
        <div className="border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm text-bone">
          {viewerError}
        </div>
      ) : null}

      {featured ? (
        <section className="grid overflow-hidden border border-bone/10 bg-bone/[0.035] shadow-premium lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative min-h-[22rem] overflow-hidden">
            {featured.thumbnailUrl ? (
              <img
                src={featured.thumbnailUrl}
                alt={featured.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#2b0710] to-ink" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/34 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
              <div className="mb-4 inline-flex items-center gap-2 border border-gold/35 bg-ink/55 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-gold backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Destaque
              </div>
              <h2 className="font-display text-4xl font-semibold leading-tight text-bone sm:text-5xl">
                {featured.title}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-smoke">{featured.description}</p>
            </div>
          </div>
          <div className="flex flex-col justify-between p-5 sm:p-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Destaque reservado</p>
              <h3 className="mt-4 text-2xl font-semibold text-bone">Area liberada</h3>
              <p className="mt-4 text-sm leading-7 text-smoke">
                Sessao ativa para acessar os registros reservados do Bento Silva.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openContent(featured)}
              disabled={openingId === featured.id}
              className="premium-button mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 border border-gold/55 bg-gradient-to-r from-[#ff2a3d] to-[#9b0f1d] px-5 text-sm font-semibold uppercase tracking-[0.12em] text-bone"
            >
              {featured.content_type === "video" ? (
                <PlayCircle className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              )}
              {openingId === featured.id ? "Abrindo..." : "Abrir destaque"}
            </button>
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Biblioteca</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-bone">Biblioteca liberada</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveType(filter.id)}
                className={`min-h-10 border px-4 text-sm font-semibold transition ${
                  activeType === filter.id
                    ? "border-gold/60 bg-gold/10 text-bone"
                    : "border-bone/10 bg-bone/[0.035] text-bone/68 hover:border-gold/45 hover:text-bone"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleContent.map((item) => (
            <article
              key={item.id}
              role="button"
              tabIndex={0}
              aria-busy={openingId === item.id}
              onClick={() => {
                if (openingId !== item.id) openContent(item);
              }}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && openingId !== item.id) {
                  event.preventDefault();
                  openContent(item);
                }
              }}
              className="group cursor-pointer overflow-hidden border border-bone/10 bg-bone/[0.035] text-left shadow-premium transition hover:border-gold/45 focus:outline-none focus-visible:border-gold/60"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-coal">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="h-full w-full object-cover brightness-[0.86] transition duration-300 group-hover:scale-[1.035] group-hover:brightness-100"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-[#2b0710] to-ink" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/88 via-transparent to-transparent" />
                <div className="absolute left-4 top-4 border border-bone/15 bg-ink/62 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-bone/78 backdrop-blur">
                  {formatContentType(item.content_type)}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-xl font-semibold leading-tight text-bone">{item.title}</h3>
                  <p className="mt-2 min-h-12 text-sm leading-6 text-smoke">{item.description}</p>
                </div>
              </div>
              <div className="p-4">
                <div className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-bone/15 bg-ink/60 px-4 text-sm font-semibold text-bone transition group-hover:border-gold/60">
                  {item.content_type === "video" ? (
                    <PlayCircle className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                  {openingId === item.id ? "Abrindo..." : item.content_type === "video" ? "Assistir" : "Ver foto"}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {viewer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/92 p-4 backdrop-blur-md">
          <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden border border-bone/10 bg-[#070505] shadow-premium">
            <div className="flex items-center justify-between border-b border-bone/10 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
                  {formatContentType(viewer.content_type)}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-bone">{viewer.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewer(null)}
                className="flex h-10 w-10 items-center justify-center border border-bone/10 bg-bone/[0.035] text-bone/72 transition hover:border-gold/45 hover:text-bone"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex min-h-0 items-center justify-center bg-ink">
              {viewer.content_type === "video" ? (
                <div className="secure-media-frame w-full">
                  <video
                    src={viewer.signedUrl}
                    className="protected-media max-h-[76vh] w-full bg-black"
                    controls
                    controlsList="nodownload noplaybackrate noremoteplayback"
                    disablePictureInPicture
                    disableRemotePlayback
                    autoPlay
                    playsInline
                    onContextMenu={(event) => event.preventDefault()}
                  />
                  <div className="privacy-guard" aria-hidden="true" />
                </div>
              ) : (
                <div className="secure-media-frame w-full">
                  <img
                    src={viewer.signedUrl}
                    alt={viewer.title}
                    className="protected-media max-h-[76vh] w-full object-contain"
                    draggable={false}
                    onContextMenu={(event) => event.preventDefault()}
                  />
                  <div className="privacy-guard" aria-hidden="true" />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
