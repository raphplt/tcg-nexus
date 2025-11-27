"use client";

import { useEffect, useState } from "react";
import { paymentService } from "@/services/payment.service";
import { Order } from "@/types/order";
import OrderList from "./_components/OrderList";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await paymentService.getMyOrders();
        setOrders(data);
      } catch (err) {
        console.error("Failed to fetch orders", err);
        setError("Impossible de charger vos commandes. Veuillez réessayer plus tard.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Card className="border-destructive">
          <CardContent className="p-6 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Mes Commandes</h1>
      <OrderList orders={orders} />
    </div>
  );
}
