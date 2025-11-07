"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collectionService } from "@/services/collection.service";
import { Collection, CollectionItemType } from "@/types/collection";
import Image from "next/image";
import { Search, Info, Eye, Calendar, Package, Lock, User } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PokemonCardType } from "@/types/cardPokemon";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import type { PaginatedResult } from "@/types/pagination";

const CollectionDetailPage = () => {
  const { id } = useParams();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("added_at");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const limit = 10;

  // Récupérer les infos de la collection
  useEffect(() => {
    const fetchCollection = async () => {
      try {
        const collectionData = await collectionService.getById(id as string);
        setCollection(collectionData);
      } catch (error) {
        console.error(
          "Erreur lors de la récupération de la collection :",
          error,
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchCollection();
  }, [id]);

  // Recherche avec debounce
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Récupérer les items paginés
  const { data: itemsData, isLoading: itemsLoading } = usePaginatedQuery<
    PaginatedResult<CollectionItemType>
  >(
    ["collection-items", id, page, debouncedSearch, sortBy, sortOrder],
    (params: any) => collectionService.getItemsPaginated(id as string, params),
    {
      page,
      limit,
      search: debouncedSearch || undefined,
      sortBy,
      sortOrder,
    },
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">
            Collection introuvable.
          </p>
        </div>
      </div>
    );
  }

  const meta = itemsData?.meta;
  const items = itemsData?.data || [];

  // Formater la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Générer les pages pour la pagination
  const generatePaginationPages = () => {
    if (!meta) return [];
    const pages: (number | "ellipsis")[] = [];
    const totalPages = meta.totalPages;
    const currentPage = meta.currentPage;
    const maxVisiblePages = 7;
    const sidePages = 2;

    if (totalPages <= maxVisiblePages) {
      // Afficher toutes les pages si moins de 7
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Toujours afficher la première page
      pages.push(1);

      let startPage = Math.max(2, currentPage - sidePages);
      let endPage = Math.min(totalPages - 1, currentPage + sidePages);

      // Ajuster si on est proche du début
      if (currentPage <= sidePages + 2) {
        endPage = Math.min(maxVisiblePages - 2, totalPages - 1);
      }

      // Ajuster si on est proche de la fin
      if (currentPage >= totalPages - sidePages - 1) {
        startPage = Math.max(2, totalPages - maxVisiblePages + 2);
      }

      // Ajouter ellipsis au début si nécessaire
      if (startPage > 2) {
        pages.push("ellipsis");
      }

      // Ajouter les pages autour de la page courante
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      // Ajouter ellipsis à la fin si nécessaire
      if (endPage < totalPages - 1) {
        pages.push("ellipsis");
      }

      // Toujours afficher la dernière page
      pages.push(totalPages);
    }

    return pages;
  };

  console.log("collection", collection);

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-primary/10 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <Card className="mb-6 bg-card/80 backdrop-blur-sm border-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-3xl font-bold mb-2">
                  {collection.name}
                </CardTitle>
                <CardDescription className="text-base mb-4">
                  {collection.description || "Aucune description"}
                </CardDescription>
              </div>
              <Badge
                variant={collection.isPublic ? "default" : "secondary"}
                className="ml-4"
              >
                {collection.isPublic ? (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3 mr-1" />
                    Privé
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>
                  <strong className="text-foreground">
                    {meta?.totalItems || 0}
                  </strong>{" "}
                  carte{meta?.totalItems !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Créée le{" "}
                  <strong className="text-foreground">
                    {formatDate(collection.created_at)}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>
                  Propriétaire:{" "}
                  <strong className="text-foreground">
                    {collection.user.firstName}
                  </strong>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Barre de recherche et tri */}
        <Card className="mb-6 bg-card/80 backdrop-blur-sm border-2">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Rechercher une carte (nom, rareté, set)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={sortBy}
                onValueChange={setSortBy}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="added_at">Date d'ajout</SelectItem>
                  <SelectItem value="pokemonCard.name">Nom</SelectItem>
                  <SelectItem value="pokemonCard.rarity">Rareté</SelectItem>
                  <SelectItem value="quantity">Quantité</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortOrder}
                onValueChange={(value: "ASC" | "DESC") => setSortOrder(value)}
              >
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Ordre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASC">Croissant</SelectItem>
                  <SelectItem value="DESC">Décroissant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tableau des cartes */}
        {itemsLoading ? (
          <Card className="bg-card/80 backdrop-blur-sm border-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">
                    Chargement des cartes...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card className="bg-card/80 backdrop-blur-sm border-2">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold mb-2">
                  {debouncedSearch
                    ? "Aucune carte trouvée"
                    : "Aucune carte dans cette collection"}
                </p>
                <p className="text-muted-foreground">
                  {debouncedSearch
                    ? "Essayez avec d'autres mots-clés"
                    : "Commencez par ajouter des cartes à votre collection"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 bg-card/80 backdrop-blur-sm border-2">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Image</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Set</TableHead>
                      <TableHead className="text-center">Quantité</TableHead>
                      <TableHead>État</TableHead>
                      <TableHead>Rareté</TableHead>
                      <TableHead className="text-center">PV</TableHead>
                      <TableHead>Types</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const pokemon: PokemonCardType = item.pokemonCard;
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="w-20 h-28 relative">
                              <Image
                                src={
                                  pokemon.image
                                    ? pokemon.image + "/high.png"
                                    : "/images/carte-pokemon-dos.jpg"
                                }
                                alt={pokemon.name || "Carte Pokémon"}
                                fill
                                className="object-contain rounded-lg border bg-white"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {pokemon.name || "?"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {pokemon.set?.name || "?"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{item.quantity}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {item.cardState?.name || "?"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {pokemon.rarity ? (
                              <Badge variant="outline">{pokemon.rarity}</Badge>
                            ) : (
                              "?"
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {pokemon.hp ? (
                              <span className="font-medium">{pokemon.hp}</span>
                            ) : (
                              "?"
                            )}
                          </TableCell>
                          <TableCell>
                            {pokemon.types && pokemon.types.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {pokemon.types.map((type, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {type}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              "?"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                                aria-label="Voir les détails"
                              >
                                <Link href={`/pokemon/${pokemon.id}`}>
                                  <Info className="w-4 h-4" />
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {meta && items.length > 0 && (
          <Card className="bg-card/80 backdrop-blur-sm border-2">
            <CardContent className="pt-6">
              {meta.totalPages > 1 ? (
                <>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (meta.hasPreviousPage) {
                              setPage(page - 1);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }
                          }}
                          aria-disabled={!meta.hasPreviousPage}
                          tabIndex={!meta.hasPreviousPage ? -1 : 0}
                          className={
                            !meta.hasPreviousPage
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                      {generatePaginationPages().map((pageNum, idx) => (
                        <PaginationItem key={`page-${pageNum}-${idx}`}>
                          {pageNum === "ellipsis" ? (
                            <PaginationEllipsis />
                          ) : (
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setPage(pageNum as number);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              isActive={pageNum === meta.currentPage}
                              className="cursor-pointer min-w-[2.5rem]"
                            >
                              {pageNum}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (meta.hasNextPage) {
                              setPage(page + 1);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }
                          }}
                          aria-disabled={!meta.hasNextPage}
                          tabIndex={!meta.hasNextPage ? -1 : 0}
                          className={
                            !meta.hasNextPage
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                  <div className="text-center mt-4 text-sm text-muted-foreground">
                    Page {meta.currentPage} sur {meta.totalPages} (
                    {meta.totalItems} carte{meta.totalItems !== 1 ? "s" : ""} au
                    total)
                  </div>
                </>
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  {meta.totalItems} carte{meta.totalItems !== 1 ? "s" : ""} au
                  total
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CollectionDetailPage;
