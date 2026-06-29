import { createClient } from "@supabase/supabase-js";
import { getEnv } from "./env";

let adminClient;
let publicClient;

export function getSupabaseAdmin() {
  if (!adminClient) {
    adminClient = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_SECRET_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  return adminClient;
}

export function getSupabasePublicServer() {
  if (!publicClient) {
    publicClient = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  return publicClient;
}

export async function getUserFromBearer(request) {
  const authorization = request.headers.get("authorization") || "";
  const [, token] = authorization.match(/^Bearer\s+(.+)$/i) || [];

  if (!token) {
    return { user: null, error: "missing_token" };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return { user: null, error: "invalid_token" };
  }

  return { user: data.user, token };
}
