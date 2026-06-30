export function getEnv(name, fallback = undefined) {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getOptionalEnv(name, fallback = "") {
  return process.env[name] ?? fallback;
}

const PRODUCTION_APP_URL = "https://www.iambento.site";

function withProtocol(value) {
  const cleanValue = String(value || "").trim();

  if (!cleanValue) return "";
  if (/^https?:\/\//i.test(cleanValue)) return cleanValue;

  return `https://${cleanValue}`;
}

function isLocalUrl(value) {
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function getAppUrl() {
  const configuredUrl =
    getOptionalEnv("APP_URL") ||
    getOptionalEnv("NEXT_PUBLIC_SITE_URL") ||
    getOptionalEnv("VERCEL_PROJECT_PRODUCTION_URL") ||
    getOptionalEnv("VERCEL_URL") ||
    PRODUCTION_APP_URL;

  const appUrl = withProtocol(configuredUrl).replace(/\/+$/, "");
  const runningInHostedProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";

  if (runningInHostedProduction && isLocalUrl(appUrl)) {
    return PRODUCTION_APP_URL;
  }

  return appUrl;
}
