import { getAppUrl, getEnv, getOptionalEnv } from "./env";

export const VIZZIONPAY_API_BASE_URL = getOptionalEnv(
  "VIZZIONPAY_API_BASE_URL",
  "https://app.vizzionpay.com.br/api/v1"
).replace(/\/+$/, "");

function getCredentials() {
  return {
    publicKey: getEnv("VIZZIONPAY_PUBLIC_KEY"),
    secretKey: getEnv("VIZZIONPAY_SECRET_KEY")
  };
}

function getHeaders() {
  const { publicKey, secretKey } = getCredentials();

  return {
    "content-type": "application/json",
    "x-public-key": publicKey,
    "x-secret-key": secretKey
  };
}

function toQueryString(query = {}) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export function getVizzionWebhookUrl() {
  const url = new URL(`${getAppUrl()}/api/vizzionpay/webhook`);
  const secret = getOptionalEnv("VIZZIONPAY_WEBHOOK_SECRET");

  if (secret) {
    url.searchParams.set("secret", secret);
  }

  return url.toString();
}

export async function vizzionRequest(path, { method = "GET", query, body } = {}) {
  const response = await fetch(`${VIZZIONPAY_API_BASE_URL}${path}${toQueryString(query)}`, {
    method,
    headers: getHeaders(),
    cache: "no-store",
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const message = data?.message || data?.errorDescription || data?.error || response.statusText;
    const error = new Error(`vizzionpay_request_failed:${response.status}:${message}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function createPixCharge(payload) {
  return vizzionRequest("/gateway/pix/receive", {
    method: "POST",
    body: payload
  });
}

export async function getTransaction({ id, clientIdentifier }) {
  const result = await vizzionRequest("/gateway/transactions", {
    query: { id, clientIdentifier }
  });

  if (Array.isArray(result)) {
    return result[0] || null;
  }

  if (Array.isArray(result?.data)) {
    return result.data[0] || null;
  }

  if (result?.transaction) {
    return result.transaction;
  }

  if (result?.data?.transaction) {
    return result.data.transaction;
  }

  return result?.data || result || null;
}

export function normalizeVizzionStatus(status, event) {
  const value = String(status || event || "").toUpperCase();

  if (value === "COMPLETED" || value === "TRANSACTION_PAID") {
    return "completed";
  }

  if (
    value === "FAILED" ||
    value === "REJECTED" ||
    value === "CANCELED" ||
    value === "CANCELLED" ||
    value === "TRANSACTION_CANCELED"
  ) {
    return "failed";
  }

  if (
    value === "REFUNDED" ||
    value === "CHARGED_BACK" ||
    value === "TRANSACTION_REFUNDED" ||
    value === "TRANSACTION_CHARGED_BACK"
  ) {
    return "refunded";
  }

  return "pending";
}

export function getVizzionTransactionId(payload) {
  return (
    payload?.transactionId ||
    payload?.id ||
    payload?.transaction?.id ||
    payload?.data?.transaction?.id ||
    payload?.data?.id ||
    null
  );
}

export function getVizzionClientIdentifier(payload) {
  return (
    payload?.clientIdentifier ||
    payload?.identifier ||
    payload?.transaction?.identifier ||
    payload?.data?.clientIdentifier ||
    payload?.data?.identifier ||
    payload?.data?.transaction?.identifier ||
    payload?.metadata?.orderId ||
    payload?.data?.metadata?.orderId ||
    null
  );
}

export function getVizzionWebhookToken(payload) {
  return payload?.token || payload?.data?.token || payload?.webhookToken || payload?.data?.webhookToken || null;
}

export function maskVizzionError(error) {
  if (!error?.data) {
    return error?.message || "Erro ao comunicar com a VizzionPay.";
  }

  return error.data.message || error.data.errorDescription || error.data.error || error.message;
}
