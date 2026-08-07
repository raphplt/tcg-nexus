"use client";

import { Loader2, ShoppingCart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { Listing } from "@/types/listing";
import { cardStates, languages } from "@/utils/variables";
import { getCardStateColor } from "../../../utils";

interface ListingsTableProps {
  listings: Listing[];
  loading: boolean;
  currencyFilter: string;
  setCurrencyFilter: (value: string) => void;
  cardStateFilter: string;
  setCardStateFilter: (value: string) => void;
  onAddToCart: (listingId: number) => void;
  addingToListingId: number | null;
  isCartLoading: boolean;
}

const toNumber = (value: number | string) =>
  typeof value === "string" ? parseFloat(value) : value;

const stateLabel = (value?: string | null) =>
  cardStates.find((s) => s.value === value)?.label ?? value ?? "—";

const languageLabel = (value?: string | null) =>
  languages.find((l) => l.value === value)?.label ?? value ?? "—";

export function ListingsTable({
  listings,
  loading,
  currencyFilter,
  setCurrencyFilter,
  cardStateFilter,
  setCardStateFilter,
  onAddToCart,
  addingToListingId,
  isCartLoading,
}: ListingsTableProps) {
  const { formatPrice } = useCurrencyStore();

  // Les offres les moins chères port compris arrivent en tête
  const sortedListings = useMemo(
    () =>
      [...listings].sort(
        (a, b) =>
          toNumber(a.price) +
          toNumber(a.shippingCost) -
          (toNumber(b.price) + toNumber(b.shippingCost)),
      ),
    [listings],
  );

  return (
    <section
      id="offres"
      className="rounded-xl border bg-card shadow-sm scroll-mt-6"
    >
      <div className="flex flex-col gap-4 border-b p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Offres des vendeurs</h2>
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Chargement des offres…"
              : `${sortedListings.length} offre${sortedListings.length > 1 ? "s" : ""} disponible${sortedListings.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={cardStateFilter} onValueChange={setCardStateFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="État" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les états</SelectItem>
              {cardStates.map((cs) => (
                <SelectItem key={cs.value} value={cs.value}>
                  {cs.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Devise" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes devises</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 p-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : sortedListings.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Vendeur</TableHead>
                <TableHead>État</TableHead>
                <TableHead className="hidden md:table-cell">Langue</TableHead>
                <TableHead className="hidden sm:table-cell text-right">
                  Dispo.
                </TableHead>
                <TableHead className="text-right">Prix</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedListings.map((listing, index) => {
                const total =
                  toNumber(listing.price) + toNumber(listing.shippingCost);
                const soldOut = listing.quantityAvailable === 0;

                return (
                  <TableRow key={listing.id}>
                    <TableCell>
                      <Link
                        href={`/marketplace/sellers/${listing.seller.id}`}
                        className="flex items-center gap-2.5 hover:text-primary transition-colors"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={listing.seller.avatarUrl} />
                          <AvatarFallback className="text-xs">
                            {listing.seller.firstName?.[0]}
                            {listing.seller.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex flex-col">
                          <span className="font-medium leading-tight">
                            {listing.seller.firstName} {listing.seller.lastName}
                          </span>
                          {index === 0 && !soldOut && (
                            <span className="text-xs text-emerald-600 font-medium">
                              Meilleure offre
                            </span>
                          )}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getCardStateColor(listing.cardState)}
                      >
                        {stateLabel(listing.cardState)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {languageLabel(listing.language)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-right tabular-nums">
                      {listing.quantityAvailable}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="font-medium">
                        {formatPrice(listing.price, listing.currency)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {toNumber(listing.shippingCost) > 0
                          ? `+ ${formatPrice(listing.shippingCost, listing.currency)} port`
                          : "port offert"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatPrice(total, listing.currency)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={
                          index === 0 && !soldOut ? "default" : "outline"
                        }
                        onClick={() => onAddToCart(listing.id)}
                        disabled={
                          isCartLoading ||
                          addingToListingId === listing.id ||
                          soldOut
                        }
                      >
                        {addingToListingId === listing.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : soldOut ? (
                          "Épuisé"
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4" />
                            <span className="hidden sm:inline">Ajouter</span>
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="p-12 text-center">
          <p className="font-medium">Aucune offre ne correspond aux filtres</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Élargissez votre recherche ou proposez vous-même cette carte.
          </p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/marketplace/create">Mettre cette carte en vente</Link>
          </Button>
        </div>
      )}
    </section>
  );
}
