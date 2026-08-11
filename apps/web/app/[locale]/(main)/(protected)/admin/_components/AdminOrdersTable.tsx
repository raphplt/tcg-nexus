"use client";

import { ArrowLeft, ArrowRight, Eye, PenSquare } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminOrderFilters, adminService } from "@/services/admin.service";
import { Order, OrderStatus } from "@/types/order";
import { PaginatedResult } from "@/types/pagination";
import { getFulfillmentKey } from "@/utils/order";
import { useLocale, useTranslations } from "next-intl";

const statusOptions = Object.values(OrderStatus);

const statusVariant: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  [OrderStatus.PENDING]: "secondary",
  [OrderStatus.PAID]: "default",
  [OrderStatus.SHIPPED]: "outline",
  [OrderStatus.DELIVERED]: "default",
  [OrderStatus.CANCELLED]: "destructive",
  [OrderStatus.REFUNDED]: "destructive",
};

interface StatusModalState {
  open: boolean;
  order: Order | null;
  status: OrderStatus;
}

export function AdminOrdersTable() {
  const t = useTranslations("AdminOrders");
  const tStatus = useTranslations("OrderStatus");
  const locale = useLocale();
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
      setError(t("loadError"));
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
                order.id === updated.id
                  ? { ...order, status: updated.status }
                  : order,
              ),
            }
          : prev,
      );
      toast.success(t("statusUpdated"));
      setStatusModal({ open: false, order: null, status: OrderStatus.PAID });
    } catch (err) {
      console.error("Unable to update order status", err);
      toast.error(t("updateFailed"));
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
          <CardTitle>{t("title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button variant="outline" onClick={() => refreshOrders()}>
          {t("reload")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{t("status")}</span>
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
                <SelectValue placeholder={t("allStatuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("all")}</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{t("buyer")}</span>
            <Input
              type="number"
              placeholder={t("buyerIdPlaceholder")}
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
            <span className="text-xs text-muted-foreground">{t("seller")}</span>
            <Input
              type="number"
              placeholder={t("sellerIdPlaceholder")}
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
                <TableHead>{t("buyer")}</TableHead>
                <TableHead>{t("total")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("date")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
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
                        {formatAmount(order.totalAmount)} {order.currency}
                      </span>
                    </TableCell>
                    <TableCell>{statusBadge(order.status)}</TableCell>
                    <TableCell>
                      {new Date(order.createdAt).toLocaleString(locale)}
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
                            <DialogTitle>
                              Détails commande #{order.id}
                            </DialogTitle>
                            <DialogDescription>
                              {t("detailsSubtitle")}
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
                                      <TableHead>{t("item")}</TableHead>
                                      <TableHead>{t("condition")}</TableHead>
                                      <TableHead>{t("seller")}</TableHead>
                                      <TableHead>{t("shipping")}</TableHead>
                                      <TableHead>{t("qty")}</TableHead>
                                      <TableHead>PU</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {/* Les lignes affichent l'instantané figé
                                        à l'achat : il reste exact même si
                                        l'annonce a changé depuis. */}
                                    {selectedOrder.orderItems.map((item) => (
                                      <TableRow key={item.id}>
                                        <TableCell>
                                          {item.productName}
                                        </TableCell>
                                        <TableCell>
                                          {item.productCondition ?? "—"}
                                        </TableCell>
                                        <TableCell>{item.sellerName}</TableCell>
                                        <TableCell>
                                          {tStatus(
                                            getFulfillmentKey(
                                              item.fulfillmentStatus,
                                            ),
                                          )}
                                        </TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>
                                          {formatAmount(item.unitPrice)}{" "}
                                          {selectedOrder.currency}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                              <div className="flex justify-end text-sm font-semibold">
                                Total :{" "}
                                {formatAmount(selectedOrder.totalAmount)}{" "}
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
                    {t("empty")}
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
              {t("previousPage")}
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
          setStatusModal((prev) => ({
            ...prev,
            open,
            order: open ? prev.order : null,
          }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("updateStatus")}</DialogTitle>
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
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setStatusModal({
                  open: false,
                  order: null,
                  status: OrderStatus.PAID,
                })
              }
            >
              Annuler
            </Button>
            <Button onClick={handleUpdateStatus}>{t("update")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
const formatAmount = (amount: number | string | undefined) => {
  const numeric = typeof amount === "number" ? amount : Number(amount ?? 0);
  return numeric.toFixed(2);
};
