"use client";

import { useEffect, useState } from "react";
import { paymentService } from "@/services/payment.service";
import { Loader2, Package } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    paymentService
      .getMyOrders()
      .then(setOrders)
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container mx-auto py-10 text-center">
        <h1 className="text-2xl font-bold mb-4">No orders found</h1>
        <p>You haven't placed any orders yet.</p>
        <Link
          href="/marketplace"
          className="text-blue-500 hover:underline mt-4 inline-block"
        >
          Go to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>
      <div className="space-y-4">
        {orders.map((order) => (
          <Link
            href={`/marketplace/orders/${order.id}`}
            key={order.id}
            className="block"
          >
            <Card className="hover:bg-accent/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Order #{order.id}
                </CardTitle>
                <Badge
                  variant={order.status === "Paid" ? "default" : "secondary"}
                >
                  {order.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>{order.orderItems?.length || 0} items</span>
                  </div>
                  <div>
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: order.currency || "EUR",
                    }).format(order.totalAmount)}
                  </div>
                  <div>{format(new Date(order.createdAt), "PPP")}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
