export const plans = [
  {
    id: "vip",
    name: "Acesso privado",
    description: "Acesso direto ao conteúdo exclusivo, em uma experiência simples e privada.",
    priceLabel: "R$ 1,16",
    amountCents: 116,
    durationDays: 30,
    featured: true
  }
];

export function getPlan(planId) {
  return plans.find((plan) => plan.id === planId) || null;
}

export function formatCurrencyFromCents(amountCents) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(amountCents / 100);
}
