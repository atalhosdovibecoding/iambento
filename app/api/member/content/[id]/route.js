import { NextResponse } from "next/server";
import { getActiveMembershipForUser } from "../../../../../lib/memberAccess";
import { getSupabaseAdmin, getUserFromBearer } from "../../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
  "X-Robots-Tag": "noindex, nofollow, noarchive"
};

function privateJson(body, init = {}) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...privateHeaders,
      ...(init.headers || {})
    }
  });
}

export async function GET(request, context) {
  const { id } = await context.params;
  const { user, error: authError } = await getUserFromBearer(request);

  if (authError || !user) {
    return privateJson({ error: "unauthorized" }, { status: 401 });
  }

  const { membership } = await getActiveMembershipForUser(user);

  if (!membership) {
    return privateJson({ error: "inactive_membership" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const { data: content, error: contentError } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", id)
    .eq("active", true)
    .maybeSingle();

  if (contentError) {
    return privateJson({ error: "content_error" }, { status: 500 });
  }

  if (!content) {
    return privateJson({ error: "not_found" }, { status: 404 });
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(process.env.SUPABASE_MEMBER_BUCKET || "member-content")
    .createSignedUrl(content.storage_path, 180);

  if (signedError || !signed?.signedUrl) {
    return privateJson({ error: "signed_url_error" }, { status: 500 });
  }

  await supabase.from("access_logs").insert({
    user_id: user.id,
    membership_id: membership.id,
    content_item_id: content.id,
    ip_address: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    user_agent: request.headers.get("user-agent")
  });

  return privateJson({
    signedUrl: signed.signedUrl,
    expiresIn: 180
  });
}
