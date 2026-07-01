import { sendAccessMagicLink } from "./accessEmail";

function getGatewayResponse(order) {
  const response = order?.raw_gateway_response;
  return response && typeof response === "object" && !Array.isArray(response) ? response : {};
}

function getAccessEmailState(order) {
  return getGatewayResponse(order).accessEmail || null;
}

export function wasAccessEmailAccepted(order) {
  return Boolean(getAccessEmailState(order)?.sent);
}

export async function sendOrderAccessEmail({ supabase, order }) {
  const previousEmail = getAccessEmailState(order);

  if (previousEmail?.sent) {
    return {
      sent: true,
      provider: previousEmail.provider || "unknown",
      skipped: true
    };
  }

  const result = await sendAccessMagicLink({
    email: order?.customers?.email,
    name: order?.customers?.name
  });
  const now = new Date().toISOString();
  const gatewayResponse = getGatewayResponse(order);
  const accessEmail = {
    sent: result.sent,
    provider: result.provider || "none",
    lastAttemptAt: now,
    ...(result.sent ? { sentAt: now } : {}),
    ...(result.error ? { error: String(result.error).slice(0, 240) } : {})
  };

  const { error } = await supabase
    .from("orders")
    .update({
      raw_gateway_response: {
        ...gatewayResponse,
        accessEmail
      }
    })
    .eq("id", order.id);

  if (error) {
    console.error("access_email_order_update_error", {
      orderId: order?.id,
      message: error.message
    });
  }

  return result;
}
