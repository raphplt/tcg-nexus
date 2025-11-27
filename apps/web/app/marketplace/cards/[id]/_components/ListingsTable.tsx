import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getCardStateColor } from "../../../utils";
import { cardStates } from "@/utils/variables";
import { Loader2, ShoppingCart } from "lucide-react";
import Link from "next/link";

interface ListingsTableProps {
  listings: any[];
  loading: boolean;
  currencyFilter: string;
  setCurrencyFilter: (value: string) => void;
  cardStateFilter: string;
  setCardStateFilter: (value: string) => void;
  onAddToCart: (listingId: number) => void;
  addingToListingId: number | null;
  isCartLoading: boolean;
}

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Offres disponibles</CardTitle>
          <div className="flex gap-2">
            <Select
              value={currencyFilter}
              onValueChange={setCurrencyFilter}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Devise" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={cardStateFilter}
              onValueChange={setCardStateFilter}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="État" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {cardStates.map((cs) => (
                  <SelectItem
                    key={cs.value}
                    value={cs.value}
                  >
                    {cs.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-16 w-full"
              />
            ))}
          </div>
        ) : listings.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendeur</TableHead>
                <TableHead>État</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings.map((listing) => (
                <TableRow key={listing.id}>
                  <TableCell>
                    <Link
                      href={`/marketplace/sellers/${listing.seller.id}`}
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={listing.seller.avatarUrl} />
                        <AvatarFallback>
                          {listing.seller.firstName[0]}
                          {listing.seller.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span>
                        {listing.seller.firstName} {listing.seller.lastName}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getCardStateColor(listing.cardState)}
                    >
                      {listing.cardState}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatPrice(listing.price, listing.currency)}
                  </TableCell>
                  <TableCell>{listing.quantityAvailable}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAddToCart(listing.id)}
                      disabled={
                        isCartLoading ||
                        addingToListingId === listing.id ||
                        listing.quantityAvailable === 0
                      }
                    >
                      {addingToListingId === listing.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Ajout...
                        </>
                      ) : listing.quantityAvailable === 0 ? (
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
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Aucune offre disponible avec ces filtres
          </div>
        )}
      </CardContent>
    </Card>
  );
}
