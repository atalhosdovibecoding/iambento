"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Copy, Loader2, Lock, Mail, QrCode, ShieldCheck } from "lucide-react";

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatCpf(value) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatPhone(value) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

function statusLabel(status) {
  if (status === "completed") return "Pagamento confirmado";
  if (status === "failed") return "Pagamento nao aprovado";
  if (status === "refunded") return "Pagamento estornado";
  return "Aguardando Pix";
}

export default function CheckoutForm() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", document: "" });
  const [checkout, setCheckout] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [polling, setPolling] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      form.name.trim().length >= 2 &&
      form.email.includes("@") &&
      onlyDigits(form.phone).length >= 10 &&
      onlyDigits(form.document).length >= 11
    );
  }, [form]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();

    if (!canSubmit || status === "loading") return;

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/vizzionpay/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: onlyDigits(form.phone),
          document: onlyDigits(form.document),
          plan: "vip"
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Nao foi possivel gerar o Pix.");
      }

      setCheckout(data);
      setStatus(data.status || "pending");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Erro ao gerar checkout.");
    }
  }

  async function copyPixCode() {
    if (!checkout?.pixCode) return;
    await navigator.clipboard.writeText(checkout.pixCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  useEffect(() => {
    if (!checkout?.identifier || status === "completed" || status === "failed" || status === "refunded") {
      return undefined;
    }

    let cancelled = false;

    async function checkStatus() {
      setPolling(true);

      try {
        const params = new URLSearchParams({
          identifier: checkout.identifier,
          ...(checkout.transactionId ? { transactionId: checkout.transactionId } : {})
        });
        const response = await fetch(`/api/vizzionpay/status?${params.toString()}`, { cache: "no-store" });
        const data = await response.json();

        if (!cancelled && response.ok) {
          setStatus(data.status || "pending");
          if (data.status === "completed") {
            setMessage(
              data.accessEmailSent
                ? "Acesso liberado. O email de entrada foi enviado para o email da compra."
                : "Pagamento confirmado. Nao consegui enviar o email automatico agora; solicite o acesso em /login com o email da compra."
            );
          }
        }
      } catch {
        if (!cancelled) {
          setMessage("Ainda aguardando confirmacao do pagamento.");
        }
      } finally {
        if (!cancelled) {
          setPolling(false);
        }
      }
    }

    checkStatus();
    const interval = window.setInterval(checkStatus, 7000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [checkout?.identifier, checkout?.transactionId, status]);

  return (
    <main className="checkout-stage min-h-screen bg-ink px-5 py-6 text-bone sm:px-8 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-4 py-2">
          <a href="/principal" className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-bone/64 transition hover:text-gold">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </a>
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-gold">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            VizzionPay
          </span>
        </header>

        <section className="grid flex-1 gap-8 py-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:py-12">
          <div className="checkout-copy">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.26em] text-gold">
              Private +18
            </p>
            <h1 className="font-display text-4xl font-semibold leading-none text-bone sm:text-6xl lg:text-7xl">
              Ultimo passo para liberar o private por R$30.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-smoke sm:text-lg">
              Preencha seus dados, gere o Pix e receba o acesso no email usado na compra assim que o pagamento confirmar.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:max-w-2xl">
              <div className="checkout-trust">
                <Lock className="h-4 w-4 text-gold" aria-hidden="true" />
                <span>Ambiente reservado</span>
              </div>
              <div className="checkout-trust">
                <QrCode className="h-4 w-4 text-gold" aria-hidden="true" />
                <span>Pix copia e cola</span>
              </div>
              <div className="checkout-trust">
                <Mail className="h-4 w-4 text-gold" aria-hidden="true" />
                <span>Acesso por email</span>
              </div>
            </div>
          </div>

          <div className="checkout-card border border-bone/10 bg-bone/[0.035] p-4 shadow-premium sm:p-6 lg:p-8">
            {!checkout ? (
              <form onSubmit={submit} className="space-y-4">
                <div className="mb-2">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Acesso reservado</p>
                  <div className="mt-3 flex items-end justify-between gap-4">
                    <h2 className="text-2xl font-semibold text-bone">Acesso privado</h2>
                    <p className="checkout-price font-display text-5xl font-semibold leading-none text-bone">R$30</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-bone/58">
                    Checkout Pix rapido. O link de entrada vai para o email informado aqui.
                  </p>
                </div>

                <label className="checkout-field">
                  <span>Nome</span>
                  <input
                    autoComplete="name"
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Seu nome"
                  />
                </label>

                <label className="checkout-field">
                  <span>Email de acesso</span>
                  <input
                    autoComplete="email"
                    inputMode="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    placeholder="voce@email.com"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="checkout-field">
                    <span>WhatsApp</span>
                    <input
                      autoComplete="tel"
                      inputMode="tel"
                      value={form.phone}
                      onChange={(event) => updateField("phone", formatPhone(event.target.value))}
                      placeholder="(11) 99999-9999"
                    />
                  </label>

                  <label className="checkout-field">
                    <span>CPF</span>
                    <input
                      autoComplete="off"
                      inputMode="numeric"
                      value={form.document}
                      onChange={(event) => updateField("document", formatCpf(event.target.value))}
                      placeholder="000.000.000-00"
                    />
                  </label>
                </div>

                {message ? <p className="text-sm leading-6 text-[#ff8791]">{message}</p> : null}

                <button
                  type="submit"
                  disabled={!canSubmit || status === "loading"}
                  className="premium-button inline-flex min-h-12 w-full items-center justify-center gap-2 border border-gold/55 bg-gradient-to-r from-[#ff2a3d] to-[#9b0f1d] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-bone disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <QrCode className="h-4 w-4" aria-hidden="true" />}
                  Gerar Pix seguro
                </button>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Pix gerado</p>
                    <h2 className="mt-2 text-2xl font-semibold text-bone">Finalize o pagamento</h2>
                  </div>
                  <span className={`checkout-status checkout-status-${status}`}>
                    {polling ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                    {statusLabel(status)}
                  </span>
                </div>

                <div className="checkout-qr">
                  <img
                    src={checkout.pixImage || checkout.qrCodeDataUrl}
                    alt="QR Code Pix"
                    className="mx-auto h-64 w-64 max-w-full object-contain"
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-bone/50">Pix copia e cola</p>
                  <textarea readOnly value={checkout.pixCode} className="checkout-pix-code" />
                  <button
                    type="button"
                    onClick={copyPixCode}
                    className="premium-button mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 border border-bone/15 bg-ink/60 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-bone transition hover:border-gold/55"
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    {copied ? "Codigo copiado" : "Copiar codigo Pix"}
                  </button>
                </div>

                {message ? <p className="rounded-sm border border-gold/20 bg-gold/10 p-3 text-sm leading-6 text-bone/78">{message}</p> : null}

                {status === "completed" ? (
                  <a
                    href="/login"
                    className="inline-flex min-h-11 w-full items-center justify-center border border-gold/55 bg-gold/15 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-gold"
                  >
                    Entrar na area de membros
                  </a>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
