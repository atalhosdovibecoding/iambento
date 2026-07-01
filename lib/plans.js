export const plans = [
  {
    id: "vip",
    name: "Acesso privado",
    description: "Entrada reservada com acesso enviado no email da compra.",
    priceLabel: "R$ 30,00",
    amountCents: 3000,
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
