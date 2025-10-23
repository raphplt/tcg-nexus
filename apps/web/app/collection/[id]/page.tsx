"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collectionService } from "@/services/collection.service";
import { Collection } from "@/types/collection";
import Image from "next/image";
import { Star, Info } from "lucide-react";
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
import { PokemonCardType } from "@/types/cardPokemon";

const CollectionDetailPage = () => {
  const { id } = useParams();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
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

    if (id) fetchData();
  }, [id]);

  if (loading) return <div>Chargement...</div>;
  if (!collection) return <div>Collection introuvable.</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">{collection.name}</h1>
      <p className="text-gray-600 mb-6">{collection.description}</p>

      {collection.items?.length === 0 ? (
        <p className="text-gray-500">Aucun élément dans cette collection.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>PV</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Rareté</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collection.items.map((card) => {
              const pokemon: PokemonCardType = card.pokemonCard;
              return (
                <TableRow key={card.id}>
                  <TableCell className="w-24 h-32 relative">
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
                  </TableCell>
                  <TableCell>{pokemon.name ?? "?"}</TableCell>
                  <TableCell>{pokemon.hp ?? "?"}</TableCell>
                  <TableCell>{pokemon.types?.join(", ") ?? "?"}</TableCell>
                  <TableCell>{pokemon.rarity ?? "?"}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Ajouter aux favoris"
                      onClick={() => alert("Fonction favori à implémenter")}
                    >
                      <Star className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      asChild
                    >
                      <Link href={`/pokemon/${card.id}`}>
                        <Info className="w-5 h-5" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default CollectionDetailPage;
