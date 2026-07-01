import { getAppUrl, getOptionalEnv } from "./env";
import { createAccessLinkClaim } from "./accessLinkClaims";
import { getSupabaseAdmin, getSupabasePublicServer } from "./supabaseAdmin";

function maskEmail(email) {
  const [name, domain] = String(email || "").split("@");
  if (!name || !domain) return "unknown";
  return `${name.slice(0, 2)}***@${domain}`;
}

function firstName(name, email) {
  const cleanName = String(name || "").trim();
  if (cleanName) return cleanName.split(/\s+/)[0];
  return String(email || "").split("@")[0] || "cliente";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getRedirectTo(state) {
  const url = new URL(`${getAppUrl()}/auth/callback`);
  if (state) {
    url.searchParams.set("state", state);
  }
  return url.toString();
}

function hasResendConfig() {
  return Boolean(getOptionalEnv("RESEND_API_KEY") && getOptionalEnv("ACCESS_EMAIL_FROM"));
}

function accessEmailText({ name, email, accessUrl }) {
  const greeting = firstName(name, email);

  return [
    `Oi, ${greeting}.`,
    "",
    "Este e o seu link de acesso ao Bento Silva.",
    "",
    "Para entrar, toque no link abaixo:",
    accessUrl,
    "",
    "Por seguranca, esse link e individual e expira. Se ele vencer, basta pedir um novo acesso em:",
    `${getAppUrl()}/login`,
    "",
    "Use sempre o mesmo email informado na compra.",
    "",
    "Se voce nao solicitou este acesso, ignore esta mensagem.",
    "",
    "Bento Silva"
  ].join("\n");
}

function accessEmailHtml({ name, email, accessUrl }) {
  const greeting = escapeHtml(firstName(name, email));
  const safeAccessUrl = escapeHtml(accessUrl);
  const loginUrl = escapeHtml(`${getAppUrl()}/login`);

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Seu link de acesso</title>
  </head>
  <body style="margin:0;background:#f6f3ef;color:#171214;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f3ef;padding:28px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e8e1d8;">
            <tr>
              <td style="padding:28px 26px 10px;">
                <p style="margin:0 0 12px;color:#7c2630;font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;">Bento Silva</p>
                <h1 style="margin:0;color:#171214;font-size:26px;line-height:1.2;font-weight:700;">Seu link de acesso</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 26px 0;">
                <p style="margin:0 0 16px;color:#3b3336;font-size:16px;line-height:1.65;">Oi, ${greeting}. Recebemos a confirmacao e preparamos seu link de entrada.</p>
                <p style="margin:0;color:#3b3336;font-size:16px;line-height:1.65;">Toque no botao abaixo para acessar com seguranca usando o mesmo email informado na compra.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:26px;">
                <a href="${safeAccessUrl}" style="display:block;background:#171214;color:#ffffff;text-decoration:none;text-align:center;padding:15px 18px;font-size:14px;font-weight:700;">Acessar minha conta</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 26px 28px;">
                <p style="margin:0 0 14px;color:#685f62;font-size:13px;line-height:1.7;">Por seguranca, esse link e individual e expira. Se ele vencer, peca um novo acesso em <a href="${loginUrl}" style="color:#7c2630;">${loginUrl}</a>.</p>
                <p style="margin:0;color:#685f62;font-size:12px;line-height:1.7;">Se voce nao solicitou este acesso, ignore esta mensagem.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function generateAccessLink(email) {
  const claim = await createAccessLinkClaim(email);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: getRedirectTo(claim.state)
    }
  });

  if (error) throw error;

  const emailOtp = data?.properties?.email_otp;
  if (!emailOtp && !data?.properties?.action_link) {
    throw new Error("missing_email_otp");
  }

  if (!emailOtp) {
    return data.properties.action_link;
  }

  const accessUrl = new URL(`${getAppUrl()}/auth/access`);
  accessUrl.searchParams.set("email", email);
  accessUrl.searchParams.set("token", emailOtp);
  accessUrl.searchParams.set("state", claim.state);
  return accessUrl.toString();
}

async function sendResendEmail({ email, name, accessUrl }) {
  const apiKey = getOptionalEnv("RESEND_API_KEY");
  const from = getOptionalEnv("ACCESS_EMAIL_FROM");

  if (!apiKey || !from) {
    return null;
  }

  const replyTo = getOptionalEnv("ACCESS_EMAIL_REPLY_TO");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [email],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: "Seu link de acesso Bento Silva",
      html: accessEmailHtml({ name, email, accessUrl }),
      text: accessEmailText({ name, email, accessUrl })
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`resend_email_failed:${response.status}:${body.slice(0, 240)}`);
  }

  return { sent: true, provider: "resend" };
}

async function sendSupabaseEmail(email) {
  const claim = await createAccessLinkClaim(email);
  const supabase = getSupabasePublicServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: getRedirectTo(claim.state)
    }
  });

  if (error) throw error;

  return { sent: true, provider: "supabase" };
}

export async function sendAccessMagicLink({ email, name } = {}) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    return { sent: false, provider: "none", error: "missing_email" };
  }

  let resendError = null;

  if (hasResendConfig()) {
    try {
      const accessUrl = await generateAccessLink(normalizedEmail);
      const resendResult = await sendResendEmail({ email: normalizedEmail, name, accessUrl });

      if (resendResult) {
        return resendResult;
      }

      throw new Error("access_email_not_sent");
    } catch (error) {
      resendError = error;
      console.error("access_email_resend_error", {
        email: maskEmail(normalizedEmail),
        message: error.message
      });
    }
  } else {
    resendError = new Error("missing_resend_email_config");
  }

  try {
    return await sendSupabaseEmail(normalizedEmail);
  } catch (error) {
    console.error("access_email_error", {
      email: maskEmail(normalizedEmail),
      message: error.message,
      resendMessage: resendError?.message
    });

    return {
      sent: false,
      provider: "none",
      error: error.message || resendError?.message || "access_email_not_sent"
    };
  }
}
