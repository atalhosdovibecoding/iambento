"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "../../../lib/supabaseBrowser";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Validando acesso...");

  useEffect(() => {
    async function finishLogin() {
      try {
        const supabase = getSupabaseBrowser();
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (hashParams.get("error")) {
          setMessage("Link invalido ou expirado. Solicite um novo acesso.");
          return;
        }

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            setMessage("Nao foi possivel validar o acesso.");
            return;
          }

          window.history.replaceState(null, "", "/auth/callback");
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setMessage("Nao foi possivel validar o acesso.");
            return;
          }
        }

        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setMessage("Sessao nao encontrada. Solicite um novo acesso.");
          return;
        }

        window.location.replace("/area");
      } catch {
        setMessage("Nao foi possivel validar o acesso agora. Tente novamente.");
      }
    }

    finishLogin();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-5 text-bone">
      <p className="text-sm text-smoke">{message}</p>
    </main>
  );
}
