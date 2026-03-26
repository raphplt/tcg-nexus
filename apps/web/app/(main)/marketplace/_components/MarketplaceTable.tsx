import React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Listing } from "@/types/listing";
import { ArrowUp, ArrowDown } from "lucide-react";
import type { PaginatedResult } from "@/types/pagination";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getCardStateColor } from "../utils";
import { getCardImage } from "@/utils/images";

export interface MarketplaceFilters {
  search: string;
  cardState: string;
  currency: string;
  sortBy: string;
  sortOrder: "ASC" | "DESC";
}

interface MarketplaceTableProps {
  data: PaginatedResult<Listing> | undefined;
  isLoading: boolean;
  error: Error | null;
  tableHeaders: { label: string; key: keyof Listing | string }[];
  sortBy: string;
  sortOrder: "ASC" | "DESC";
  setFilters: (filters: Partial<MarketplaceFilters>) => void;
}

const MarketplaceTable = ({
  data,
  isLoading,
  error,
  tableHeaders,
  sortBy,
  sortOrder,
  setFilters,
}: MarketplaceTableProps) => {
  const router = useRouter();

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setFilters({ sortOrder: sortOrder === "ASC" ? "DESC" : "ASC" });
    } else {
      setFilters({ sortBy: key, sortOrder: "ASC" });
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {tableHeaders.map((header) => (
            <TableHead
              key={header.key}
              onClick={() => handleSort(header.key)}
              className="cursor-pointer select-none group"
            >
              <span className="inline-flex items-center gap-1">
                {header.label}
                {sortBy === header.key &&
                  (sortOrder === "ASC" ? (
                    <ArrowUp className="w-3 h-3 text-primary group-hover:text-primary/80" />
                  ) : (
                    <ArrowDown className="w-3 h-3 text-primary group-hover:text-primary/80" />
                  ))}
              </span>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell
              colSpan={6}
              className="text-center py-8 text-lg animate-pulse"
            >
              Chargement des ventes...
            </TableCell>
          </TableRow>
        ) : error ? (
          <TableRow>
            <TableCell
              colSpan={6}
              className="text-center text-destructive py-8"
            >
              Erreur lors du chargement des ventes
            </TableCell>
          </TableRow>
        ) : data?.data?.length ? (
          data.data.map((listing: Listing) => (
            <TableRow
              key={listing.id}
              className="transition-all hover:scale-[1.01] hover:shadow-lg cursor-pointer"
              onClick={() => router.push(`/marketplace/${listing.id}`)}
            >
              <TableCell className="font-semibold text-lg text-primary flex items-center gap-2">
                <Image
                  src={getCardImage(listing.pokemonCard, "low")}
                  alt={listing.pokemonCard?.name || "Carte inconnue"}
                  width={40}
                  height={40}
                />
                {listing.pokemonCard?.name || "Carte inconnue"}
                <Badge variant="outline">
                  {listing.pokemonCard?.set?.name}
                </Badge>
              </TableCell>
              <TableCell>
                {listing.price} {listing.currency}
              </TableCell>
              <TableCell>{listing.quantityAvailable}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={getCardStateColor(listing.cardState)}
                >
                  {listing.cardState}
                </Badge>
              </TableCell>
              <TableCell>
                {listing.expiresAt
                  ? new Date(listing.expiresAt).toLocaleDateString()
                  : "N/A"}
              </TableCell>
              <TableCell>
                {listing.seller?.firstName} {listing.seller?.lastName}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={6}
              className="text-center py-8 text-muted-foreground"
            >
              Aucune vente trouvée.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

export default MarketplaceTable;
