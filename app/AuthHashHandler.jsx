"use client";

import { useEffect } from "react";
import { getSupabaseBrowser } from "../lib/supabaseBrowser";

function getHashParams() {
  if (typeof window === "undefined" || !window.location.hash) {
    return null;
  }

  if (window.location.pathname === "/auth/callback") {
    return null;
  }

  const params = new URLSearchParams(window.location.hash.slice(1));

  if (!params.get("access_token") && !params.get("error")) {
    return null;
  }

  return params;
}

function clearHash() {
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
}

export default function AuthHashHandler() {
  useEffect(() => {
    let cancelled = false;

    async function finishHashLogin() {
      const params = getHashParams();

      if (!params) return;

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (params.get("error") || !accessToken || !refreshToken) {
        clearHash();
        if (!cancelled) {
          window.location.replace("/login?auth=error");
        }
        return;
      }

      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      clearHash();

      if (cancelled) return;

      if (error) {
        window.location.replace("/login?auth=error");
        return;
      }

      window.location.replace("/area");
    }

    finishHashLogin();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
