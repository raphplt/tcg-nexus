"use client";
import React from "react";
import Image from "next/image";
import { PokemonCardType } from "@/types/cardPokemon";
import { getCardImage } from "@/utils/images";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import RatingChart from "./RatingChart";
import { typeToImage } from "@/utils/images";
import { slugify } from "@/utils/text";
import {
  Heart,
  Plus,
  ShoppingCart,
  Zap,
  Sword,
  Star,
  Calendar,
  User,
  ExternalLink,
} from "lucide-react";

interface PokemonCardDetailProps {
  card: PokemonCardType;
}

const PokemonCardDetail: React.FC<PokemonCardDetailProps> = ({ card }) => {


  const safeRender = (value: any): string => {
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value);
    }
    return "";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="hero-gradient py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="flex justify-center relative w-full h-96">
              <Image
                src={getCardImage(card)}
                alt={card.name || "Carte Pokémon"}
                fill
                className="object-contain"
                priority
              />
            </div>

            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
                  {safeRender(card.name)}
                </h1>
                <div className="flex flex-wrap gap-2 mb-4">
                  {Array.isArray(card.types) &&
                    card.types.map((type) => (
                      <Badge
                        key={type}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <Image
                          src={typeToImage[slugify(type.toLowerCase())] || ""}
                          alt={type}
                          width={16}
                          height={16}
                        />
                        {type}
                      </Badge>
                    ))}
                </div>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    <span>{safeRender(card.rarity)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>{safeRender(card.illustrator)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{safeRender(card.set.name)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Ajouter aux favoris
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter à la collection
                </Button>
                <Button
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Voir les ventes
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <RatingChart cardName={safeRender(card.name)} />
                {/* <PriceChart cardName={safeRender(card.name)} /> */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Attacks */}
            {Array.isArray(card.attacks) && card.attacks.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Sword className="w-6 h-6" />
                    Attaques
                  </h2>
                  <div className="space-y-4">
                    {card.attacks.map((attack, index) => (
                      <div
                        key={index}
                        className="attack-section"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex gap-1">
                            {attack.cost.map((energy, i) => (
                              <Image
                                key={i}
                                src={
                                  typeToImage[slugify(energy.toLowerCase())] ||
                                  ""
                                }
                                alt={energy}
                                width={20}
                                height={20}
                              />
                            ))}
                          </div>
                          <h3 className="font-semibold">{attack.name}</h3>
                          {attack.damage && (
                            <Badge variant="destructive">{attack.damage}</Badge>
                          )}
                        </div>
                        {attack.effect && (
                          <p className="text-muted-foreground text-sm">
                            {attack.effect}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Weaknesses & Resistances */}
            {Array.isArray(card.weaknesses) && card.weaknesses.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Zap className="w-6 h-6" />
                    Faiblesses
                  </h2>
                  <div className="space-y-2">
                    {card.weaknesses.map((weakness, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3"
                      >
                        <Badge
                          variant="destructive"
                          className="flex items-center gap-1"
                        >
                          <Image
                            src={
                              typeToImage[
                                slugify(weakness.type.toLowerCase())
                              ] || ""
                            }
                            alt={weakness.type}
                            width={16}
                            height={16}
                          />
                          {weakness.type}
                        </Badge>
                        <span className="font-semibold">{weakness.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Card Variants */}
            {card.variants && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-6">Variantes</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(card.variants).map(
                      ([variant, available]) => (
                        <div
                          key={variant}
                          className={`p-3 rounded-lg border ${
                            available
                              ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                              : "bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                available ? "bg-green-500" : "bg-gray-400"
                              }`}
                            />
                            <span className="capitalize font-medium">
                              {variant === "firstEdition"
                                ? "Première Édition"
                                : variant}
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Set Information */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4">Informations du Set</h3>
                <div className="space-y-3">
                  <div>
                    <span className="font-semibold">Nom:</span>
                    <p className="text-muted-foreground">
                      {safeRender(card.set.name)}
                    </p>
                  </div>
                  {card.set.releaseDate && (
                    <div>
                      <span className="font-semibold">Date de sortie:</span>
                      <p className="text-muted-foreground">
                        {new Date(card.set.releaseDate).toLocaleDateString(
                          "fr-FR",
                        )}
                      </p>
                    </div>
                  )}
                  {card.set.cardCount && (
                    <div>
                      <span className="font-semibold">Nombre de cartes:</span>
                      <p className="text-muted-foreground">
                        {card.set.cardCount.total} total (
                        {card.set.cardCount.official} officielles)
                      </p>
                    </div>
                  )}
                  {card.set.logo && (
                    <div className="mt-4">
                      <div className="relative w-16 h-16">
                        <Image
                          src={card.set.logo}
                          alt={`Logo ${card.set.name}`}
                          fill
                          className="object-contain"
                          style={{ objectFit: "contain" }}
                          sizes="64px"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Legal Status */}
            {card.legal && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4">Statut Légal</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          card.legal.standard ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                      <span>Standard</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          card.legal.expanded ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                      <span>Expanded</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* External Links */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4">Liens Externes</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() =>
                      window.open(
                        `https://tcgdex.net/fr/cards/${card.tcgDexId}`,
                        "_blank",
                      )
                    }
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Voir sur TCGdex
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PokemonCardDetail;
