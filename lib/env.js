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

export function getAppUrl() {
  return getOptionalEnv("APP_URL", getOptionalEnv("NEXT_PUBLIC_SITE_URL", "http://127.0.0.1:3000"))
    .replace(/\/+$/, "");
}
