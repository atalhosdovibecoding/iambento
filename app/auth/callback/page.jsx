"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "../../../lib/supabaseBrowser";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Validando acesso...");

  useEffect(() => {
    async function finishLogin() {
      const supabase = getSupabaseBrowser();
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage("Nao foi possivel validar o acesso.");
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setMessage("Sessao nao encontrada.");
        return;
      }

      window.location.replace("/area");
    }

    finishLogin();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-5 text-bone">
      <p className="text-sm text-smoke">{message}</p>
    </main>
  );
}
