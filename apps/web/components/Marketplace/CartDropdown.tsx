"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Trash2 } from "lucide-react";
import {
  useCartStore,
  useCartItemsCount,
  useCartTotal,
} from "@/store/cart.store";
import { useCurrencyStore } from "@/store/currency.store";
import Image from "next/image";

const CartDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { cart, isLoading, fetchCart, removeItem } = useCartStore();
  const { formatPrice, currency } = useCurrencyStore();
  const itemsCount = useCartItemsCount();
  const total = useCartTotal();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const cartItems = cart?.cartItems || [];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 rounded-full p-0 relative"
        >
          <ShoppingCart className="h-4 w-4" />
          {itemsCount > 0 && (
            <Badge
              variant="destructive"
              
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs "
            >
              {itemsCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 max-h-[400px] overflow-y-auto"
      >
        <DropdownMenuLabel>
          Panier ({itemsCount} article{itemsCount > 1 ? "s" : ""})
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Chargement...
          </div>
        ) : cartItems.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Votre panier est vide
          </div>
        ) : (
          <>
            <div className="max-h-[300px] overflow-y-auto">
              {cartItems.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  className="flex items-start gap-3 p-3 cursor-default"
                  onSelect={(e) => e.preventDefault()}
                >
                  <div className="relative w-12 h-16 shrink-0">
                    {item.listing.pokemonCard.image ? (
                      <Image
                        src={item.listing.pokemonCard.image + "/high.png"}
                        alt={item.listing.pokemonCard.name || "Carte"}
                        fill
                        className="object-contain rounded"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted rounded flex items-center justify-center text-xs">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.listing.pokemonCard.name || "Carte inconnue"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Quantité: {item.quantity}
                    </p>
                    <p className="text-sm font-semibold text-primary">
                      {formatPrice(
                        item.listing.price * item.quantity,
                        item.listing.currency,
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(item.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuSeparator />
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">Total:</span>
                <span className="text-lg font-bold text-primary">
                  {formatPrice(total, currency)}
                </span>
              </div>
              <Button
                asChild
                className="w-full"
                size="sm"
              >
                <Link
                  href="/cart"
                  onClick={() => setIsOpen(false)}
                >
                  Voir le panier
                </Link>
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CartDropdown;
