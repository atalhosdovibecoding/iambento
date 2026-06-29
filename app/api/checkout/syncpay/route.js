import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.redirect(process.env.SYNC_PAY_CHECKOUT_URL || "https://syncpay.link/1mYFBk", {
    status: 307
  });
}

export async function POST() {
  return NextResponse.json(
    {
      error: "Checkout local desativado. Use o checkout hospedado da SyncPay."
    },
    { status: 410 }
  );
}
