"use client";

import { Loader2, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrencyStore } from "@/store/currency.store";
import { Listing } from "@/types/listing";
import { sealedConditionLabels } from "@/types/sealed-product";

interface SealedListingsTableProps {
  listings: Listing[];
  loading: boolean;
  quantitiesByListing: Record<number, number>;
  onChangeQuantity: (listingId: number, quantity: number) => void;
  onAddToCart: (listing: Listing) => void;
  addingToListingId: number | null;
  isCartLoading: boolean;
}

export function SealedListingsTable({
  listings,
  loading,
  quantitiesByListing,
  onChangeQuantity,
  onAddToCart,
  addingToListingId,
  isCartLoading,
}: SealedListingsTableProps) {
  const { formatPrice } = useCurrencyStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Annonces disponibles</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : listings.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendeur</TableHead>
                <TableHead>État</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings.map((listing) => {
                const desired = quantitiesByListing[listing.id] ?? 1;
                const adding = addingToListingId === listing.id;
                const outOfStock = listing.quantityAvailable === 0;
                return (
                  <TableRow key={listing.id}>
                    <TableCell>
                      <Link
                        href={`/marketplace/sellers/${listing.seller.id}`}
                        className="flex items-center gap-2 hover:text-primary transition-colors"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={listing.seller.avatarUrl} />
                          <AvatarFallback>
                            {listing.seller.firstName?.[0] ?? "?"}
                            {listing.seller.lastName?.[0] ?? ""}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          {listing.seller.firstName} {listing.seller.lastName}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {listing.sealedCondition ? (
                        <Badge variant="outline">
                          {sealedConditionLabels[listing.sealedCondition]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={outOfStock ? "destructive" : "secondary"}
                      >
                        {listing.quantityAvailable}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        max={listing.quantityAvailable || 1}
                        value={desired}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (Number.isFinite(v) && v > 0) {
                            onChangeQuantity(
                              listing.id,
                              Math.min(v, listing.quantityAvailable),
                            );
                          }
                        }}
                        disabled={outOfStock}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatPrice(Number(listing.price), listing.currency)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAddToCart(listing)}
                        disabled={isCartLoading || adding || outOfStock}
                      >
                        {adding ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Ajout...
                          </>
                        ) : outOfStock ? (
                          "Indisponible"
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Ajouter
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">
            Aucune annonce active pour ce produit. Soyez le premier !
          </p>
        )}
      </CardContent>
    </Card>
  );
}
