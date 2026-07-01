"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "../../lib/supabaseBrowser";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function redirectActiveSession() {
      try {
        const supabase = getSupabaseBrowser();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        if (!token) return;

        const response = await fetch("/api/member/summary", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.ok && !cancelled) {
          window.location.replace("/area");
        }
      } finally {
        if (!cancelled) {
          setCheckingSession(false);
        }
      }
    }

    redirectActiveSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch("/api/auth/send-access", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
        signal: controller.signal
      });

      setStatus(
        response.ok
          ? "Se esse email tiver acesso ativo, o link chega em instantes."
          : "Digite um email valido para receber o acesso."
      );
    } catch {
      setStatus("Nao foi possivel enviar agora. Tente novamente em instantes.");
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md border border-bone/10 bg-bone/[0.035] p-5 shadow-premium">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Area de membros</p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-bone">Entrar</h1>
      {checkingSession ? (
        <p className="mt-4 text-sm text-smoke">Verificando sessao salva...</p>
      ) : null}
      <input
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email de acesso"
        className="mt-6 min-h-12 w-full border border-bone/10 bg-ink px-4 text-sm text-bone outline-none focus:border-gold/60"
        autoComplete="email"
      />
      <button
        disabled={loading || checkingSession}
        className="premium-button mt-4 min-h-12 w-full border border-gold/55 bg-gradient-to-r from-[#ff2a3d] to-[#9b0f1d] px-5 text-sm font-semibold uppercase tracking-[0.12em] text-bone disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? "Enviando..." : checkingSession ? "Verificando..." : "Receber acesso"}
      </button>
      {status ? <p className="mt-4 text-sm text-smoke">{status}</p> : null}
    </form>
  );
}
