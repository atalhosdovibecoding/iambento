import crypto from "crypto";
import { NextResponse } from "next/server";
import { sendAccessMagicLink } from "../../../../lib/accessEmail";
import { findOrCreateCustomer, grantMembership } from "../../../../lib/memberAccess";
import { getPlan, plans } from "../../../../lib/plans";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import {
  getVizzionClientIdentifier,
  getVizzionTransactionId,
  getVizzionWebhookToken,
  normalizeVizzionStatus
} from "../../../../lib/vizzionpay";

export const dynamic = "force-dynamic";

function safeEqual(a, b) {
  if (!a || !b) return false;
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function getPayloadCustomer(payload) {
  const client = payload?.client || payload?.data?.client || {};
  const email = normalizeEmail(client.email || payload?.email);

  return {
    email,
    name: String(client.name || payload?.name || (email ? email.split("@")[0] : "Cliente")).trim(),
    cpf: onlyDigits(client.cpf || client.cnpj || client.document || payload?.document),
    phone: onlyDigits(client.phone || payload?.phone)
  };
}

function getPayloadPlan(payload) {
  const item = payload?.orderItems?.[0] || payload?.data?.orderItems?.[0] || {};
  const product = item.product || {};
  const explicitPlan = getPlan(product.externalId || product.id || payload?.metadata?.planId || "vip");
  return explicitPlan || plans.find((plan) => plan.featured) || plans[0];
}

function getPayloadAmountCents(payload, plan) {
  const amount = payload?.transaction?.amount || payload?.data?.transaction?.amount || payload?.amount;
  const number = Number(amount);

  if (Number.isFinite(number) && number > 0) {
    return Math.round(number * 100);
  }

  return plan.amountCents;
}

async function findOrderByIdentifier(supabase, identifier) {
  if (!identifier) return null;

  const { data, error } = await supabase
    .from("orders")
    .select("*, customers(*)")
    .eq("sync_identifier", identifier)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findOrderByTransactionId(supabase, transactionId) {
  if (!transactionId) return null;

  const { data, error } = await supabase
    .from("orders")
    .select("*, customers(*)")
    .contains("raw_gateway_response", { transactionId })
    .maybeSingle();

  if (error) throw error;
  return data;
}

function orderWebhookToken(order) {
  return order?.raw_gateway_response?.webhookToken || order?.raw_gateway_response?.response?.token || null;
}

function isAuthorized({ request, payload, order }) {
  const configuredSecret = process.env.VIZZIONPAY_WEBHOOK_SECRET;
  const configuredToken = process.env.VIZZIONPAY_WEBHOOK_TOKEN;
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  const bearer = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const payloadToken = getVizzionWebhookToken(payload);
  const storedToken = orderWebhookToken(order);

  if (configuredSecret && (safeEqual(querySecret, configuredSecret) || safeEqual(bearer, configuredSecret))) {
    return true;
  }

  if (configuredToken && safeEqual(payloadToken, configuredToken)) {
    return true;
  }

  if (storedToken && safeEqual(payloadToken, storedToken)) {
    return true;
  }

  return !configuredSecret && !configuredToken && process.env.NODE_ENV !== "production";
}

async function createOrderFromWebhook({ supabase, payload, status, identifier }) {
  const customerData = getPayloadCustomer(payload);

  if (!customerData.email) {
    return null;
  }

  const customer = await findOrCreateCustomer(customerData);
  const plan = getPayloadPlan(payload);
  const amountCents = getPayloadAmountCents(payload, plan);

  const { data, error } = await supabase
    .from("orders")
    .insert({
      customer_id: customer.id,
      plan_id: plan.id,
      sync_identifier: identifier,
      status,
      amount_cents: amountCents,
      pix_code: payload?.transaction?.pixInformation?.qrCode || payload?.pix?.code || null,
      raw_gateway_response: {
        provider: "vizzionpay",
        webhook: payload
      },
      paid_at: status === "completed" ? new Date().toISOString() : null
    })
    .select("*, customers(*)")
    .single();

  if (error?.code === "23505") {
    return findOrderByIdentifier(supabase, identifier);
  }

  if (error) throw error;
  return data;
}

async function recordPaymentEvent({ supabase, order, payload, identifier, status, payloadHash }) {
  const { error } = await supabase.from("payment_events").upsert(
    {
      order_id: order?.id || null,
      sync_identifier: identifier,
      event_header: payload?.event || null,
      status,
      payload_hash: payloadHash,
      payload
    },
    { onConflict: "payload_hash" }
  );

  if (error) throw error;
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const supabase = getSupabaseAdmin();
    const transactionId = getVizzionTransactionId(payload);
    const identifier = getVizzionClientIdentifier(payload) || transactionId;
    const status = normalizeVizzionStatus(payload?.transaction?.status || payload?.status, payload?.event);
    const payloadHash = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

    let order =
      (await findOrderByIdentifier(supabase, identifier)) ||
      (await findOrderByTransactionId(supabase, transactionId));

    if (!isAuthorized({ request, payload, order })) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (!order) {
      order = await createOrderFromWebhook({ supabase, payload, status, identifier });
    }

    await recordPaymentEvent({ supabase, order, payload, identifier, status, payloadHash });

    if (!order) {
      return NextResponse.json({ received: true, accessGranted: false, reason: "missing_customer_email" });
    }

    const { data: updatedOrder, error } = await supabase
      .from("orders")
      .update({
        status,
        raw_gateway_response: {
          ...(order.raw_gateway_response || {}),
          latestWebhook: payload,
          transactionId
        },
        ...(status === "completed" ? { paid_at: new Date().toISOString() } : {})
      })
      .eq("id", order.id)
      .select("*, customers(*)")
      .single();

    if (error) throw error;

    let accessEmailSent = false;

    if (status === "completed") {
      await grantMembership({ customer: updatedOrder.customers, order: updatedOrder });
      const emailResult = await sendAccessMagicLink({
        email: updatedOrder.customers?.email,
        name: updatedOrder.customers?.name
      });
      accessEmailSent = emailResult.sent;
    }

    return NextResponse.json({ received: true, status, accessEmailSent });
  } catch (error) {
    console.error("vizzionpay_webhook_error", error);
    return NextResponse.json({ error: "webhook_error" }, { status: 500 });
  }
}
