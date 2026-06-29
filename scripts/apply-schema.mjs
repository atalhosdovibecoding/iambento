import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { loadDotenv } from "./env.mjs";

loadDotenv();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to apply the Supabase schema.");
}

const sqlPath = path.join(process.cwd(), "supabase", "schema.sql");
const sql = fs.readFileSync(sqlPath, "utf8");
const connectionUrl = new URL(databaseUrl);
connectionUrl.searchParams.delete("sslmode");

const client = new pg.Client({
  connectionString: connectionUrl.toString(),
  ssl: {
    rejectUnauthorized: false
  }
});

try {
  await client.connect();
  await client.query(sql);
  console.log("Supabase schema applied.");
} finally {
  await client.end();
}
