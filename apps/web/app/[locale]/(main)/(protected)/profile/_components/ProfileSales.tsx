import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  EyeOff,
  Search,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { marketplaceService } from "@/services/marketplace.service";
import { Listing } from "@/types/listing";
import { getCardImage } from "@/utils/images";
import { formatPrice } from "@/utils/price";

export const ProfileSales = () => {
  const t = useTranslations("ProfileSales");
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [error, setError] = useState<string | null>(null);
  const [listingToDelete, setListingToDelete] = useState<Listing | null>(null);

  const debouncedSearch = useDebounce(search, 500);

  const loadListings = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await marketplaceService.getMyListings({
        page,
        limit: 10,
        search: debouncedSearch,
        status: statusFilter === "all" ? undefined : statusFilter,
        sortBy: "createdAt",
        sortOrder: "DESC",
      });
      setListings(result.data);
      setTotalPages(result.meta.totalPages);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const handleToggleStatus = async (listing: Listing) => {
    const newStatus = listing.status === "inactive" ? "active" : "inactive";

    try {
      await marketplaceService.updateListing(listing.id.toString(), {
        status: newStatus,
      });

      // Optimistic update
      setListings((prev) =>
        prev.map((l) =>
          l.id === listing.id ? { ...l, status: newStatus } : l,
        ),
      );

      toast.success(
        newStatus === "active" ? t("reactivated") : t("deactivated"),
      );
    } catch {
      toast.error(t("updateError"));
    }
  };

  const handleDelete = async (listing: Listing) => {
    try {
      await marketplaceService.deleteListing(listing.id.toString());
      setListings((prev) => prev.filter((l) => l.id !== listing.id));
      toast.success(t("deleted"));
    } catch {
      toast.error(t("deleteError"));
    } finally {
      setListingToDelete(null);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-2">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">{t("title")}</h2>
        </div>

        <Button onClick={() => router.push("/marketplace/create")}>
          {t("createListing")}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            {t("all")}
          </Button>
          <Button
            variant={statusFilter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("active")}
          >
            Actifs
          </Button>
          <Button
            variant={statusFilter === "inactive" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("inactive")}
          >
            Inactifs
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={loadListings}>
            {t("retry")}
          </Button>
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">
            {search || statusFilter !== "all" ? t("emptyFiltered") : t("empty")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4"
            >
              <div className="flex items-start gap-4">
                <Image
                  src={getCardImage(listing.pokemonCard, "low")}
                  alt={listing.pokemonCard?.name || "Carte"}
                  width={64}
                  height={96}
                  className="object-contain rounded-sm bg-muted"
                />
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">
                    {listing.pokemonCard?.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{listing.pokemonCard?.set?.name}</span>
                    <span>•</span>
                    <Badge variant="outline">{listing.cardState}</Badge>
                  </div>
                  <div className="flex items-center gap-1 font-medium text-primary">
                    <span>
                      {formatPrice(listing.price, listing.currency || "EUR")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleStatus(listing)}
                  title={
                    listing.status === "inactive"
                      ? "Remettre en vente"
                      : t("unlist")
                  }
                  aria-label={
                    listing.status === "inactive"
                      ? "Remettre l'annonce en vente"
                      : t("unlistTooltip")
                  }
                >
                  {listing.status === "inactive" ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Modifier l'annonce"
                  aria-label="Modifier l'annonce"
                  onClick={() =>
                    router.push(`/marketplace/listings/${listing.id}/edit`)
                  }
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  title="Supprimer l'annonce"
                  aria-label="Supprimer l'annonce"
                  onClick={() => setListingToDelete(listing)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} sur {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      <AlertDialog
        open={!!listingToDelete}
        onOpenChange={(open) => !open && setListingToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {listingToDelete?.pokemonCard?.name} ne sera plus visible sur la
              marketplace. Les commandes déjà passées sur cette annonce restent
              consultables.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => listingToDelete && handleDelete(listingToDelete)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
