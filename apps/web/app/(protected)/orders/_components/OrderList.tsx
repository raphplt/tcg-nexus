"use client";

import { Order, OrderStatus } from "@/types/order";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useCurrencyStore } from "@/store/currency.store";
import Image from "next/image";
import { getCardImage } from "@/utils/images";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface OrderListProps {
  orders: Order[];
}

export default function OrderList({ orders }: OrderListProps) {
  const { formatPrice } = useCurrencyStore();

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PAID:
        return "bg-green-500 hover:bg-green-600";
      case OrderStatus.PENDING:
        return "bg-yellow-500 hover:bg-yellow-600";
      case OrderStatus.SHIPPED:
        return "bg-blue-500 hover:bg-blue-600";
      case OrderStatus.CANCELLED:
        return "bg-red-500 hover:bg-red-600";
      case OrderStatus.REFUNDED:
        return "bg-gray-500 hover:bg-gray-600";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PAID:
        return "Payée";
      case OrderStatus.PENDING:
        return "En attente";
      case OrderStatus.SHIPPED:
        return "Expédiée";
      case OrderStatus.CANCELLED:
        return "Annulée";
      case OrderStatus.REFUNDED:
        return "Remboursée";
      default:
        return status;
    }
  };

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Vous n'avez pas encore passé de commande.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card
          key={order.id}
          className="overflow-hidden"
        >
          <CardHeader className="bg-muted/50 p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Commande #{order.id}</span>
                  <Badge className={getStatusColor(order.status)}>
                    {getStatusLabel(order.status)}
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
                  {formatPrice(order.totalAmount, order.currency)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {order.orderItems.length} article
                  {order.orderItems.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Accordion
              type="single"
              collapsible
            >
              <AccordionItem
                value={`order-${order.id}`}
                className="border-b-0"
              >
                <AccordionTrigger className="px-4 py-2 hover:no-underline">
                  <span className="text-sm text-muted-foreground">
                    Voir les détails
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="divide-y">
                    {order.orderItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 flex items-center gap-4"
                      >
                        <div className="relative w-16 h-24 flex-shrink-0">
                          <Image
                            src={getCardImage(item.listing.pokemonCard)}
                            alt={item.listing.pokemonCard.name || "Carte"}
                            fill
                            className="object-contain rounded"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/marketplace/cards/${item.listing.pokemonCard.id}`}
                            className="font-medium hover:text-primary truncate block"
                          >
                            {item.listing.pokemonCard.name}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {item.listing.pokemonCard.set?.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className="text-xs"
                            >
                              {item.listing.cardState}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              x{item.quantity}
                            </span>
                          </div>
                        </div>
                        <div className="text-right font-medium">
                          {formatPrice(item.unitPrice, order.currency)}
                        </div>
                      </div>
                    ))}
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
