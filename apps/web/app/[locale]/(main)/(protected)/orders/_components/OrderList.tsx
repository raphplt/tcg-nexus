"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Package, Truck } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useCurrencyStore } from "@/store/currency.store";
import { Order } from "@/types/order";
import {
  getFulfillmentColor,
  getFulfillmentLabel,
  getOrderItemImage,
  getOrderItemUrl,
  getOrderStatusColor,
  getOrderStatusLabel,
} from "@/utils/order";

interface OrderListProps {
  orders: Order[];
}

export default function OrderList({ orders }: OrderListProps) {
  const { formatExact } = useCurrencyStore();

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">
            Vous n&apos;avez pas encore passé de commande.
          </p>
          <Link href="/marketplace" className="text-primary hover:underline">
            Découvrir la marketplace
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id} className="overflow-hidden">
          <CardHeader className="bg-muted/50 p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/orders/${order.id}`}
                    className="font-semibold hover:text-primary"
                  >
                    Commande #{order.id}
                  </Link>
                  <Badge className={getOrderStatusColor(order.status)}>
                    {getOrderStatusLabel(order.status)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Passée le{" "}
                  {format(new Date(order.createdAt), "d MMMM yyyy 'à' HH:mm", {
                    locale: fr,
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">
                  {formatExact(order.totalAmount, order.currency)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {order.orderItems.length} article
                  {order.orderItems.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Accordion type="single" collapsible>
              <AccordionItem value={`order-${order.id}`} className="border-b-0">
                <AccordionTrigger className="px-4 py-2 hover:no-underline">
                  <span className="text-sm text-muted-foreground">
                    Voir les détails
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="divide-y">
                    {order.orderItems.map((item) => {
                      const productUrl = getOrderItemUrl(item);

                      return (
                        <div
                          key={item.id}
                          className="p-4 flex items-start gap-4"
                        >
                          <div className="relative w-16 h-24 shrink-0">
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
                                className="font-medium hover:text-primary truncate block"
                              >
                                {item.productName}
                              </Link>
                            ) : (
                              <span className="font-medium truncate block">
                                {item.productName}
                              </span>
                            )}
                            {item.productSetName && (
                              <p className="text-sm text-muted-foreground">
                                {item.productSetName}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                              {item.productCondition && (
                                <Badge variant="outline" className="text-xs">
                                  {item.productCondition}
                                </Badge>
                              )}
                              <span className="text-sm text-muted-foreground">
                                x{item.quantity}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                Vendu par {item.sellerName}
                              </span>
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
                                  {item.carrier} · {item.trackingNumber}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right font-medium">
                            {formatExact(item.unitPrice, order.currency)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
