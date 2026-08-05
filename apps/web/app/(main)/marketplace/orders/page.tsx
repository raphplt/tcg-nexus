"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { paymentService } from "@/services/payment.service";
import { useCartStore } from "@/store/cart.store";
import { Loader2, Package, Calendar, CreditCard } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import toast from "react-hot-toast";
import {
  clearCheckoutShippingAddress,
  loadCheckoutShippingAddress,
} from "../checkout/utils";
import { getStatusColor, getStatusLabel } from "./utils";

function OrdersPageFallback() {
  return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersPageFallback />}>
      <OrdersPageContent />
    </Suspense>
  );
}

function OrdersPageContent() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const clearCart = useCartStore((state) => state.clearCart);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const finalizedRef = useRef(false);

  const loadOrders = async () => {
    const data = await paymentService.getMyOrders();
    setOrders(data);
  };

  useEffect(() => {
    const paymentIntentId = searchParams.get("payment_intent");
    const redirectStatus = searchParams.get("redirect_status");

    const finalizeRedirectPayment = async () => {
      if (!paymentIntentId || finalizedRef.current) {
        setIsLoading(true);
        try {
          await loadOrders();
        } catch (err) {
          console.error(err);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      finalizedRef.current = true;
      setIsFinalizing(true);
      setIsLoading(true);

      try {
        if (redirectStatus && redirectStatus !== "succeeded") {
          toast.error("Le paiement n'a pas abouti. Votre panier est intact.");
        } else {
          const shippingAddress =
            loadCheckoutShippingAddress() || "Adresse non renseignée";

          try {
            await paymentService.createOrder({
              paymentIntentId,
              shippingAddress,
            });
            clearCheckoutShippingAddress();
            await clearCart();
            toast.success("Commande passée avec succès !");
          } catch (err: any) {
            const message = err?.response?.data?.message as string | undefined;
            // Idempotent: payment already converted (cart emptied) or refresh
            if (
              message?.toLowerCase().includes("cart is empty") ||
              message?.toLowerCase().includes("panier")
            ) {
              clearCheckoutShippingAddress();
              await fetchCart();
            } else {
              console.error(err);
              toast.error(
                message ||
                  "Paiement reçu mais création de commande échouée. Contactez le support.",
              );
            }
          }
        }

        await loadOrders();
        router.replace("/marketplace/orders");
      } catch (err) {
        console.error(err);
      } finally {
        setIsFinalizing(false);
        setIsLoading(false);
      }
    };

    void finalizeRedirectPayment();
  }, [searchParams, clearCart, fetchCart, router]);

  if (isLoading || isFinalizing) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <Loader2 className="h-8 w-8 animate-spin" />
        {isFinalizing && (
          <p className="text-sm text-muted-foreground">
            Finalisation de votre commande...
          </p>
        )}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container mx-auto py-10 text-center">
        <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-2xl font-bold mb-4">Aucune commande trouvée</h1>
        <p className="text-muted-foreground mb-6">
          Vous n&apos;avez pas encore passé de commande.
        </p>
        <Button asChild>
          <Link href="/marketplace">Découvrir le marketplace</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mes Commandes</h1>
        <p className="text-muted-foreground">
          Retrouvez l&apos;historique de toutes vos commandes
        </p>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <Link
            href={`/marketplace/orders/${order.id}`}
            key={order.id}
            className="block"
          >
            <Card className="hover:shadow-lg transition-all duration-200 hover:border-primary/50">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      Commande #{order.id}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(
                          new Date(order.createdAt),
                          "d MMMM yyyy 'à' HH:mm",
                          { locale: fr },
                        )}
                      </span>
                    </div>
                  </div>
                  <Badge className={getStatusColor(order.status)}>
                    {getStatusLabel(order.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {order.orderItems?.length || 0} article
                        {(order.orderItems?.length || 0) > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Dans cette commande
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: order.currency || "EUR",
                        }).format(order.totalAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Montant total
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      Voir les détails
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
