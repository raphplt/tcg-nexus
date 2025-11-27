"use client";

import { useEffect, useState } from "react";
import { paymentService } from "@/services/payment.service";
import { Loader2, ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import Image from "next/image";

export default function OrderDetailsPage() {
  const params = useParams();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      paymentService
        .getOrderById(+params.id)
        .then(setOrder)
        .catch((err) => console.error(err))
        .finally(() => setIsLoading(false));
    }
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto py-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Order not found</h1>
        <Link
          href="/marketplace/orders"
          className="text-blue-500 hover:underline"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/marketplace/orders"
          className="flex items-center text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
        >
          <Printer className="mr-2 h-4 w-4" />
          Print Invoice
        </Button>
      </div>

      <Card
        className="mb-8"
        id="invoice-area"
      >
        <CardHeader className="border-b">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Invoice #{order.id}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Date: {format(new Date(order.createdAt), "PPP")}
              </p>
            </div>
            <div className="text-right">
              <h3 className="font-bold text-lg">TCG Nexus</h3>
              <p className="text-sm text-muted-foreground">
                123 Card Street
                <br />
                Paris, France
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-2">Bill To:</h4>
              <p className="text-sm">
                {order.buyer.firstName} {order.buyer.lastName}
                <br />
                {order.buyer.email}
              </p>
            </div>
            <div className="text-right">
              <h4 className="font-semibold mb-2">Payment Method:</h4>
              <p className="text-sm">
                Credit Card
                <br />
                Status: {order.status}
              </p>
            </div>
          </div>

          <table className="w-full mb-8">
            <thead>
              <tr className="border-b text-sm text-muted-foreground">
                <th className="text-left py-2">Item</th>
                <th className="text-center py-2">Quantity</th>
                <th className="text-right py-2">Unit Price</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.orderItems.map((item: any) => (
                <tr
                  key={item.id}
                  className="border-b"
                >
                  <td className="py-4">
                    <div className="flex items-center gap-4">
                      {item.listing.pokemonCard.image && (
                        <div className="relative h-12 w-8 hidden sm:block">
                          <Image
                            src={item.listing.pokemonCard.image}
                            alt={item.listing.pokemonCard.name}
                            fill
                            className="object-contain"
                          />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">
                          {item.listing.pokemonCard.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.listing.pokemonCard.rarity}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="text-center py-4">{item.quantity}</td>
                  <td className="text-right py-4">
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: order.currency || "EUR",
                    }).format(item.unitPrice)}
                  </td>
                  <td className="text-right py-4">
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: order.currency || "EUR",
                    }).format(item.unitPrice * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td
                  colSpan={3}
                  className="text-right py-4 font-semibold"
                >
                  Total
                </td>
                <td className="text-right py-4 font-bold text-lg">
                  {new Intl.NumberFormat("fr-FR", {
                    style: "currency",
                    currency: order.currency || "EUR",
                  }).format(order.totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="text-center text-sm text-muted-foreground mt-12">
            <p>Thank you for your business!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
