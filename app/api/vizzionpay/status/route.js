import { NextResponse } from "next/server";
import { grantMembership } from "../../../../lib/memberAccess";
import { sendOrderAccessEmail } from "../../../../lib/orderAccessEmail";
import {
  getTransaction,
  getVizzionClientIdentifier,
  getVizzionTransactionId,
  maskVizzionError,
  normalizeVizzionStatus
} from "../../../../lib/vizzionpay";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

async function findOrder(supabase, identifier) {
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

async function finalizeOrder({ supabase, order, status, gatewayPayload }) {
  if (!order) {
    return { accessGranted: false, accessEmailSent: false };
  }

  const update = {
    status,
    raw_gateway_response: {
      ...(order.raw_gateway_response || {}),
      latestStatus: gatewayPayload
    }
  };

  if (status === "completed" && !order.paid_at) {
    update.paid_at = new Date().toISOString();
  }

  const { data: updatedOrder, error } = await supabase
    .from("orders")
    .update(update)
    .eq("id", order.id)
    .select("*, customers(*)")
    .single();

  if (error) throw error;

  if (status !== "completed") {
    return { accessGranted: false, accessEmailSent: false, order: updatedOrder };
  }

  await grantMembership({ customer: updatedOrder.customers, order: updatedOrder });
  const emailResult = await sendOrderAccessEmail({ supabase, order: updatedOrder });

  return { accessGranted: true, accessEmailSent: emailResult.sent, order: updatedOrder };
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const identifier = url.searchParams.get("identifier");
    const transactionId = url.searchParams.get("transactionId");

    if (!identifier && !transactionId) {
      return NextResponse.json({ error: "missing_identifier" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const order = (await findOrder(supabase, identifier)) || (await findOrderByTransactionId(supabase, transactionId));

    if (order?.status === "completed") {
      await grantMembership({ customer: order.customers, order });
      const emailResult = await sendOrderAccessEmail({ supabase, order });

      return NextResponse.json({
        status: "completed",
        accessGranted: true,
        accessEmailSent: emailResult.sent
      });
    }

    const transaction = await getTransaction({
      id: transactionId || undefined,
      clientIdentifier: identifier || undefined
    });

    const status = normalizeVizzionStatus(transaction?.status);
    const paymentIdentifier = getVizzionClientIdentifier(transaction) || identifier;
    const paymentTransactionId = getVizzionTransactionId(transaction) || transactionId;
    const matchingOrder =
      order ||
      (paymentIdentifier ? await findOrder(supabase, paymentIdentifier) : null) ||
      (paymentTransactionId ? await findOrderByTransactionId(supabase, paymentTransactionId) : null);
    const result = await finalizeOrder({
      supabase,
      order: matchingOrder,
      status,
      gatewayPayload: transaction
    });

    return NextResponse.json({
      status,
      transactionId: paymentTransactionId,
      identifier: paymentIdentifier,
      accessGranted: result.accessGranted,
      accessEmailSent: result.accessEmailSent
    });
  } catch (error) {
    console.error("vizzionpay_status_error", error);
    return NextResponse.json({ error: maskVizzionError(error) }, { status: error.status || 500 });
  }
}
