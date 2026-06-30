import crypto from "crypto";
import { NextResponse } from "next/server";
import { sendAccessMagicLink } from "../../../../lib/accessEmail";
import { findOrCreateCustomer, grantMembership } from "../../../../lib/memberAccess";
import { getPlan, plans } from "../../../../lib/plans";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function safeEqual(a, b) {
  if (!a || !b) return false;
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function getIdentifier(payload) {
  const data = getPayloadData(payload);
  return (
    data?.id ||
    data?.identifier ||
    data?.transaction_id ||
    data?.payment_id ||
    payload?.identifier ||
    payload?.id ||
    null
  );
}

function getPayloadData(payload) {
  return payload?.data || payload?.transaction || payload?.payment || payload || {};
}

function normalizeStatus(status) {
  const value = String(status || "").toLowerCase();
  if (value === "completed" || value === "paid" || value === "approved") return "completed";
  if (value === "failed" || value === "canceled" || value === "cancelled" || value === "expired") return "failed";
  if (value === "refunded" || value === "chargeback") return "refunded";
  return "pending";
}

function pickFirst(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getAmountCents(value) {
  if (value === undefined || value === null || value === "") return null;

  const raw = String(value).trim();
  let normalized = raw.replace(/[^\d.,]/g, "");

  if (!normalized) return null;

  const hasDecimalSeparator = /[.,]\d{1,2}$/.test(normalized);

  if (normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else {
    const dots = normalized.match(/\./g) || [];
    if (dots.length > 1 || !hasDecimalSeparator) {
      normalized = normalized.replace(/\./g, "");
    }
  }

  const number = Number(normalized);
  if (!Number.isFinite(number) || number <= 0) return null;

  if (hasDecimalSeparator || !Number.isInteger(number)) {
    return Math.round(number * 100);
  }

  if (number >= 1000) {
    return Math.round(number);
  }

  return Math.round(number * 100);
}

function getExplicitCents(value) {
  if (value === undefined || value === null || value === "") return null;

  const cents = Number(String(value).replace(/[^\d]/g, ""));
  if (!Number.isFinite(cents) || cents <= 0) return null;

  return Math.round(cents);
}

function getHostedCheckoutCustomer(payload) {
  const data = getPayloadData(payload);
  const client = data?.client || data?.customer || data?.buyer || data?.payer || data?.debtor || {};
  const debtorAccount = data?.debtor_account || data?.debtorAccount || {};

  const email = normalizeEmail(
    pickFirst(
      client.email,
      data?.email,
      data?.customer_email,
      data?.customerEmail,
      payload?.email,
      payload?.customer_email
    )
  );

  return {
    email,
    name: String(
      pickFirst(
        client.name,
        client.full_name,
        client.fullName,
        data?.name,
        data?.customer_name,
        data?.customerName,
        payload?.name,
        email ? email.split("@")[0] : "Cliente SyncPay"
      )
    ).trim(),
    cpf: onlyDigits(
      pickFirst(
        client.cpf,
        client.document,
        client.document_number,
        client.documentNumber,
        data?.cpf,
        data?.document,
        data?.document_number,
        debtorAccount?.document,
        payload?.document
      )
    ),
    phone: onlyDigits(
      pickFirst(
        client.phone,
        client.phone_number,
        client.phoneNumber,
        client.whatsapp,
        data?.phone,
        data?.customer_phone,
        payload?.phone
      )
    )
  };
}

function getHostedCheckoutPlan(payload) {
  const data = getPayloadData(payload);
  const metadata = data?.metadata || payload?.metadata || {};
  const product = data?.product || data?.offer || data?.checkout || {};
  const requestedPlanId = String(
    pickFirst(
      metadata.plan_id,
      metadata.planId,
      product.plan_id,
      product.planId,
      product.external_id,
      product.externalId,
      data?.plan_id,
      data?.planId,
      payload?.plan_id,
      payload?.planId
    ) || ""
  ).toLowerCase();

  const explicitPlan = getPlan(requestedPlanId);
  const explicitAmountCents = getExplicitCents(pickFirst(data?.amount_cents, data?.amountCents, payload?.amount_cents));
  const amountCents =
    explicitAmountCents ||
    getAmountCents(
      pickFirst(data?.final_amount, data?.finalAmount, data?.amount, data?.value, payload?.amount)
    );
  const amountPlan = amountCents ? plans.find((plan) => plan.amountCents === amountCents) : null;
  const fallbackPlan =
    getPlan(process.env.SYNC_PAY_DEFAULT_PLAN_ID || "vip") ||
    plans.find((plan) => plan.featured) ||
    plans[0];
  const plan = explicitPlan || amountPlan || fallbackPlan;

  return {
    plan,
    amountCents: amountCents || plan.amountCents
  };
}

async function findOrderByIdentifier(supabase, syncIdentifier) {
  if (!syncIdentifier) return null;

  const { data, error } = await supabase
    .from("orders")
    .select("*, customers(*)")
    .eq("sync_identifier", syncIdentifier)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function createHostedCheckoutOrder({ supabase, payload, status, syncIdentifier }) {
  const customerData = getHostedCheckoutCustomer(payload);

  if (!customerData.email) {
    return null;
  }

  const customer = await findOrCreateCustomer(customerData);
  const { plan, amountCents } = getHostedCheckoutPlan(payload);

  const insert = {
    customer_id: customer.id,
    plan_id: plan.id,
    sync_identifier: syncIdentifier,
    amount_cents: amountCents,
    status,
    raw_gateway_response: payload,
    paid_at: status === "completed" ? new Date().toISOString() : null
  };

  const { data, error } = await supabase
    .from("orders")
    .insert(insert)
    .select("*, customers(*)")
    .single();

  if (error?.code === "23505" && syncIdentifier) {
    return findOrderByIdentifier(supabase, syncIdentifier);
  }

  if (error) throw error;

  return data;
}

async function recordPaymentEvent({ supabase, order, payload, syncIdentifier, status, eventHeader, payloadHash }) {
  const { error } = await supabase.from("payment_events").upsert(
    {
      order_id: order?.id || null,
      sync_identifier: syncIdentifier,
      event_header: eventHeader,
      status,
      payload_hash: payloadHash,
      payload
    },
    { onConflict: "payload_hash" }
  );

  if (error) throw error;
}

export async function POST(request) {
  const webhookSecret = process.env.SYNC_PAY_WEBHOOK_SECRET;

  if (!webhookSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "webhook_secret_required" }, { status: 500 });
  }

  if (webhookSecret) {
    const url = new URL(request.url);
    const querySecret = url.searchParams.get("secret");
    const bearer = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");

    if (!safeEqual(querySecret, webhookSecret) && !safeEqual(bearer, webhookSecret)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const payload = await request.json();
    const supabase = getSupabaseAdmin();
    const syncIdentifier = getIdentifier(payload);
    const status = normalizeStatus(getPayloadData(payload)?.status || payload?.status);
    const eventHeader = request.headers.get("event") || null;
    const payloadHash = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

    let order = await findOrderByIdentifier(supabase, syncIdentifier);

    if (!order) {
      order = await createHostedCheckoutOrder({ supabase, payload, status, syncIdentifier });
    }

    await recordPaymentEvent({ supabase, order, payload, syncIdentifier, status, eventHeader, payloadHash });

    if (!order) {
      return NextResponse.json({ received: true, accessGranted: false, reason: "missing_customer_email" });
    }

    const update = {
      status,
      raw_gateway_response: payload
    };

    if (status === "completed") {
      update.paid_at = new Date().toISOString();
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update(update)
      .eq("id", order.id)
      .select("*, customers(*)")
      .single();

    if (updateError) throw updateError;

    let accessEmailSent = false;

    if (status === "completed") {
      await grantMembership({ customer: updatedOrder.customers, order: updatedOrder });
      const emailResult = await sendAccessMagicLink({
        email: updatedOrder.customers?.email,
        name: updatedOrder.customers?.name
      });
      accessEmailSent = emailResult.sent;
    }

    return NextResponse.json({ received: true, accessEmailSent });
  } catch (error) {
    console.error("syncpay_webhook_error", error);
    return NextResponse.json({ error: "webhook_error" }, { status: 500 });
  }
}
