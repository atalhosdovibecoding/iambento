import { createClient } from "@supabase/supabase-js";
import { loadDotenv } from "./env.mjs";

loadDotenv();

function usage() {
  console.log("Uso: node scripts/simulate-vizzion-paid-webhook.mjs cliente@email.com [Nome do Cliente] [--url https://www.iambento.site]");
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
const webhookSecret = process.env.VIZZIONPAY_WEBHOOK_SECRET;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!webhookSecret) {
  throw new Error("VIZZIONPAY_WEBHOOK_SECRET e obrigatorio para simular o webhook em producao.");
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL e SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY sao obrigatorios.");
}

const identifier = `vizzion-test-${Date.now()}`;
const transactionId = `tx_${Date.now().toString(36)}`;
const now = new Date().toISOString();
const payload = {
  event: "TRANSACTION_PAID",
  token: "manual-test-token",
  offerCode: null,
  checkoutUrl: `${appUrl}/checkout`,
  client: {
    id: `client_${Date.now().toString(36)}`,
    name,
    email,
    phone: "(11) 99999-9999",
    cpf: "123.456.789-09",
    cnpj: null,
    address: null
  },
  transaction: {
    id: transactionId,
    identifier,
    status: "COMPLETED",
    paymentMethod: "PIX",
    originalCurrency: "BRL",
    originalAmount: 1.16,
    amount: 1.16,
    commissionAmount: 1.16,
    currency: "BRL",
    exchangeRate: 1,
    installments: 1,
    createdAt: now,
    payedAt: now,
    pixInformation: {
      qrCode: "manual-test-pix-code",
      endToEndId: "manual-test-end-to-end"
    }
  },
  subscription: null,
  orderItems: [
    {
      id: `item_${Date.now().toString(36)}`,
      price: 1.16,
      product: {
        id: "vip",
        name: "Acesso privado",
        externalId: "vip"
      }
    }
  ],
  trackProps: {
    source: "manual-vizzion-webhook-test"
  }
};

const webhookUrl = new URL(`${appUrl}/api/vizzionpay/webhook`);
webhookUrl.searchParams.set("secret", webhookSecret);

console.log(`Simulando pagamento VizzionPay aprovado para ${email}`);
console.log(`Webhook: ${webhookUrl.origin}${webhookUrl.pathname}`);

const response = await fetch(webhookUrl, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${webhookSecret}`
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

const { data: latestOrder, error: orderError } = await supabase
  .from("orders")
  .select("id,status,amount_cents,plan_id,sync_identifier,paid_at")
  .eq("sync_identifier", identifier)
  .maybeSingle();

if (orderError) throw orderError;

const { data: latestMembership, error: membershipError } = await supabase
  .from("memberships")
  .select("id,status,plan_id,expires_at,user_id,order_id")
  .eq("customer_id", customer.id)
  .eq("order_id", latestOrder?.id || "00000000-0000-0000-0000-000000000000")
  .maybeSingle();

if (membershipError) throw membershipError;

const activeMembership =
  latestMembership?.status === "active" && new Date(latestMembership.expires_at) > new Date()
    ? latestMembership
    : null;

console.log("\nResultado no Supabase:");
console.log(JSON.stringify({ customer, latestOrder, activeMembership }, null, 2));

if (activeMembership && responseBody?.accessEmailSent) {
  console.log("\nOK: acesso ativo criado e envio de email aceito pelo provedor.");
} else if (activeMembership) {
  console.log("\nATENCAO: acesso ativo criado, mas o webhook nao confirmou envio de email.");
  process.exit(1);
} else {
  console.log("\nATENCAO: webhook respondeu, mas nenhuma membership ativa foi encontrada.");
  process.exit(1);
}
