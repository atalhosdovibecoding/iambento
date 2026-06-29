import { getPlan } from "./plans";
import { getSupabaseAdmin } from "./supabaseAdmin";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function findOrCreateCustomer({ email, name, cpf, phone }) {
  const supabase = getSupabaseAdmin();
  const normalizedEmail = normalizeEmail(email);

  const { data: existing, error: findError } = await supabase
    .from("customers")
    .select("*")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (existing) {
    const { data, error } = await supabase
      .from("customers")
      .update({
        name: name || existing.name,
        cpf: cpf || existing.cpf,
        phone: phone || existing.phone
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      email: normalizedEmail,
      name,
      cpf,
      phone
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function createAuthUserIfPossible(customer) {
  const supabase = getSupabaseAdmin();

  if (customer.user_id) {
    return customer.user_id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: customer.email,
    email_confirm: true,
    user_metadata: {
      name: customer.name || ""
    }
  });

  if (error) {
    const message = String(error.message || "").toLowerCase();

    if (message.includes("already") || message.includes("registered")) {
      return null;
    }

    throw error;
  }

  if (!data?.user?.id) {
    return null;
  }

  await supabase
    .from("customers")
    .update({ user_id: data.user.id })
    .eq("id", customer.id);

  return data.user.id;
}

export async function grantMembership({ customer, order }) {
  const supabase = getSupabaseAdmin();
  const plan = getPlan(order.plan_id);

  if (!plan) {
    throw new Error(`Unknown plan: ${order.plan_id}`);
  }

  const startsAt = new Date();
  const expiresAt = addDays(startsAt, plan.durationDays);
  const userId = customer.user_id || (await createAuthUserIfPossible(customer));

  const { data, error } = await supabase
    .from("memberships")
    .upsert(
      {
        customer_id: customer.id,
        user_id: userId,
        order_id: order.id,
        plan_id: order.plan_id,
        status: "active",
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        revoked_at: null
      },
      { onConflict: "order_id" }
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function attachCustomerToUser(user) {
  const supabase = getSupabaseAdmin();
  const normalizedEmail = normalizeEmail(user.email);

  const { data: customer, error } = await supabase
    .from("customers")
    .select("*")
    .or(`user_id.eq.${user.id},email.eq.${normalizedEmail}`)
    .maybeSingle();

  if (error || !customer) {
    return { customer: null, error };
  }

  if (!customer.user_id) {
    await supabase.from("customers").update({ user_id: user.id }).eq("id", customer.id);
    await supabase.from("memberships").update({ user_id: user.id }).eq("customer_id", customer.id);
    return { customer: { ...customer, user_id: user.id }, error: null };
  }

  return { customer, error: null };
}

export async function getActiveMembershipForUser(user) {
  const supabase = getSupabaseAdmin();
  const { customer, error } = await attachCustomerToUser(user);

  if (error || !customer) {
    return { customer: null, membership: null, error };
  }

  const now = new Date().toISOString();
  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("*")
    .eq("status", "active")
    .or(`user_id.eq.${user.id},customer_id.eq.${customer.id}`)
    .gt("expires_at", now)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { customer, membership, error: membershipError };
}
