"use client";

import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  FolderPlus,
  Loader2,
  MapPin,
  RotateCcw,
  Sparkles,
  Star,
  Store,
  Truck,
} from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ReceiptToCollectionModal } from "./_components/ReceiptToCollectionModal";
import { SellerReviewModal } from "./_components/SellerReviewModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { paymentService } from "@/services/payment.service";
import { useCartStore } from "@/store/cart.store";
import { useCurrencyStore } from "@/store/currency.store";
import {
  ClaimCategory,
  FulfillmentStatus,
  Order,
  OrderItem,
  OrderStatus,
} from "@/types/order";
import {
  getFulfillmentColor,
  getFulfillmentKey,
  getOrderItemImage,
  getOrderItemUrl,
  getOrderStatusColor,
  getOrderStatusKey,
} from "@/utils/order";
import { formatHandlingTime } from "@/utils/shipping";
import { getCarrierTrackingUrl } from "@/utils/tracking";

function groupBySeller(items: OrderItem[]): Map<string, OrderItem[]> {
  const groups = new Map<string, OrderItem[]>();
  for (const item of items) {
    const key = item.sellerName || "Vendeur";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

export default function OrderDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <OrderDetailsContent />
    </Suspense>
  );
}

function OrderDetailsContent() {
  const t = useTranslations("OrderDetail");
  const tStatus = useTranslations("OrderStatus");
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { formatExact } = useCurrencyStore();
  const { fetchCart } = useCartStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmingItemId, setConfirmingItemId] = useState<number | null>(null);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [selectedClaimItem, setSelectedClaimItem] = useState<OrderItem | null>(
    null,
  );
  const [claimCategory, setClaimCategory] = useState<ClaimCategory>(
    ClaimCategory.DAMAGED_ITEM,
  );
  const [claimDescription, setClaimDescription] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimSuccessMessage, setClaimSuccessMessage] = useState<string | null>(
    null,
  );
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [reviewItem, setReviewItem] = useState<OrderItem | null>(null);

  const cameBackFromStripe = !!searchParams.get("payment_intent");
  const redirectFailed =
    !!searchParams.get("redirect_status") &&
    searchParams.get("redirect_status") !== "succeeded";

  const loadOrder = async () => {
    const orderId = Number(id);

    if (cameBackFromStripe && !redirectFailed) {
      try {
        await paymentService.confirmOrder(orderId);
        await fetchCart();
      } catch {}
    }

    try {
      const data = await paymentService.getOrderById(orderId);
      setOrder(data);
    } catch {
      setError(t("notFound"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id, cameBackFromStripe, redirectFailed]);

  const handleConfirmReceipt = async (itemId: number) => {
    if (!order) return;
    setConfirmingItemId(itemId);
    try {
      await paymentService.confirmItemReceipt(order.id, itemId);
      await loadOrder();
    } catch {
      alert(t("confirmReceiptError"));
    } finally {
      setConfirmingItemId(null);
    }
  };

  const handleSubmitClaim = async () => {
    if (!order || !selectedClaimItem || !claimDescription.trim()) return;
    setSubmittingClaim(true);
    try {
      await paymentService.createItemClaim(order.id, selectedClaimItem.id, {
        claimCategory,
        subject: `Réclamation commande #${order.id} - ${selectedClaimItem.productName}`,
        message: claimDescription.trim(),
      });
      setClaimSuccessMessage(t("claimSubmitted"));
      setTimeout(() => {
        setClaimSuccessMessage(null);
        setClaimDialogOpen(false);
        setSelectedClaimItem(null);
        setClaimDescription("");
      }, 1500);
    } catch {
      alert("Erreur lors de la soumission de la réclamation");
    } finally {
      setSubmittingClaim(false);
    }
  };

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
              <Link href="/orders">{t("backToOrders")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sellerGroups = groupBySeller(order.orderItems);
  const totalRefunded =
    order.refundOperations?.reduce((sum, op) => sum + Number(op.amount), 0) ??
    0;
  const hasDeliveredItems = (order.orderItems || []).some(
    (it) => it.fulfillmentStatus === FulfillmentStatus.DELIVERED,
  );

  return (
    <div className="container mx-auto max-w-3xl py-10 space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link href="/orders">
          <ArrowLeft className="h-4 w-4" />
          {t("backToOrders")}
        </Link>
      </Button>

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
                {tStatus(getOrderStatusKey(order.status))}
              </Badge>
              <span className="text-2xl font-bold">
                {formatExact(order.totalAmount, order.currency)}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {hasDeliveredItems && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <FolderPlus className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold">
                    Articles reçus prêts pour votre collection
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Intégrez directement vos cartes livrées dans votre collection avec leur provenance certifiée.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setIsReceiptModalOpen(true)}
                className="gap-1.5 shrink-0"
              >
                <Sparkles className="h-4 w-4" />
                Ajouter à ma collection
              </Button>
            </div>
          )}

          {order.status === OrderStatus.PENDING && (
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
              {t("paymentPending")}
            </div>
          )}

          {totalRefunded > 0 && (
            <div className="rounded-md border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                  <RotateCcw className="h-4 w-4" />
                  {t("refunds")}
                </span>
                <span className="font-bold text-sm text-amber-800 dark:text-amber-300">
                  {t("refundedAmount")}:{" "}
                  {formatExact(totalRefunded, order.currency)}
                </span>
              </div>
              {order.refundOperations?.map((op) => (
                <div
                  key={op.id}
                  className="text-xs text-muted-foreground flex justify-between border-t pt-1.5 border-amber-200/50"
                >
                  <span>{op.reason || "Remboursement"}</span>
                  <span className="font-medium">
                    {formatExact(op.amount, op.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <h3 className="flex items-center gap-2 font-semibold">
                <MapPin className="h-4 w-4" />
                {t("shippingAddress")}
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {order.shippingAddress || t("notProvided")}
              </p>
            </div>
            <div className="space-y-1 sm:text-right">
              <h3 className="font-semibold">{t("recipient")}</h3>
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
                    const trackingUrl = getCarrierTrackingUrl(
                      item.carrier,
                      item.trackingNumber,
                    );

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row gap-4 p-4"
                      >
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
                              {tStatus(
                                getFulfillmentKey(item.fulfillmentStatus),
                              )}
                            </Badge>
                            {item.trackingNumber && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Truck className="h-3 w-3" />
                                {trackingUrl ? (
                                  <a
                                    href={trackingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline hover:text-foreground inline-flex items-center gap-1 font-medium"
                                  >
                                    {item.carrier} · {item.trackingNumber}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <span>
                                    {item.carrier} · suivi {item.trackingNumber}
                                  </span>
                                )}
                              </span>
                            )}
                            {item.shippedAt ? (
                              <span className="text-xs text-muted-foreground">
                                Expédiée le{" "}
                                {format(
                                  new Date(item.shippedAt),
                                  "d MMM yyyy",
                                  {
                                    locale: fr,
                                  },
                                )}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {formatHandlingTime(item.handlingTimeDays)}
                              </span>
                            )}
                          </div>

                          {(item as any).listingPhotoUrls && (item as any).listingPhotoUrls.length > 0 && (
                            <div className="pt-2 space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">
                                Photos certifiées du vendeur :
                              </p>
                              <div className="flex gap-2 overflow-x-auto py-1">
                                {(item as any).listingPhotoUrls.map((url: string, idx: number) => (
                                  <a
                                    key={idx}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="relative h-12 w-12 shrink-0 rounded border overflow-hidden hover:opacity-80 transition-opacity"
                                  >
                                    <Image
                                      src={url}
                                      alt={`Photo ${idx + 1}`}
                                      fill
                                      className="object-cover"
                                    />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {(item as any).listingDefects && (item as any).listingDefects.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-xs font-medium text-muted-foreground">
                                Défauts déclarés :
                              </span>
                              {(item as any).listingDefects.map((defect: string, idx: number) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-xs border-amber-300 text-amber-800 dark:text-amber-300"
                                >
                                  {defect}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-2 pt-2">
                            {item.fulfillmentStatus ===
                              FulfillmentStatus.SHIPPED && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50 dark:text-green-400"
                                onClick={() => handleConfirmReceipt(item.id)}
                                disabled={confirmingItemId === item.id}
                              >
                                {confirmingItemId === item.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                                )}
                                {t("confirmReceipt")}
                              </Button>
                            )}

                            {item.fulfillmentStatus ===
                              FulfillmentStatus.DELIVERED && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:text-amber-400"
                                onClick={() => setReviewItem(item)}
                              >
                                <Star className="h-3 w-3 mr-1 fill-amber-400 text-amber-400" />
                                Évaluer le vendeur
                              </Button>
                            )}

                            {(item.fulfillmentStatus ===
                              FulfillmentStatus.SHIPPED ||
                              item.fulfillmentStatus ===
                                FulfillmentStatus.DELIVERED) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setSelectedClaimItem(item);
                                  setClaimCategory(ClaimCategory.DAMAGED_ITEM);
                                  setClaimDescription("");
                                  setClaimDialogOpen(true);
                                }}
                              >
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {t("openClaim")}
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0">
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
              <span className="text-muted-foreground">{t("subtotal")}</span>
              <span>
                {formatExact(
                  order.totalAmount - order.shippingAmount,
                  order.currency,
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("shipping")}</span>
              <span>
                {order.shippingAmount === 0
                  ? "Offerts"
                  : formatExact(order.shippingAmount, order.currency)}
              </span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>{t("total")}</span>
              <span>{formatExact(order.totalAmount, order.currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("openClaim")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {claimSuccessMessage ? (
              <div className="rounded-md bg-green-500/10 border border-green-500/30 p-3 text-sm text-green-700 dark:text-green-300">
                {claimSuccessMessage}
              </div>
            ) : (
              <>
                <div className="text-sm font-medium">
                  {selectedClaimItem?.productName}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    {t("claimCategory")}
                  </label>
                  <select
                    value={claimCategory}
                    onChange={(e) =>
                      setClaimCategory(e.target.value as ClaimCategory)
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value={ClaimCategory.DAMAGED_ITEM}>
                      {t("claimDamaged")}
                    </option>
                    <option value={ClaimCategory.MISSING_ITEM}>
                      {t("claimNotReceived")}
                    </option>
                    <option value={ClaimCategory.WRONG_ITEM}>
                      {t("claimWrongItem")}
                    </option>
                    <option value={ClaimCategory.NON_DELIVERY}>
                      {t("claimNotReceived")}
                    </option>
                    <option value={ClaimCategory.GENERAL}>
                      {t("claimOther")}
                    </option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    {t("claimDescription")}
                  </label>
                  <Textarea
                    placeholder={t("claimDescriptionPlaceholder")}
                    value={claimDescription}
                    onChange={(e) => setClaimDescription(e.target.value)}
                    rows={4}
                  />
                </div>
              </>
            )}
          </div>
          {!claimSuccessMessage && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setClaimDialogOpen(false)}
                disabled={submittingClaim}
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={handleSubmitClaim}
                disabled={submittingClaim || !claimDescription.trim()}
              >
                {submittingClaim && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {t("submitClaim")}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <ReceiptToCollectionModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        orderId={order.id}
        onImportSuccess={loadOrder}
      />

      <SellerReviewModal
        isOpen={!!reviewItem}
        onClose={() => setReviewItem(null)}
        orderId={order.id}
        item={reviewItem}
        onReviewSuccess={loadOrder}
      />
    </div>
  );
}
