import { NextResponse } from "next/server";
import { claimAccessLink } from "../../../../lib/accessLinkClaims";

export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
  "X-Robots-Tag": "noindex, nofollow, noarchive"
};

function json(body, init = {}) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...privateHeaders,
      ...(init.headers || {})
    }
  });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const result = await claimAccessLink({
    state: body?.state,
    email: body?.email,
    ipAddress,
    userAgent: request.headers.get("user-agent")
  });

  if (!result.ok) {
    return json({ ok: false, error: "invalid_or_expired_link" }, { status: 410 });
  }

  return json({ ok: true });
}
