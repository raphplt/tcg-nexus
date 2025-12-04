"use client";

import { useEffect, useMemo, useState } from "react";
import { adminService, AdminOrderFilters } from "@/services/admin.service";
import { Order, OrderStatus } from "@/types/order";
import { PaginatedResult } from "@/types/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft, ArrowRight, Eye, PenSquare } from "lucide-react";

const statusOptions = Object.values(OrderStatus);

const statusVariant: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  [OrderStatus.PENDING]: "secondary",
  [OrderStatus.PAID]: "default",
  [OrderStatus.SHIPPED]: "outline",
  [OrderStatus.CANCELLED]: "destructive",
  [OrderStatus.REFUNDED]: "destructive",
};

interface StatusModalState {
  open: boolean;
  order: Order | null;
  status: OrderStatus;
}

export function AdminOrdersTable() {
  const [filters, setFilters] = useState<AdminOrderFilters>({
    page: 1,
    limit: 10,
  });
  const [orders, setOrders] = useState<PaginatedResult<Order> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusModal, setStatusModal] = useState<StatusModalState>({
    open: false,
    order: null,
    status: OrderStatus.PAID,
  });

  const refreshOrders = async (overrides?: Partial<AdminOrderFilters>) => {
    setIsLoading(true);
    setError(null);
    try {
      const nextFilters = { ...filters, ...overrides };
      const response = await adminService.getOrders(nextFilters);
      setOrders(response);
      setFilters((prev) => ({ ...prev, ...overrides }));
    } catch (err) {
      console.error("Failed to load orders", err);
      setError("Impossible de charger les ventes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusBadge = (status: OrderStatus) => (
    <Badge variant={statusVariant[status] ?? "secondary"}>{status}</Badge>
  );

  const handleOpenStatusModal = (order: Order) => {
    setStatusModal({
      open: true,
      order,
      status: order.status,
    });
  };

  const handleUpdateStatus = async () => {
    if (!statusModal.order) return;
    try {
      const updated = await adminService.updateOrderStatus(
        statusModal.order.id,
        statusModal.status,
      );
      setOrders((prev) =>
        prev
          ? {
              ...prev,
              data: prev.data.map((order) =>
                order.id === updated.id ? { ...order, status: updated.status } : order,
              ),
            }
          : prev,
      );
      toast.success("Statut de commande mis à jour");
      setStatusModal({ open: false, order: null, status: OrderStatus.PAID });
    } catch (err) {
      console.error("Unable to update order status", err);
      toast.error("Mise à jour impossible");
    }
  };

  const paginationInfo = useMemo(() => {
    if (!orders) return null;
    const { currentPage, totalPages } = orders.meta;
    return { currentPage, totalPages };
  }, [orders]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Ventes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Suivez les commandes et mettez à jour leur statut.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refreshOrders()}
        >
          Recharger
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Statut</span>
            <Select
              value={filters.status ?? "ALL"}
              onValueChange={(value) =>
                refreshOrders({
                  status: value !== "ALL" ? (value as OrderStatus) : undefined,
                  page: 1,
                })
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem
                    key={status}
                    value={status}
                  >
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Acheteur</span>
            <Input
              type="number"
              placeholder="ID acheteur"
              className="w-40"
              value={filters.buyerId ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  buyerId: event.target.value
                    ? Number.parseInt(event.target.value, 10)
                    : undefined,
                }))
              }
              onBlur={() => refreshOrders({ page: 1 })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Vendeur</span>
            <Input
              type="number"
              placeholder="ID vendeur"
              className="w-40"
              value={filters.sellerId ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  sellerId: event.target.value
                    ? Number.parseInt(event.target.value, 10)
                    : undefined,
                }))
              }
              onBlur={() => refreshOrders({ page: 1 })}
            />
          </div>
        </div>

        {error && (
          <div className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Acheteur</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center"
                  >
                    <Spinner size="small" />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                orders?.data.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>
                          {order.buyer.firstName} {order.buyer.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {order.buyer.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">
                        {order.totalAmount.toFixed(2)} {order.currency}
                      </span>
                    </TableCell>
                    <TableCell>{statusBadge(order.status)}</TableCell>
                    <TableCell>
                      {new Date(order.createdAt).toLocaleString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Dialog
                        open={selectedOrder?.id === order.id}
                        onOpenChange={(open) =>
                          setSelectedOrder(open ? order : null)
                        }
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Voir commande ${order.id}`}
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Détails commande #{order.id}</DialogTitle>
                            <DialogDescription>
                              Articles, acheteur et transactions associées
                            </DialogDescription>
                          </DialogHeader>
                          {selectedOrder && (
                            <div className="space-y-3">
                              <div className="text-sm text-muted-foreground">
                                Acheteur : {selectedOrder.buyer.email}
                              </div>
                              <div className="rounded border">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Carte</TableHead>
                                      <TableHead>État</TableHead>
                                      <TableHead>Qté</TableHead>
                                      <TableHead>PU</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {selectedOrder.orderItems.map((item) => (
                                      <TableRow key={item.id}>
                                        <TableCell>
                                          {item.listing.pokemonCard.name}
                                        </TableCell>
                                        <TableCell>{item.listing.cardState}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>
                                          {item.unitPrice.toFixed(2)} {selectedOrder.currency}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                              <div className="flex justify-end text-sm font-semibold">
                                Total : {selectedOrder.totalAmount.toFixed(2)}{" "}
                                {selectedOrder.currency}
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Mettre à jour le statut de ${order.id}`}
                        onClick={() => handleOpenStatusModal(order)}
                      >
                        <PenSquare className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && orders?.data.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    Aucune vente trouvée avec ces filtres.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {paginationInfo && (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={paginationInfo.currentPage <= 1}
              onClick={() =>
                refreshOrders({
                  page: Math.max(1, (filters.page ?? 1) - 1),
                })
              }
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Page précédente
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {paginationInfo.currentPage} / {paginationInfo.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!orders?.meta.hasNextPage}
              onClick={() =>
                refreshOrders({
                  page: (filters.page ?? 1) + 1,
                })
              }
            >
              Page suivante
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog
        open={statusModal.open}
        onOpenChange={(open) =>
          setStatusModal((prev) => ({ ...prev, open, order: open ? prev.order : null }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mettre à jour le statut</DialogTitle>
            <DialogDescription>
              Choisissez le nouveau statut de la commande
              {statusModal.order ? ` #${statusModal.order.id}` : ""}.
            </DialogDescription>
          </DialogHeader>
          <Select
            value={statusModal.status}
            onValueChange={(value) =>
              setStatusModal((prev) => ({
                ...prev,
                status: value as OrderStatus,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem
                  key={status}
                  value={status}
                >
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setStatusModal({ open: false, order: null, status: OrderStatus.PAID })
              }
            >
              Annuler
            </Button>
            <Button onClick={handleUpdateStatus}>Mettre à jour</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
