import { redirect } from "next/navigation";

export const metadata = {
  title: "Checkout | Bento Silva"
};

export default function CheckoutPage() {
  redirect(process.env.SYNC_PAY_CHECKOUT_URL || "https://syncpay.link/1mYFBk");
}
