"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { pokemonCardService } from "@/services/pokemonCard.service";
import type { PokemonCardType } from "@/type/cardPokemon";
import type { PaginatedResult } from "@/type/pagination";

interface PokemonCardsTableProps {
  initialPage?: number;
  itemsPerPage?: number;
}

export function PokemonCardsTable({
  initialPage = 1,
  itemsPerPage = 10,
}: PokemonCardsTableProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [paginatedData, setPaginatedData] =
    useState<PaginatedResult<PokemonCardType> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PokemonCardType[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const fetchCards = useCallback(
    async (page: number) => {
      try {
        setLoading(true);
        setError(null);
        const data = await pokemonCardService.getPaginated({
          page,
          limit: itemsPerPage,
        });
        setPaginatedData(data);
      } catch (err) {
        setError("Erreur lors du chargement des cartes Pokemon");
        console.error("Error fetching Pokemon cards:", err);
      } finally {
        setLoading(false);
      }
    },
    [itemsPerPage],
  );

  // Fonction pour effectuer une recherche
  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);

      if (!query.trim()) {
        setIsSearching(false);
        setSearchResults([]);
        setCurrentPage(1);
        fetchCards(1);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setIsSearching(true);
        const results = await pokemonCardService.search(query);
        setSearchResults(results);
        setCurrentPage(1);
      } catch (err) {
        setError("Erreur lors de la recherche");
        console.error("Error searching Pokemon cards:", err);
      } finally {
        setLoading(false);
      }
    },
    [fetchCards],
  );

  // Fonction pour nettoyer la recherche
  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setIsSearching(false);
    setSearchResults([]);
    setCurrentPage(1);
    fetchCards(1);
  }, [fetchCards]);

  // Pagination des résultats de recherche
  const paginatedSearchResults = useMemo(() => {
    if (!isSearching || searchResults.length === 0) return null;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = searchResults.slice(startIndex, endIndex);

    const totalItems = searchResults.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return {
      data: paginatedItems,
      meta: {
        totalItems,
        itemCount: paginatedItems.length,
        itemsPerPage,
        totalPages,
        currentPage,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
    };
  }, [isSearching, searchResults, currentPage, itemsPerPage]);

  // Détermine quelles données utiliser (recherche ou pagination normale)
  const currentData = isSearching ? paginatedSearchResults : paginatedData;

  useEffect(() => {
    if (!isSearching) {
      fetchCards(currentPage);
    }
  }, [currentPage, fetchCards, isSearching]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  const renderPaginationItems = () => {
    if (!currentData) return null;

    const { totalPages, currentPage: current } = currentData.meta;
    const items = [];

    // Previous button
    if (currentData.meta.hasPreviousPage) {
      items.push(
        <PaginationItem key="previous">
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(current - 1);
            }}
          />
        </PaginationItem>,
      );
    }

    // Page numbers
    const startPage = Math.max(1, current - 2);
    const endPage = Math.min(totalPages, current + 2);

    if (startPage > 1) {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(1);
            }}
          >
            1
          </PaginationLink>
        </PaginationItem>,
      );
      if (startPage > 2) {
        items.push(<PaginationEllipsis key="ellipsis1" />);
      }
    }

    for (let page = startPage; page <= endPage; page++) {
      items.push(
        <PaginationItem key={page}>
          <PaginationLink
            href="#"
            isActive={page === current}
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(page);
            }}
          >
            {page}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(<PaginationEllipsis key="ellipsis2" />);
      }
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(totalPages);
            }}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    // Next button
    if (currentData.meta.hasNextPage) {
      items.push(
        <PaginationItem key="next">
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(current + 1);
            }}
          />
        </PaginationItem>,
      );
    }

    return items;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cartes Pokemon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-sm text-muted-foreground">Chargement...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cartes Pokemon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-sm text-red-500">{error}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentData || currentData.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cartes Pokemon</CardTitle>
          {/* Interface de recherche */}
          <div className="mt-4">
            <form
              onSubmit={handleSearchSubmit}
              className="flex gap-2"
            >
              <Input
                type="text"
                placeholder="Rechercher une carte..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit">Rechercher</Button>
              {isSearching && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearSearch}
                >
                  Effacer
                </Button>
              )}
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-sm text-muted-foreground">
              {isSearching ? "Aucun résultat trouvé" : "Aucune carte trouvée"}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Cartes Pokemon ({currentData.meta.totalItems} cartes)
          {isSearching && ` - Résultats pour "${searchQuery}"`}
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Page {currentData.meta.currentPage} sur {currentData.meta.totalPages}
        </div>
        {/* Interface de recherche */}
        <div className="mt-4">
          <form
            onSubmit={handleSearchSubmit}
            className="flex gap-2"
          >
            <Input
              type="text"
              placeholder="Rechercher une carte..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">Rechercher</Button>
            {isSearching && (
              <Button
                type="button"
                variant="outline"
                onClick={clearSearch}
              >
                Effacer
              </Button>
            )}
          </form>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Set</TableHead>
              <TableHead>Rareté</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>HP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.data.map((card) => (
              <TableRow key={card.id}>
                <TableCell>
                  {card.image ? (
                    <Image
                      src={card.image + "/low.png"}
                      alt={card.name || "Pokemon Card"}
                      width={48}
                      height={64}
                      className="object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center">
                      <span className="text-xs text-gray-500">N/A</span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {card.name || "N/A"}
                </TableCell>
                <TableCell>{card.set?.name || "N/A"}</TableCell>
                <TableCell>{card.rarity || "N/A"}</TableCell>
                <TableCell>
                  {card.types ? card.types.join(", ") : "N/A"}
                </TableCell>
                <TableCell>{card.hp || "N/A"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-6">
          <Pagination>
            <PaginationContent>{renderPaginationItems()}</PaginationContent>
          </Pagination>
        </div>
      </CardContent>
    </Card>
  );
}
