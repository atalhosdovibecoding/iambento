import { NextResponse } from "next/server";
import { getActiveMembershipForUser } from "../../../../lib/memberAccess";
import { plans } from "../../../../lib/plans";
import { getSupabaseAdmin, getUserFromBearer } from "../../../../lib/supabaseAdmin";

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

export async function GET(request) {
  const { user, error: authError } = await getUserFromBearer(request);

  if (authError || !user) {
    return privateJson({ error: "unauthorized" }, { status: 401 });
  }

  const { membership, error } = await getActiveMembershipForUser(user);

  if (error) {
    return privateJson({ error: "membership_error" }, { status: 500 });
  }

  if (!membership) {
    return privateJson({ error: "inactive_membership" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const { data: content, error: contentError } = await supabase
    .from("content_items")
    .select("id,title,description,storage_path,thumbnail_path,content_type,sort_order,created_at")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (contentError) {
    return privateJson({ error: "content_error" }, { status: 500 });
  }

  const bucket = process.env.SUPABASE_MEMBER_BUCKET || "member-content";
  const contentWithThumbnails = await Promise.all(
    (content || []).map(async (item) => {
      const { storage_path, thumbnail_path, ...publicItem } = item;
      const thumbnailPath = thumbnail_path || null;

      if (!thumbnailPath) {
        return { ...publicItem, thumbnailUrl: null };
      }

      const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(thumbnailPath, 900);
      return {
        ...publicItem,
        thumbnailUrl: signed?.signedUrl || null
      };
    })
  );

  const plan = plans.find((item) => item.id === membership.plan_id);

  return privateJson({
    user: {
      id: user.id,
      email: user.email
    },
    membership: {
      planId: membership.plan_id,
      planName: plan?.name || membership.plan_id,
      expiresAt: membership.expires_at
    },
    content: contentWithThumbnails
  });
}
