"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Loader2, MapPin, Store, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { paymentService } from "@/services/payment.service";
import { useCurrencyStore } from "@/store/currency.store";
import { Order, OrderItem, OrderStatus } from "@/types/order";
import {
  getFulfillmentColor,
  getFulfillmentLabel,
  getOrderItemImage,
  getOrderItemUrl,
  getOrderStatusColor,
  getOrderStatusLabel,
} from "@/utils/order";

function groupBySeller(items: OrderItem[]): Map<string, OrderItem[]> {
  const groups = new Map<string, OrderItem[]>();
  for (const item of items) {
    const key = item.sellerName || "Vendeur";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { formatExact } = useCurrencyStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    paymentService
      .getOrderById(Number(id))
      .then(setOrder)
      .catch(() =>
        setError("Cette commande est introuvable ou ne vous appartient pas."),
      )
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto max-w-3xl py-10">
        <Card className="border-destructive">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-destructive">
              {error ?? "Commande introuvable."}
            </p>
            <Button variant="outline" asChild>
              <Link href="/orders">Retour à mes commandes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sellerGroups = groupBySeller(order.orderItems);

  return (
    <div className="container mx-auto max-w-4xl py-10 space-y-6">
      <Link
        href="/orders"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour à mes commandes
      </Link>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-2xl">Commande #{order.id}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Passée le{" "}
                {format(new Date(order.createdAt), "d MMMM yyyy 'à' HH:mm", {
                  locale: fr,
                })}
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <Badge className={getOrderStatusColor(order.status)}>
                {getOrderStatusLabel(order.status)}
              </Badge>
              <span className="text-2xl font-bold">
                {formatExact(order.totalAmount, order.currency)}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {order.status === OrderStatus.PENDING && (
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
              Le paiement de cette commande n&apos;est pas encore confirmé. Les
              articles restent réservés le temps de finaliser le règlement.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <h3 className="flex items-center gap-2 font-semibold">
                <MapPin className="h-4 w-4" />
                Adresse de livraison
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {order.shippingAddress || "Non renseignée"}
              </p>
            </div>
            <div className="space-y-1 sm:text-right">
              <h3 className="font-semibold">Destinataire</h3>
              <p className="text-sm text-muted-foreground">
                {order.buyer?.firstName} {order.buyer?.lastName}
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-6">
            {[...sellerGroups.entries()].map(([sellerName, items]) => (
              <div key={sellerName} className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Store className="h-4 w-4" />
                  Vendu par {sellerName}
                </h3>

                <div className="rounded-md border divide-y">
                  {items.map((item) => {
                    const productUrl = getOrderItemUrl(item);

                    return (
                      <div key={item.id} className="flex gap-4 p-4">
                        <div className="relative h-24 w-16 shrink-0">
                          <Image
                            src={getOrderItemImage(item)}
                            alt={item.productName}
                            fill
                            className="object-contain rounded"
                          />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          {productUrl ? (
                            <Link
                              href={productUrl}
                              className="font-medium hover:text-primary"
                            >
                              {item.productName}
                            </Link>
                          ) : (
                            <span className="font-medium">
                              {item.productName}
                            </span>
                          )}

                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            {item.productSetName && (
                              <span>{item.productSetName}</span>
                            )}
                            {item.productCondition && (
                              <Badge variant="outline" className="text-xs">
                                {item.productCondition}
                              </Badge>
                            )}
                            {item.productLanguage && (
                              <Badge variant="outline" className="text-xs">
                                {item.productLanguage.toUpperCase()}
                              </Badge>
                            )}
                            <span>x{item.quantity}</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <Badge
                              className={getFulfillmentColor(
                                item.fulfillmentStatus,
                              )}
                            >
                              {getFulfillmentLabel(item.fulfillmentStatus)}
                            </Badge>
                            {item.trackingNumber && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Truck className="h-3 w-3" />
                                {item.carrier} · suivi {item.trackingNumber}
                              </span>
                            )}
                            {item.shippedAt && (
                              <span className="text-xs text-muted-foreground">
                                Expédiée le{" "}
                                {format(new Date(item.shippedAt), "d MMM yyyy", {
                                  locale: fr,
                                })}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-medium">
                            {formatExact(
                              item.unitPrice * item.quantity,
                              order.currency,
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatExact(item.unitPrice, order.currency)}{" "}
                            l&apos;unité
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sous-total</span>
              <span>{formatExact(order.totalAmount, order.currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Livraison</span>
              <span>Offerte</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span>{formatExact(order.totalAmount, order.currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
