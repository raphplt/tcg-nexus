"use client";

import { useTranslations } from "next-intl";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { AlertCircle, Clock, Loader2, XCircle } from "lucide-react";
import { SmartImage } from "@/components/ui/SmartImage";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useRef, useState } from "react";
import { getConditionLabel } from "@/app/[locale]/(main)/marketplace/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckoutSession,
  PendingCheckoutSession,
  paymentService,
} from "@/services/payment.service";
import { useCartStore, useCartTotal } from "@/store/cart.store";
import { useCurrencyStore } from "@/store/currency.store";
import { getCardImage } from "@/utils/images";
import { getSealedImageUrl, SEALED_PLACEHOLDER } from "@/utils/sealedImage";
import { estimateShipping } from "@/utils/shipping";
import CheckoutForm from "./_components/CheckoutForm";
import ShippingAddressForm from "./_components/ShippingAddressForm";

const publishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  (process.env.NODE_ENV === "test" ? "pk_test" : undefined);
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export default function CheckoutPage() {
  const t = useTranslations("Checkout");
  const router = useRouter();
  const { cart, isLoading, fetchCart } = useCartStore();
  const total = useCartTotal();
  const { formatExact, currency } = useCurrencyStore();

  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [pendingSession, setPendingSession] =
    useState<PendingCheckoutSession | null>(null);
  const [shippingAddress, setShippingAddress] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const attemptKeyRef = useRef<string>(
    `chk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  );

  useEffect(() => {
    let isMounted = true;

    const initCheckout = async () => {
      try {
        const pending = await paymentService.getPendingCheckout();
        if (isMounted && pending) {
          setPendingSession(pending);
          setSession(pending);
          setShippingAddress(pending.shippingAddress);
        }
      } catch {
        // Fallback to fresh cart checkout
      }
    };

    initCheckout();
    fetchCart();

    return () => {
      isMounted = false;
    };
  }, [fetchCart]);

  useEffect(() => {
    const expiresAt = pendingSession?.reservationExpiresAt;
    if (!expiresAt) {
      setRemainingSeconds(null);
      return;
    }

    const updateTimer = () => {
      const diffMs = new Date(expiresAt).getTime() - Date.now();
      const secs = Math.max(0, Math.floor(diffMs / 1000));
      setRemainingSeconds(secs);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [pendingSession?.reservationExpiresAt]);

  const handleStartCheckout = async (address: string) => {
    setIsStarting(true);
    setError(null);

    try {
      const result = await paymentService.startCheckout({
        shippingAddress: address,
        attemptKey: attemptKeyRef.current,
      });
      setShippingAddress(address);
      setSession(result);

      // Hydrate items and reservation countdown from authoritative server state
      const pending = await paymentService.getPendingCheckout();
      if (pending) {
        setPendingSession(pending);
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || t("startError");
      setError(message);
    } finally {
      setIsStarting(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!session) return;
    setIsCancelling(true);
    setError(null);

    try {
      await paymentService.cancelPendingOrder(session.orderId);
      setSession(null);
      setPendingSession(null);
      setRemainingSeconds(null);
      await fetchCart();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Erreur lors de l'annulation de la commande";
      setError(message);
    } finally {
      setIsCancelling(false);
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

  // Explicit expired reservation state
  if (session && remainingSeconds === 0) {
    return (
      <div className="container mx-auto max-w-xl py-16 text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
          <XCircle className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold">{t("expiredTitle")}</h1>
        <p className="text-muted-foreground">{t("expiredMessage")}</p>
        <Button
          onClick={() => {
            setSession(null);
            setPendingSession(null);
            router.push("/marketplace");
          }}
        >
          {t("returnToMarketplace")}
        </Button>
      </div>
    );
  }

  const cartItems = cart?.cartItems ?? [];

  if (!session && cartItems.length === 0) {
    return (
      <div className="container mx-auto py-10 text-center space-y-4">
        <h1 className="text-2xl font-bold">{t("emptyCartTitle")}</h1>
        <p className="text-muted-foreground">{t("emptyCart")}</p>
        <Button onClick={() => router.push("/marketplace")}>
          {t("browseMarketplace")}
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
            <p>{t("stripeMissing")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const estimatedShipping = estimateShipping(cartItems);
  const displayShipping = session ? session.shippingAmount : estimatedShipping;
  const displayAmount = session ? session.amount : total + estimatedShipping;
  const displayCurrency = session ? session.currency : currency;

  const formatTimer = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8 text-center">{t("title")}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <div className="order-2 lg:order-1">
          <Card>
            <CardHeader>
              <CardTitle>{t("orderSummary")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Authoritative reservation countdown and cancel affordance */}
              {session && remainingSeconds !== null && remainingSeconds > 0 && (
                <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-600 dark:text-amber-400">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>
                      {t("reservationTimer", {
                        time: formatTimer(remainingSeconds),
                      })}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelReservation}
                    disabled={isCancelling}
                    className="text-xs hover:text-destructive h-7 px-2"
                  >
                    {isCancelling ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      t("cancelReservation")
                    )}
                  </Button>
                </div>
              )}

              {/* Items summary list */}
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {pendingSession && pendingSession.items.length > 0
                  ? pendingSession.items.map((item) => (
                      <div key={item.id} className="flex gap-4">
                        <div className="relative w-16 h-24 shrink-0">
                          <SmartImage
                            src={
                              item.productImage ||
                              (item.productKind === "sealed"
                                ? SEALED_PLACEHOLDER
                                : "/images/carte-pokemon-dos.jpg")
                            }
                            fallbackSrc={SEALED_PLACEHOLDER}
                            alt={item.productName || "Produit"}
                            className="object-contain rounded"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {item.productName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.productCondition || item.productSetName || ""}
                          </p>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-sm text-muted-foreground">
                              Qté: {item.quantity}
                            </span>
                            <span className="font-medium">
                              {formatExact(
                                item.unitPrice * item.quantity,
                                displayCurrency,
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  : cartItems.map((item) => {
                      const isSealed =
                        item.listing.productKind === "sealed" ||
                        !!item.listing.sealedProduct;
                      const imageUrl = isSealed
                        ? getSealedImageUrl(item.listing.sealedProduct) ||
                          SEALED_PLACEHOLDER
                        : getCardImage(item.listing.pokemonCard, "low");
                      const productName = isSealed
                        ? item.listing.sealedProduct?.name || t("sealedProduct")
                        : item.listing.pokemonCard?.name;
                      const productSub = isSealed
                        ? getConditionLabel(item.listing.sealedCondition) ||
                          "Neuf"
                        : item.listing.pokemonCard?.set?.name;

                      return (
                        <div key={item.id} className="flex gap-4">
                          <div className="relative w-16 h-24 shrink-0">
                            <SmartImage
                              src={imageUrl}
                              fallbackSrc={SEALED_PLACEHOLDER}
                              alt={productName || "Produit"}
                              className="object-contain rounded"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {productName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {productSub}
                            </p>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-sm text-muted-foreground">
                                Qté: {item.quantity}
                              </span>
                              <span className="font-medium">
                                {formatExact(
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

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("subtotal")}</span>
                  <span>
                    {formatExact(
                      displayAmount - displayShipping,
                      displayCurrency,
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("shipping")}</span>
                  <span>
                    {displayShipping === 0
                      ? "Offerts"
                      : formatExact(displayShipping, displayCurrency)}
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-lg">
                  <span>{t("total")}</span>
                  <span>{formatExact(displayAmount, displayCurrency)}</span>
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
              {session && session.clientSecret ? (
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
