import { getAppUrl, getOptionalEnv } from "./env";
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

function getRedirectTo() {
  return `${getAppUrl()}/auth/callback`;
}

function accessEmailText({ name, email, accessUrl }) {
  const greeting = firstName(name, email);

  return [
    `Oi, ${greeting}.`,
    "",
    "Seu acesso ao private do Bento Silva foi liberado.",
    "",
    "Para entrar, toque no link abaixo:",
    accessUrl,
    "",
    "Por segurança, esse link é individual e expira. Se ele vencer, basta pedir um novo acesso em:",
    `${getAppUrl()}/login`,
    "",
    "Use sempre o mesmo email informado na compra.",
    "",
    "Bento Silva Private"
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
    <title>Acesso liberado</title>
  </head>
  <body style="margin:0;background:#050505;color:#f2eee6;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050505;padding:28px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border:1px solid rgba(242,238,230,0.12);background:#0b0708;">
            <tr>
              <td style="padding:28px 26px 10px;">
                <p style="margin:0 0 12px;color:#ff2a3d;font-size:11px;font-weight:700;letter-spacing:2.8px;text-transform:uppercase;">Bento Silva Private</p>
                <h1 style="margin:0;color:#fff8ea;font-size:30px;line-height:1.08;font-weight:700;">Seu acesso foi liberado.</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 26px 0;">
                <p style="margin:0 0 16px;color:#d9d0c5;font-size:16px;line-height:1.65;">Oi, ${greeting}. A compra foi confirmada e seu acesso privado já está pronto.</p>
                <p style="margin:0;color:#d9d0c5;font-size:16px;line-height:1.65;">Toque no botão abaixo para entrar com segurança usando o mesmo email informado na compra.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:26px;">
                <a href="${safeAccessUrl}" style="display:block;background:#ff2a3d;color:#fff8ea;text-decoration:none;text-align:center;padding:16px 18px;font-size:13px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;">Entrar no private</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 26px 28px;">
                <p style="margin:0 0 14px;color:#9c938b;font-size:13px;line-height:1.7;">Por segurança, esse link é individual e expira. Se ele vencer, peça um novo acesso em <a href="${loginUrl}" style="color:#ff5b6a;">${loginUrl}</a>.</p>
                <p style="margin:0;color:#9c938b;font-size:12px;line-height:1.7;">Conteúdo destinado exclusivamente a maiores de 18 anos.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendSupabaseOtp({ email }) {
  const supabase = getSupabasePublicServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getRedirectTo(),
      shouldCreateUser: false
    }
  });

  if (error) throw error;

  return { sent: true, provider: "supabase" };
}

async function generateAccessLink(email) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email
  });

  if (error) throw error;

  const emailOtp = data?.properties?.email_otp;
  if (!emailOtp) {
    throw new Error("missing_email_otp");
  }

  const accessUrl = new URL(`${getAppUrl()}/auth/access`);
  accessUrl.searchParams.set("email", email);
  accessUrl.searchParams.set("token", emailOtp);
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
      subject: "Seu acesso ao private foi liberado",
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

export async function sendAccessMagicLink({ email, name } = {}) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    return { sent: false, provider: "none", error: "missing_email" };
  }

  try {
    if (!getOptionalEnv("RESEND_API_KEY") || !getOptionalEnv("ACCESS_EMAIL_FROM")) {
      return await sendSupabaseOtp({ email: normalizedEmail });
    }

    const accessUrl = await generateAccessLink(normalizedEmail);
    const resendResult = await sendResendEmail({ email: normalizedEmail, name, accessUrl });

    if (resendResult) {
      return resendResult;
    }

    return await sendSupabaseOtp({ email: normalizedEmail });
  } catch (error) {
    console.error("access_email_error", {
      email: maskEmail(normalizedEmail),
      message: error.message
    });

    try {
      return await sendSupabaseOtp({ email: normalizedEmail });
    } catch (fallbackError) {
      console.error("access_email_fallback_error", {
        email: maskEmail(normalizedEmail),
        message: fallbackError.message
      });

      return {
        sent: false,
        provider: "none",
        error: fallbackError.message
      };
    }
  }
}
