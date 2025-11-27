"use client";

import { useState } from "react";
import {
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";
import { useCartStore, useCartTotal } from "@/store/cart.store";
import { paymentService } from "@/services/payment.service";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { useCurrencyStore } from "@/store/currency.store";

export default function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shippingAddress, setShippingAddress] = useState("");
  const { clearCart } = useCartStore();
  const total = useCartTotal();
  const { currency } = useCurrencyStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/marketplace/orders`,
      },
      redirect: "if_required",
    });

    if (error) {
      setMessage(error.message ?? "An unexpected error occurred.");
      setIsLoading(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      try {
        await paymentService.createOrder({
          paymentIntentId: paymentIntent.id,
          shippingAddress,
        });
        await clearCart();
        toast.success("Order placed successfully!");
        router.push("/marketplace/orders");
      } catch (err) {
        console.error(err);
        setMessage(
          "Payment succeeded but order creation failed. Please contact support.",
        );
        setIsLoading(false);
      }
    } else {
      setMessage("Payment status: " + paymentIntent?.status);
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div className="space-y-2">
        <Label htmlFor="shipping-address">Shipping Address</Label>
        <Input
          id="shipping-address"
          required
          value={shippingAddress}
          onChange={(e) => setShippingAddress(e.target.value)}
          placeholder="123 Main St, City, Country"
        />
      </div>

      <PaymentElement id="payment-element" />

      {message && <div className="text-red-500 text-sm">{message}</div>}

      <Button
        disabled={isLoading || !stripe || !elements}
        className="w-full"
      >
        {isLoading ? "Processing..." : `Pay ${total.toFixed(2)} ${currency}`}
      </Button>
    </form>
  );
}
