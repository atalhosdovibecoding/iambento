import crypto from "crypto";
import { getOptionalEnv } from "./env";
import { getSupabaseAdmin } from "./supabaseAdmin";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function ttlMinutes() {
  const value = Number(getOptionalEnv("ACCESS_LINK_TTL_MINUTES") || 20);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 120) : 20;
}

function hashState(state) {
  return crypto.createHash("sha256").update(String(state || ""), "utf8").digest("hex");
}

function nowIso() {
  return new Date().toISOString();
}

function expiresAtIso() {
  return new Date(Date.now() + ttlMinutes() * 60 * 1000).toISOString();
}

export async function createAccessLinkClaim(email) {
  const normalizedEmail = normalizeEmail(email);
  const state = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashState(state);
  const supabase = getSupabaseAdmin();
  const now = nowIso();

  await supabase
    .from("access_login_links")
    .update({ revoked_at: now })
    .eq("email", normalizedEmail)
    .is("used_at", null)
    .is("revoked_at", null);

  const expiresAt = expiresAtIso();
  const { error } = await supabase.from("access_login_links").insert({
    email: normalizedEmail,
    token_hash: tokenHash,
    expires_at: expiresAt
  });

  if (error) throw error;

  return { state, expiresAt };
}

export async function claimAccessLink({ state, email, ipAddress, userAgent } = {}) {
  const cleanState = String(state || "").trim();
  const normalizedEmail = normalizeEmail(email);

  if (!cleanState || cleanState.length < 32) {
    return { ok: false, error: "missing_state" };
  }

  const supabase = getSupabaseAdmin();
  const tokenHash = hashState(cleanState);
  const now = nowIso();
  let query = supabase
    .from("access_login_links")
    .select("id,email,expires_at,used_at,revoked_at")
    .eq("token_hash", tokenHash);

  if (normalizedEmail) {
    query = query.eq("email", normalizedEmail);
  }

  const { data: link, error: findError } = await query.maybeSingle();

  if (findError) {
    return { ok: false, error: "claim_lookup_error" };
  }

  if (!link || link.used_at || link.revoked_at || new Date(link.expires_at).getTime() <= Date.now()) {
    return { ok: false, error: "invalid_or_expired_link" };
  }

  const { data: claimed, error: claimError } = await supabase
    .from("access_login_links")
    .update({
      used_at: now,
      used_ip_address: ipAddress || null,
      used_user_agent: userAgent || null
    })
    .eq("id", link.id)
    .is("used_at", null)
    .is("revoked_at", null)
    .gt("expires_at", now)
    .select("id,email")
    .maybeSingle();

  if (claimError || !claimed) {
    return { ok: false, error: "already_claimed" };
  }

  return { ok: true, email: claimed.email };
}
