"use client";

import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
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
  /** Commande déjà créée côté serveur, avec son stock réservé. */
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
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { formatPrice } = useCurrencyStore();
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

    // La commande existe déjà : en cas de redirection, l'acheteur revient sur
    // sa page de commande, que le webhook aura confirmée entre-temps.
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders/${orderId}`,
      },
      redirect: "if_required",
    });

    if (error) {
      setMessage(error.message ?? "Une erreur inattendue est survenue.");
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
      // Le serveur revérifie le paiement auprès de Stripe avant de valider.
      await paymentService.confirmOrder(orderId);
      await fetchCart();
      toast.success("Commande confirmée !");
      router.push(`/orders/${orderId}`);
    } catch {
      // Le paiement a réussi : la commande sera confirmée par le webhook
      // Stripe. Aucun risque de débit sans commande, elle existe déjà.
      toast.success("Paiement reçu, confirmation en cours.");
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
        {isLoading ? "Traitement..." : `Payer ${formatPrice(amount, currency)}`}
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le paiement</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de payer{" "}
              <span className="font-semibold text-foreground">
                {formatPrice(amount, currency)}
              </span>{" "}
              pour la commande #{orderId}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPayment}>
              Confirmer le paiement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
