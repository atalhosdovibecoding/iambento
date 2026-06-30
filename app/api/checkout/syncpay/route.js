import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.redirect(new URL("/checkout", process.env.APP_URL || "http://127.0.0.1:3000"), {
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
