"use client";

import { useContext, useState } from "react";
import {
  Bookmark,
  FolderPlus,
  Heart,
  Loader2,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AuthContext } from "@/contexts/AuthContext";
import { useRouter } from "@/i18n/navigation";
import { collectionService } from "@/services/collection.service";
import { pokemonCardService } from "@/services/pokemonCard.service";
import type { Collection } from "@/types/collection";

interface AddToCollectionDialogProps {
  cardId: string;
  cardName?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function AddToCollectionDialog({
  cardId,
  cardName,
  variant = "outline",
  size = "lg",
  className,
}: AddToCollectionDialogProps) {
  const router = useRouter();
  const authContext = useContext(AuthContext);
  const user = authContext?.user || null;
  const isAuthenticated = authContext?.isAuthenticated || false;

  const [isOpen, setIsOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [addingTarget, setAddingTarget] = useState<string | null>(null);

  const fetchCollections = async () => {
    if (!user?.id) return;
    setIsLoadingCollections(true);
    try {
      const data = await collectionService.getMyCollections();
      setCollections(data);
    } catch {
      try {
        const paginated = await collectionService.getByUserId(user.id);
        setCollections(paginated.data || []);
      } catch (err) {
        console.error("Failed to load user collections", err);
      }
    } finally {
      setIsLoadingCollections(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      if (!isAuthenticated) {
        toast.error("Veuillez vous connecter pour gérer vos collections.");
        router.push("/auth/login");
        return;
      }
      void fetchCollections();
    }
    setIsOpen(open);
  };

  const handleAddToWishlist = async () => {
    if (!user?.id) return;
    setAddingTarget("wishlist");
    try {
      await pokemonCardService.addToWishlist(user.id, cardId);
      toast.success(
        cardName
          ? `"${cardName}" ajoutée à votre Wishlist !`
          : "Carte ajoutée à votre Wishlist !",
      );
      setIsOpen(false);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Erreur lors de l'ajout à la Wishlist",
      );
    } finally {
      setAddingTarget(null);
    }
  };

  const handleAddToFavorites = async () => {
    if (!user?.id) return;
    setAddingTarget("favorites");
    try {
      await pokemonCardService.addToFavorites(user.id, cardId);
      toast.success(
        cardName
          ? `"${cardName}" ajoutée à vos Favoris !`
          : "Carte ajoutée à vos Favoris !",
      );
      setIsOpen(false);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Erreur lors de l'ajout aux Favoris",
      );
    } finally {
      setAddingTarget(null);
    }
  };

  const handleAddToCollection = async (collection: Collection) => {
    setAddingTarget(collection.id);
    try {
      await collectionService.addCardToCollection(collection.id, cardId);
      toast.success(
        cardName
          ? `"${cardName}" ajoutée à "${collection.name}" !`
          : `Carte ajoutée à "${collection.name}" !`,
      );
      setIsOpen(false);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          `Erreur lors de l'ajout à "${collection.name}"`,
      );
    } finally {
      setAddingTarget(null);
    }
  };

  const customCollections = collections.filter(
    (c) =>
      c.name.toLowerCase() !== "wishlist" &&
      c.name.toLowerCase() !== "favorites" &&
      c.name.toLowerCase() !== "favoris",
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          type="button"
        >
          <FolderPlus className="w-4 h-4 mr-2" />
          Ajouter à ma collection
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-primary" />
            Ajouter à une collection
          </DialogTitle>
          <DialogDescription>
            {cardName
              ? `Sélectionnez où vous souhaitez ranger "${cardName}".`
              : "Sélectionnez où vous souhaitez ranger cette carte."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="justify-start gap-2 h-auto py-3 px-4 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left"
              onClick={handleAddToFavorites}
              disabled={addingTarget != null}
            >
              {addingTarget === "favorites" ? (
                <Loader2 className="w-4 h-4 animate-spin text-rose-500 shrink-0" />
              ) : (
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500 shrink-0" />
              )}
              <div className="overflow-hidden">
                <p className="font-semibold text-xs leading-none">Favoris</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Accès rapide
                </p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start gap-2 h-auto py-3 px-4 border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-left"
              onClick={handleAddToWishlist}
              disabled={addingTarget != null}
            >
              {addingTarget === "wishlist" ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-500 shrink-0" />
              ) : (
                <Bookmark className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
              )}
              <div className="overflow-hidden">
                <p className="font-semibold text-xs leading-none">Wishlist</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Cartes recherchées
                </p>
              </div>
            </Button>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Mes Collections
            </h4>

            {isLoadingCollections ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : customCollections.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                <p className="mb-2">Aucune collection personnalisée créée.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/collection");
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Créer une collection
                </Button>
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {customCollections.map((col) => (
                  <div
                    key={col.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border bg-card/60 hover:bg-accent/40 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-sm truncate">
                          {col.name}
                        </p>
                        {col.masterSet && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            Master Set
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {col.items?.length || 0} carte{(col.items?.length || 0) > 1 ? "s" : ""}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 h-8 px-3 text-xs"
                      disabled={addingTarget != null}
                      onClick={() => handleAddToCollection(col)}
                    >
                      {addingTarget === col.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Ajouter
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
