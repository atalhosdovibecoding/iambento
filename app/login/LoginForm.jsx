"use client";

import { useState } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    const response = await fetch("/api/auth/send-access", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ email: email.trim().toLowerCase() })
    });

    setStatus(
      response.ok
        ? "Se esse email tiver acesso ativo, o link chega em instantes."
        : "Digite um email valido para receber o acesso."
    );
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md border border-bone/10 bg-bone/[0.035] p-5 shadow-premium">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Area de membros</p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-bone">Entrar</h1>
      <input
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email de acesso"
        className="mt-6 min-h-12 w-full border border-bone/10 bg-ink px-4 text-sm text-bone outline-none focus:border-gold/60"
        autoComplete="email"
      />
      <button
        disabled={loading}
        className="premium-button mt-4 min-h-12 w-full border border-gold/55 bg-gradient-to-r from-[#ff2a3d] to-[#9b0f1d] px-5 text-sm font-semibold uppercase tracking-[0.12em] text-bone disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? "Enviando..." : "Receber acesso"}
      </button>
      {status ? <p className="mt-4 text-sm text-smoke">{status}</p> : null}
    </form>
  );
}
