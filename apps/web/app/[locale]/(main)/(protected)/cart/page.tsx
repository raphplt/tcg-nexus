"use client";

import {
  AlertCircle,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getCardStateColor,
  getConditionLabel,
} from "@/app/[locale]/(main)/marketplace/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCartItemsCount,
  useCartStore,
  useCartTotal,
} from "@/store/cart.store";
import { useCurrencyStore } from "@/store/currency.store";
import { getCardImage } from "@/utils/images";
import {
  getSealedImageUrl,
  getSealedName,
  SEALED_PLACEHOLDER,
} from "@/utils/sealedImage";
import { estimateShipping } from "@/utils/shipping";

export default function CartPage() {
  const t = useTranslations("Cart");
  const router = useRouter();
  const { cart, isLoading, fetchCart, updateItem, removeItem, clearCart } =
    useCartStore();
  const { formatPrice, currency } = useCurrencyStore();
  const total = useCartTotal();
  const itemsCount = useCartItemsCount();
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [removingItemId, setRemovingItemId] = useState<number | null>(null);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleQuantityChange = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      return;
    }

    const cartItem = cart?.cartItems.find((item) => item.id === itemId);
    if (!cartItem) return;

    if (newQuantity > cartItem.listing.quantityAvailable) {
      toast.error(
        t("maxQuantity", { max: cartItem.listing.quantityAvailable }),
      );
      return;
    }

    setUpdatingItemId(itemId);
    try {
      await updateItem(itemId, { quantity: newQuantity });
      toast.success(t("quantityUpdated"));
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || t("quantityUpdateError");
      toast.error(errorMessage);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    setRemovingItemId(itemId);
    try {
      await removeItem(itemId);
      toast.success(t("itemRemoved"));
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || t("itemRemoveError");
      toast.error(errorMessage);
    } finally {
      setRemovingItemId(null);
    }
  };

  const handleClearCart = async () => {
    try {
      await clearCart();
      toast.success(t("cartCleared"));
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || t("cartClearError");
      toast.error(errorMessage);
    } finally {
      setIsClearDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-secondary/10 to-primary/10 py-8 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const cartItems = cart?.cartItems || [];
  const cartCurrency = cartItems[0]?.listing.currency ?? currency;
  const shipping = estimateShipping(cartItems);
  const sellerCount = new Set(
    cartItems.map((item) => item.listing.seller?.id ?? `l${item.listing.id}`),
  ).size;

  return (
    <div className="bg-linear-to-br from-secondary/10 to-primary/10 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("itemsInCart", { count: itemsCount })}
            </p>
          </div>
          {cartItems.length > 0 && (
            <AlertDialog
              open={isClearDialogOpen}
              onOpenChange={setIsClearDialogOpen}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4 mr-2" />
                  {t("clearCart")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("clearConfirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("clearConfirmDescription", { count: itemsCount })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearCart}>
                    {t("clearCart")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {cartItems.length === 0 ? (
          <Card>
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <ShoppingCart className="w-16 h-16 text-muted-foreground" />
                <div>
                  <h2 className="text-2xl font-semibold mb-2">
                    {t("emptyTitle")}
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {t("emptyDescription")}
                  </p>
                  <Button onClick={() => router.push("/marketplace")}>
                    {t("emptyAction")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Articles</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="hidden w-[100px] sm:table-cell">
                          Image
                        </TableHead>
                        <TableHead>Article</TableHead>
                        <TableHead className="hidden md:table-cell">
                          {t("condition")}
                        </TableHead>
                        <TableHead className="text-center">
                          {t("quantity")}
                        </TableHead>
                        <TableHead className="hidden text-right md:table-cell">
                          Prix unitaire
                        </TableHead>
                        <TableHead className="text-right">
                          {t("total")}
                        </TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cartItems.map((item) => {
                        const itemTotal = item.listing.price * item.quantity;
                        const isUpdating = updatingItemId === item.id;
                        const isRemoving = removingItemId === item.id;
                        const isSealed =
                          item.listing.productKind === "sealed" ||
                          !!item.listing.sealedProduct;
                        const productUrl = isSealed
                          ? `/marketplace/sealed/${item.listing.sealedProduct?.id}`
                          : `/marketplace/cards/${item.listing.pokemonCard?.id}`;
                        const imageUrl = isSealed
                          ? getSealedImageUrl(item.listing.sealedProduct) ||
                            SEALED_PLACEHOLDER
                          : getCardImage(item.listing.pokemonCard);
                        const productName = isSealed
                          ? getSealedName(item.listing.sealedProduct) ||
                            t("sealedProduct")
                          : item.listing.pokemonCard?.name || "Carte inconnue";
                        const productSub = isSealed
                          ? item.listing.sealedProduct?.pokemonSet?.name
                          : item.listing.pokemonCard?.set?.name;
                        const condition = isSealed
                          ? item.listing.sealedCondition
                          : item.listing.cardState;

                        return (
                          <TableRow key={item.id}>
                            <TableCell className="hidden sm:table-cell">
                              <Link href={productUrl} className="block">
                                <div className="relative w-16 h-24">
                                  <Image
                                    src={imageUrl}
                                    alt={productName}
                                    fill
                                    className="object-contain rounded hover:opacity-80 transition-opacity"
                                  />
                                </div>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <div>
                                <Link
                                  href={productUrl}
                                  className="font-medium hover:text-primary transition-colors"
                                >
                                  {productName}
                                </Link>
                                {productSub && (
                                  <p className="text-sm text-muted-foreground">
                                    {productSub}
                                  </p>
                                )}
                                <p className="text-sm text-muted-foreground md:hidden">
                                  {condition
                                    ? `${getConditionLabel(condition)} · `
                                    : ""}
                                  {formatPrice(
                                    item.listing.price,
                                    item.listing.currency,
                                  )}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge
                                variant="outline"
                                className={getCardStateColor(condition ?? "")}
                              >
                                {getConditionLabel(condition)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.id,
                                      item.quantity - 1,
                                    )
                                  }
                                  disabled={
                                    isUpdating ||
                                    isRemoving ||
                                    item.quantity <= 1
                                  }
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="w-8 text-center font-medium">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.id,
                                      item.quantity + 1,
                                    )
                                  }
                                  disabled={
                                    isUpdating ||
                                    isRemoving ||
                                    item.quantity >=
                                      item.listing.quantityAvailable
                                  }
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                              {item.quantity >=
                                item.listing.quantityAvailable && (
                                <p className="text-xs text-muted-foreground text-center mt-1">
                                  Stock limité
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="hidden text-right md:table-cell">
                              {formatPrice(
                                item.listing.price,
                                item.listing.currency,
                              )}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatPrice(itemTotal, item.listing.currency)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveItem(item.id)}
                                disabled={isUpdating || isRemoving}
                              >
                                {isRemoving ? (
                                  <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Résumé</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t("subtotal", { count: itemsCount })}
                    </span>
                    <span className="font-semibold">
                      {formatPrice(total, cartCurrency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t("shipping", { count: sellerCount })}
                    </span>
                    <span className="font-semibold">
                      {shipping === 0
                        ? t("shippingFree")
                        : formatPrice(shipping, cartCurrency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-lg font-semibold">{t("total")}</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatPrice(total + shipping, cartCurrency)}
                    </span>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => router.push("/marketplace/checkout")}
                  >
                    {t("checkout")}
                  </Button>
                </CardContent>
              </Card>

              {cartItems.some(
                (item) => item.quantity >= item.listing.quantityAvailable,
              ) && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t("limitedStockTitle")}</AlertTitle>
                  <AlertDescription>
                    {t("limitedStockDescription")}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
