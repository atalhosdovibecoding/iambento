import { createClient } from "@supabase/supabase-js";
import { loadDotenv } from "./env.mjs";

loadDotenv();

function usage() {
  console.log("Uso: node scripts/simulate-paid-webhook.mjs cliente@email.com [Nome do Cliente] [--url http://127.0.0.1:3000]");
}

function getArgValue(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
}

const args = process.argv.slice(2);
const email = String(args[0] || "").trim().toLowerCase();
const explicitUrl = getArgValue(args, "--url");
const nameParts = args.slice(1).filter((arg, index, list) => {
  if (arg === "--url") return false;
  if (index > 0 && list[index - 1] === "--url") return false;
  return !arg.startsWith("--");
});
const name = nameParts.join(" ").trim() || "Cliente Teste";

if (!email || !email.includes("@")) {
  usage();
  process.exit(1);
}

const appUrl = (explicitUrl || process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const webhookSecret = process.env.SYNC_PAY_WEBHOOK_SECRET;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL e SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY sao obrigatorios.");
}

const identifier = `manual-test-${Date.now()}`;
const payload = {
  id: identifier,
  status: "paid",
  amount_cents: 116,
  plan_id: "vip",
  customer: {
    email,
    name
  },
  metadata: {
    plan_id: "vip",
    source: "manual-access-test"
  }
};

const webhookUrl = new URL(`${appUrl}/api/syncpay/webhook`);
if (webhookSecret) {
  webhookUrl.searchParams.set("secret", webhookSecret);
}

console.log(`Simulando pagamento aprovado para ${email}`);
console.log(`Webhook: ${webhookUrl.origin}${webhookUrl.pathname}`);

const response = await fetch(webhookUrl, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    event: "payment.approved",
    ...(webhookSecret ? { authorization: `Bearer ${webhookSecret}` } : {})
  },
  body: JSON.stringify(payload)
});

const responseBody = await response.json().catch(() => null);
console.log(`Resposta do webhook: ${response.status}`);
console.log(JSON.stringify(responseBody, null, 2));

if (!response.ok) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const { data: customer, error: customerError } = await supabase
  .from("customers")
  .select("id,email,user_id")
  .eq("email", email)
  .maybeSingle();

if (customerError) throw customerError;

if (!customer) {
  throw new Error("Cliente nao foi criado no Supabase.");
}

const { data: orders, error: ordersError } = await supabase
  .from("orders")
  .select("id,status,amount_cents,plan_id,sync_identifier,paid_at")
  .eq("customer_id", customer.id)
  .order("created_at", { ascending: false })
  .limit(3);

if (ordersError) throw ordersError;

const { data: memberships, error: membershipsError } = await supabase
  .from("memberships")
  .select("id,status,plan_id,expires_at,user_id,order_id")
  .eq("customer_id", customer.id)
  .order("created_at", { ascending: false })
  .limit(3);

if (membershipsError) throw membershipsError;

const activeMembership = memberships?.find((item) => item.status === "active" && new Date(item.expires_at) > new Date());

console.log("\nResultado no Supabase:");
console.log(JSON.stringify({ customer, latestOrder: orders?.[0] || null, activeMembership: activeMembership || null }, null, 2));

if (activeMembership) {
  console.log("\nOK: acesso ativo criado. Para testar o email de login, abra /login e envie o magic link para esse mesmo email.");
} else {
  console.log("\nATENCAO: webhook respondeu, mas nenhuma membership ativa foi encontrada.");
  process.exit(1);
}
