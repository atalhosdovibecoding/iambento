"use client";

import { createClient } from "@supabase/supabase-js";

let browserClient;

export function getSupabaseBrowser() {
  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: false,
          persistSession: true
        }
      }
    );
  }

  return browserClient;
}
