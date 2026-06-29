import fs from "node:fs";
import path from "node:path";

export function loadDotenv(file = ".env.local") {
  const fullPath = path.join(process.cwd(), file);

  if (!fs.existsSync(fullPath)) {
    return;
  }

  const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
