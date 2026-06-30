import { NextResponse } from "next/server";
import { getAppUrl } from "../../../../lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.redirect(new URL("/checkout", getAppUrl()), {
    status: 307
  });
}

export async function POST() {
  return NextResponse.json(
    {
      error: "Checkout antigo desativado. Use /checkout."
    },
    { status: 410 }
  );
}
