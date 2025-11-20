"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  X,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCurrencyStore } from "@/store/currency.store";
import {
  useCartStore,
  useCartTotal,
  useCartItemsCount,
} from "@/store/cart.store";
import { getCardStateColor } from "@/app/marketplace/utils";
import toast from "react-hot-toast";

export default function CartPage() {
  const router = useRouter();
  const { cart, isLoading, fetchCart, updateItem, removeItem, clearCart } =
    useCartStore();
  const { formatPrice, currency } = useCurrencyStore();
  const total = useCartTotal();
  const itemsCount = useCartItemsCount();
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [removingItemId, setRemovingItemId] = useState<number | null>(null);

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
        `Quantité maximale disponible : ${cartItem.listing.quantityAvailable}`,
      );
      return;
    }

    setUpdatingItemId(itemId);
    try {
      await updateItem(itemId, { quantity: newQuantity });
      toast.success("Quantité mise à jour");
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Erreur lors de la mise à jour de la quantité";
      toast.error(errorMessage);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    setRemovingItemId(itemId);
    try {
      await removeItem(itemId);
      toast.success("Article retiré du panier");
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Erreur lors de la suppression de l'article";
      toast.error(errorMessage);
    } finally {
      setRemovingItemId(null);
    }
  };

  const handleClearCart = async () => {
    if (!confirm("Êtes-vous sûr de vouloir vider votre panier ?")) {
      return;
    }

    try {
      await clearCart();
      toast.success("Panier vidé");
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Erreur lors du vidage du panier";
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-primary/10 py-8 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-32 w-full"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const cartItems = cart?.cartItems || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-primary/10 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mon Panier</h1>
            <p className="text-muted-foreground mt-1">
              {itemsCount} article{itemsCount > 1 ? "s" : ""} dans votre panier
            </p>
          </div>
          {cartItems.length > 0 && (
            <Button
              variant="outline"
              onClick={handleClearCart}
              className="text-destructive hover:text-destructive"
            >
              <X className="w-4 h-4 mr-2" />
              Vider le panier
            </Button>
          )}
        </div>

        {cartItems.length === 0 ? (
          <Card>
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <ShoppingCart className="w-16 h-16 text-muted-foreground" />
                <div>
                  <h2 className="text-2xl font-semibold mb-2">
                    Votre panier est vide
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Explorez notre marketplace pour trouver des cartes à ajouter
                    à votre panier
                  </p>
                  <Button onClick={() => router.push("/marketplace")}>
                    Découvrir le marketplace
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
                        <TableHead className="w-[100px]">Image</TableHead>
                        <TableHead>Article</TableHead>
                        <TableHead>État</TableHead>
                        <TableHead className="text-center">Quantité</TableHead>
                        <TableHead className="text-right">
                          Prix unitaire
                        </TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cartItems.map((item) => {
                        const itemTotal = item.listing.price * item.quantity;
                        const isUpdating = updatingItemId === item.id;
                        const isRemoving = removingItemId === item.id;

                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Link
                                href={`/marketplace/cards/${item.listing.pokemonCard.id}`}
                                className="block"
                              >
                                <div className="relative w-16 h-24">
                                  {item.listing.pokemonCard.image ? (
                                    <Image
                                      src={
                                        item.listing.pokemonCard.image +
                                        "/high.png"
                                      }
                                      alt={
                                        item.listing.pokemonCard.name || "Carte"
                                      }
                                      fill
                                      className="object-contain rounded hover:opacity-80 transition-opacity"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-muted rounded flex items-center justify-center text-xs">
                                      No Image
                                    </div>
                                  )}
                                </div>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <div>
                                <Link
                                  href={`/marketplace/cards/${item.listing.pokemonCard.id}`}
                                  className="font-medium hover:text-primary transition-colors"
                                >
                                  {item.listing.pokemonCard.name ||
                                    "Carte inconnue"}
                                </Link>
                                {item.listing.pokemonCard.set && (
                                  <p className="text-sm text-muted-foreground">
                                    {item.listing.pokemonCard.set.name}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={getCardStateColor(
                                  item.listing.cardState,
                                )}
                              >
                                {item.listing.cardState}
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
                            <TableCell className="text-right">
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
                      Sous-total ({itemsCount} article
                      {itemsCount > 1 ? "s" : ""})
                    </span>
                    <span className="font-semibold">
                      {formatPrice(total, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatPrice(total, currency)}
                    </span>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => {
                      toast("Fonctionnalité de commande à venir", {
                        icon: "ℹ️",
                      });
                    }}
                  >
                    Passer la commande
                  </Button>
                </CardContent>
              </Card>

              {cartItems.some(
                (item) => item.quantity >= item.listing.quantityAvailable,
              ) && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Stock limité</AlertTitle>
                  <AlertDescription>
                    Certains articles ont atteint leur quantité maximale
                    disponible.
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
