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
  const thumbnailPaths = [...new Set((content || []).map((item) => item.thumbnail_path).filter(Boolean))];
  const imagePaths = [
    ...new Set(
      (content || [])
        .filter((item) => item.content_type === "image")
        .map((item) => item.storage_path)
        .filter(Boolean)
    )
  ];
  const signedThumbnailUrls = new Map();
  const signedImageUrls = new Map();

  const [thumbnailResult, imageResult] = await Promise.all([
    thumbnailPaths.length
      ? supabase.storage.from(bucket).createSignedUrls(thumbnailPaths, 3600)
      : Promise.resolve({ data: [] }),
    imagePaths.length
      ? supabase.storage.from(bucket).createSignedUrls(imagePaths, 300)
      : Promise.resolve({ data: [] })
  ]);

  for (const signedThumbnail of thumbnailResult.data || []) {
    if (signedThumbnail.path && signedThumbnail.signedUrl) {
      signedThumbnailUrls.set(signedThumbnail.path, signedThumbnail.signedUrl);
    }
  }

  for (const signedImage of imageResult.data || []) {
    if (signedImage.path && signedImage.signedUrl) {
      signedImageUrls.set(signedImage.path, signedImage.signedUrl);
    }
  }

  const imageUrlExpiresAt = Date.now() + 4.5 * 60 * 1000;
  const contentWithThumbnails = (content || []).map((item) => {
    const { storage_path, thumbnail_path, ...publicItem } = item;
    return {
      ...publicItem,
      thumbnailUrl: thumbnail_path ? signedThumbnailUrls.get(thumbnail_path) || null : null,
      contentUrl: item.content_type === "image" ? signedImageUrls.get(storage_path) || null : null,
      contentUrlExpiresAt: item.content_type === "image" ? imageUrlExpiresAt : null
    };
  });

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
