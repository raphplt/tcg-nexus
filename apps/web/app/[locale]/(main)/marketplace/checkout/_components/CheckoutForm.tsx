"use client";

import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { paymentService } from "@/services/payment.service";
import { useCartStore } from "@/store/cart.store";
import { useCurrencyStore } from "@/store/currency.store";

interface Props {
  orderId: number;
  amount: number;
  currency: string;
  shippingAddress: string;
}

export default function CheckoutForm({
  orderId,
  amount,
  currency,
  shippingAddress,
}: Props) {
  const t = useTranslations("CheckoutForm");
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { formatExact } = useCurrencyStore();
  const { fetchCart } = useCartStore();

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setShowConfirm(true);
  };

  const handleConfirmPayment = async () => {
    setShowConfirm(false);
    if (!stripe || !elements) return;

    setIsLoading(true);
    setMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders/${orderId}`,
      },
      redirect: "if_required",
    });

    if (error) {
      setMessage(error.message ?? t("unexpectedError"));
      setIsLoading(false);
      return;
    }

    if (paymentIntent?.status !== "succeeded") {
      setMessage(
        `Le paiement n'a pas abouti (statut : ${paymentIntent?.status ?? "inconnu"}). Votre commande reste en attente.`,
      );
      setIsLoading(false);
      return;
    }

    try {
      await paymentService.confirmOrder(orderId);
      await fetchCart();
      toast.success(t("orderConfirmed"));
      router.push(`/orders/${orderId}`);
    } catch {
      toast.success(t("paymentReceived"));
      router.push(`/orders/${orderId}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-md border bg-muted/40 p-3 text-sm">
        <p className="font-medium">Livraison à</p>
        <p className="text-muted-foreground">{shippingAddress}</p>
      </div>

      <PaymentElement id="payment-element" />

      {message && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/50 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <Button disabled={isLoading || !stripe || !elements} className="w-full">
        {isLoading ? "Traitement..." : `Payer ${formatExact(amount, currency)}`}
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmPayment")}</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de payer{" "}
              <span className="font-semibold text-foreground">
                {formatExact(amount, currency)}
              </span>{" "}
              pour la commande #{orderId}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPayment}>
              {t("confirmPayment")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
