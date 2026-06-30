import { NextResponse } from "next/server";
import { sendAccessMagicLink } from "../../../../lib/accessEmail";
import { createAuthUserIfPossible } from "../../../../lib/memberAccess";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function genericResponse() {
  return NextResponse.json({
    ok: true,
    message: "Se esse email tiver acesso ativo, enviaremos o link em instantes."
  });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body?.email);

  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "email_invalid" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (customerError) {
    console.error("access_request_customer_error", customerError.message);
    return genericResponse();
  }

  if (!customer) {
    return genericResponse();
  }

  const now = new Date().toISOString();
  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("id")
    .eq("customer_id", customer.id)
    .eq("status", "active")
    .gt("expires_at", now)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    console.error("access_request_membership_error", membershipError.message);
    return genericResponse();
  }

  if (!membership) {
    return genericResponse();
  }

  await createAuthUserIfPossible(customer);
  const emailResult = await sendAccessMagicLink({ email: customer.email, name: customer.name });

  if (!emailResult.sent) {
    console.error("access_request_email_not_sent", {
      email,
      error: emailResult.error || "unknown_error"
    });
  }

  return genericResponse();
}
