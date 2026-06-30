import crypto from "crypto";
import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { createPixCharge, getVizzionWebhookUrl, maskVizzionError, normalizeVizzionStatus } from "../../../../lib/vizzionpay";
import { findOrCreateCustomer } from "../../../../lib/memberAccess";
import { getPlan } from "../../../../lib/plans";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function cleanName(name, email) {
  const value = String(name || "").trim();
  return value || normalizeEmail(email).split("@")[0] || "Cliente";
}

function makeIdentifier() {
  return `iambento-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
}

function validateCheckout(body) {
  const email = normalizeEmail(body?.email);
  const name = cleanName(body?.name, email);
  const phone = onlyDigits(body?.phone);
  const document = onlyDigits(body?.document);

  if (!email || !email.includes("@")) {
    return { error: "Informe um email valido." };
  }

  if (!phone || phone.length < 10) {
    return { error: "Informe um telefone valido com DDD." };
  }

  if (!document || document.length < 11) {
    return { error: "Informe um CPF valido." };
  }

  return { customer: { email, name, phone, cpf: document } };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const plan = getPlan(String(body?.plan || "vip"));

    if (!plan) {
      return NextResponse.json({ error: "Plano indisponivel." }, { status: 400 });
    }

    const validation = validateCheckout(body);

    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const customer = await findOrCreateCustomer(validation.customer);
    const identifier = makeIdentifier();
    const amount = plan.amountCents / 100;
    const callbackUrl = getVizzionWebhookUrl();
    const payload = {
      identifier,
      amount,
      client: {
        name: customer.name,
        email: customer.email,
        phone: validation.customer.phone,
        document: validation.customer.cpf
      },
      products: [
        {
          id: plan.id,
          name: plan.name,
          quantity: 1,
          price: amount,
          physical: false
        }
      ],
      metadata: {
        provider: "iambento",
        orderId: identifier
      },
      callbackUrl
    };

    const gatewayResponse = await createPixCharge(payload);
    const pixCode = gatewayResponse?.pix?.code || gatewayResponse?.pixCode || "";

    if (!pixCode) {
      console.error("vizzionpay_missing_pix_code", { identifier, response: gatewayResponse });
      return NextResponse.json({ error: "A VizzionPay nao retornou o codigo Pix." }, { status: 502 });
    }

    const supabase = getSupabaseAdmin();
    const status = normalizeVizzionStatus(gatewayResponse?.status);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        customer_id: customer.id,
        plan_id: plan.id,
        sync_identifier: identifier,
        amount_cents: plan.amountCents,
        status,
        pix_code: pixCode,
        raw_gateway_response: {
          provider: "vizzionpay",
          transactionId: gatewayResponse?.transactionId || null,
          webhookToken: gatewayResponse?.token || gatewayResponse?.webhookToken || null,
          response: gatewayResponse
        },
        paid_at: status === "completed" ? new Date().toISOString() : null
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    const qrCodeDataUrl = await QRCode.toDataURL(pixCode, {
      margin: 1,
      width: 320,
      color: {
        dark: "#050505",
        light: "#fff8ea"
      }
    });

    return NextResponse.json({
      orderId: order.id,
      identifier,
      transactionId: gatewayResponse?.transactionId || null,
      status,
      amountCents: plan.amountCents,
      pixCode,
      pixImage: gatewayResponse?.pix?.image || null,
      qrCodeDataUrl
    });
  } catch (error) {
    console.error("vizzionpay_checkout_error", error);
    return NextResponse.json({ error: maskVizzionError(error) }, { status: error.status || 500 });
  }
}
