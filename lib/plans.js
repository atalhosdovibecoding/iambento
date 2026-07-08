export const plans = [
  {
    id: "vip",
    name: "Acesso vitalicio",
    description: "Pagamento unico com acesso vitalicio e ilimitado enviado no email da compra.",
    priceLabel: "R$ 30,00",
    amountCents: 3000,
    durationDays: 36500,
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
