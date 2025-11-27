"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "./_components/CheckoutForm";
import { useCartStore, useCartTotal } from "@/store/cart.store";
import { paymentService } from "@/services/payment.service";
import { useCurrencyStore } from "@/store/currency.store";
import { Loader2 } from "lucide-react";

// Make sure to call loadStripe outside of a component’s render to avoid
// recreating the Stripe object on every render.
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

export default function CheckoutPage() {
  const [clientSecret, setClientSecret] = useState("");
  const { cart, fetchCart } = useCartStore();
  const total = useCartTotal();
  const { currency } = useCurrencyStore();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    if (total > 0) {
      paymentService
        .createPaymentIntent(total, currency)
        .then((data) => setClientSecret(data.clientSecret))
        .catch((err) => console.error("Failed to create payment intent", err));
    }
  }, [total, currency]);

  if (!cart || cart.cartItems.length === 0) {
    return (
      <div className="container mx-auto py-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <p>Go back to marketplace to add items.</p>
      </div>
    );
  }

  const appearance = {
    theme: 'night' as const,
  };
  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className="container mx-auto py-10 max-w-md">
      <h1 className="text-3xl font-bold mb-8 text-center">Checkout</h1>
      {clientSecret ? (
        <Elements options={options} stripe={stripePromise}>
          <CheckoutForm />
        </Elements>
      ) : (
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
    </div>
  );
}
