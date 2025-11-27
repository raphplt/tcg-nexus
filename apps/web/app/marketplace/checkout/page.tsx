"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "./_components/CheckoutForm";
import { useCartStore, useCartTotal } from "@/store/cart.store";
import { paymentService } from "@/services/payment.service";
import { useCurrencyStore } from "@/store/currency.store";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

export default function CheckoutPage() {
  const [clientSecret, setClientSecret] = useState("");
  const { cart, fetchCart } = useCartStore();
  const total = useCartTotal();
  const { currency, formatPrice } = useCurrencyStore();

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
        <h1 className="text-2xl font-bold mb-4">Votre panier est vide</h1>
        <p>Retournez sur le marketplace pour ajouter des articles.</p>
      </div>
    );
  }

  const appearance = {
    theme: "night" as const,
  };
  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8 text-center">Paiement</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Order Summary */}
        <div className="order-2 lg:order-1">
          <Card>
            <CardHeader>
              <CardTitle>Résumé de la commande</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {cart.cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4"
                  >
                    <div className="relative w-16 h-24 flex-shrink-0">
                      {item.listing.pokemonCard.image ? (
                        <Image
                          src={item.listing.pokemonCard.image + "/high.png"}
                          alt={item.listing.pokemonCard.name || "Carte"}
                          fill
                          className="object-contain rounded"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted rounded flex items-center justify-center text-xs">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {item.listing.pokemonCard.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.listing.pokemonCard.set?.name}
                      </p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-sm text-muted-foreground">
                          Qté: {item.quantity}
                        </span>
                        <span className="font-medium">
                          {formatPrice(
                            item.listing.price * item.quantity,
                            item.listing.currency,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span>{formatPrice(total, currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Livraison</span>
                  <span>Gratuit</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatPrice(total, currency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Checkout Form */}
        <div className="order-1 lg:order-2">
          <Card>
            <CardContent className="pt-6">
              {clientSecret ? (
                <Elements
                  options={options}
                  stripe={stripePromise}
                >
                  <CheckoutForm />
                </Elements>
              ) : (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
