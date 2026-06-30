"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "../../../lib/supabaseBrowser";

export default function AccessAuthPage() {
  const [message, setMessage] = useState("Liberando seu acesso...");

  useEffect(() => {
    async function verifyAccess() {
      try {
        const url = new URL(window.location.href);
        const email = String(url.searchParams.get("email") || "").trim().toLowerCase();
        const token = String(url.searchParams.get("token") || "").trim();

        if (!email || !token) {
          setMessage("Link de acesso invalido.");
          return;
        }

        const supabase = getSupabaseBrowser();
        const { error } = await supabase.auth.verifyOtp({
          email,
          token,
          type: "magiclink"
        });

        if (error) {
          setMessage("Esse link expirou. Solicite um novo acesso.");
          return;
        }

        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setMessage("Sessao nao encontrada. Solicite um novo acesso.");
          return;
        }

        window.location.replace("/area");
      } catch {
        setMessage("Nao foi possivel liberar seu acesso agora. Tente novamente.");
      }
    }

    verifyAccess();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-5 text-bone">
      <p className="text-center text-sm text-smoke">{message}</p>
    </main>
  );
}
