"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { AlertCircle, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckoutSession, paymentService } from "@/services/payment.service";
import { useCartStore, useCartTotal } from "@/store/cart.store";
import { useCurrencyStore } from "@/store/currency.store";
import { getCardImage } from "@/utils/images";
import { getSealedImageUrl, getSealedName } from "@/utils/sealedImage";
import CheckoutForm from "./_components/CheckoutForm";
import ShippingAddressForm from "./_components/ShippingAddressForm";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, isLoading, fetchCart } = useCartStore();
  const total = useCartTotal();
  const { formatPrice, currency } = useCurrencyStore();

  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [shippingAddress, setShippingAddress] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleStartCheckout = async (address: string) => {
    setIsStarting(true);
    setError(null);

    try {
      const result = await paymentService.startCheckout({
        shippingAddress: address,
      });
      setShippingAddress(address);
      setSession(result);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        "Impossible de démarrer le paiement. Réessayez dans un instant.";
      setError(message);
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading && !session) {
    return (
      <div className="container mx-auto max-w-5xl py-10 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const cartItems = cart?.cartItems ?? [];

  // Une fois la commande créée, le panier est vidé : on ne redirige donc que
  // tant qu'aucune session de paiement n'est ouverte.
  if (!session && cartItems.length === 0) {
    return (
      <div className="container mx-auto py-10 text-center space-y-4">
        <h1 className="text-2xl font-bold">Votre panier est vide</h1>
        <p className="text-muted-foreground">
          Retournez sur la marketplace pour ajouter des articles.
        </p>
        <Button onClick={() => router.push("/marketplace")}>
          Découvrir la marketplace
        </Button>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="container mx-auto max-w-2xl py-10">
        <Card className="border-destructive">
          <CardContent className="flex items-start gap-3 p-6 text-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <p>
              Le paiement est momentanément indisponible : la configuration
              Stripe est manquante. Aucun montant n&apos;a été débité.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayAmount = session ? session.amount : total;
  const displayCurrency = session ? session.currency : currency;

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8 text-center">Paiement</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <div className="order-2 lg:order-1">
          <Card>
            <CardHeader>
              <CardTitle>Résumé de la commande</CardTitle>
            </CardHeader>
            <CardContent>
              {session ? (
                <p className="text-sm text-muted-foreground">
                  Commande #{session.orderId} créée. Les articles sont réservés
                  le temps de finaliser le paiement.
                </p>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {cartItems.map((item) => {
                    const isSealed =
                      item.listing.productKind === "sealed" ||
                      !!item.listing.sealedProduct;
                    const imageUrl = isSealed
                      ? getSealedImageUrl(item.listing.sealedProduct) ||
                        "/images/sealed-default.png"
                      : getCardImage(item.listing.pokemonCard);
                    const productName = isSealed
                      ? getSealedName(item.listing.sealedProduct) ||
                        "Produit scellé"
                      : item.listing.pokemonCard?.name;
                    const productSub = isSealed
                      ? item.listing.sealedCondition || "Neuf"
                      : item.listing.pokemonCard?.set?.name;

                    return (
                      <div key={item.id} className="flex gap-4">
                        <div className="relative w-16 h-24 shrink-0">
                          <Image
                            src={imageUrl}
                            alt={productName || "Produit"}
                            fill
                            className="object-contain rounded"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{productName}</p>
                          <p className="text-sm text-muted-foreground">
                            {productSub}
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
                    );
                  })}
                </div>
              )}

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span>{formatPrice(displayAmount, displayCurrency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Livraison</span>
                  <span>Offerte</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatPrice(displayAmount, displayCurrency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="order-1 lg:order-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {session ? "2. Paiement" : "1. Livraison"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {session ? (
                <Elements
                  options={{
                    clientSecret: session.clientSecret,
                    appearance: { theme: "night" as const },
                  }}
                  stripe={stripePromise}
                >
                  <CheckoutForm
                    orderId={session.orderId}
                    amount={session.amount}
                    currency={session.currency}
                    shippingAddress={shippingAddress}
                  />
                </Elements>
              ) : isStarting ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <ShippingAddressForm
                  onSubmit={handleStartCheckout}
                  isSubmitting={isStarting}
                  error={error}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
