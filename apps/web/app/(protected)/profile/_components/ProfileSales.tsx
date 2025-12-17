import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShoppingBag,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { marketplaceService } from "@/services/marketplace.service";
import { Listing } from "@/types/listing";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import { formatPrice } from "@/utils/price";

export const ProfileSales = () => {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const debouncedSearch = useDebounce(search, 500);

  const loadListings = React.useCallback(async () => {
    try {
      setLoading(true);
      const result = await marketplaceService.getMyListings({
        page,
        limit: 10,
        search: debouncedSearch,
        cardState:
          statusFilter === "all"
            ? undefined
            : statusFilter === "active"
              ? "active"
              : "inactive",
        sortBy: "createdAt",
        sortOrder: "DESC",
      });
      setListings(result.data);
      setTotalPages(result.meta.totalPages);
    } catch (error) {
      console.error("Erreur chargement ventes:", error);
      toast.error("Impossible de charger vos ventes");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const handleToggleStatus = async (listing: Listing) => {
    try {
      const newQuantity = listing.quantityAvailable > 0 ? 0 : 1;
      await marketplaceService.updateListing(listing.id.toString(), {
        quantityAvailable: newQuantity,
      });

      // Optimistic update
      setListings((prev) =>
        prev.map((l) =>
          l.id === listing.id ? { ...l, quantityAvailable: newQuantity } : l,
        ),
      );

      toast.success(newQuantity > 0 ? "Vente réactivée" : "Vente désactivée");
    } catch {
      toast.error("Erreur lors de la modification");
    }
  };

  const handleDelete = async (listing: Listing) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette vente ?")) return;

    try {
      await marketplaceService.deleteListing(listing.id.toString());
      setListings((prev) => prev.filter((l) => l.id !== listing.id));
      toast.success("Vente supprimée");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-2">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Mes ventes</h2>
        </div>

        <Button onClick={() => router.push("/marketplace/create")}>
          Créer une vente
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une carte..."
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
            Tous
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
            <div
              key={i}
              className="h-32 bg-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucune vente trouvée</p>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4"
            >
              <div className="flex items-start gap-4">
                {listing.pokemonCard?.image && (
                  <img
                    src={
                      listing.pokemonCard.image
                        ? listing.pokemonCard.image + "/low.png"
                        : "/images/carte-pokemon-dos.jpg"
                    }
                    alt={listing.pokemonCard.name}
                    className="w-16 h-24 object-contain rounded-sm bg-muted"
                  />
                )}
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
                    listing.quantityAvailable > 0 ? "Désactiver" : "Activer"
                  }
                >
                  {listing.quantityAvailable > 0 ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push(`/marketplace/${listing.id}/edit`)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(listing)}
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
    </Card>
  );
};
