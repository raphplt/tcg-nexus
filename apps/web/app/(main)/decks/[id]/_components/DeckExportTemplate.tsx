"use client";

import React, { forwardRef } from "react";
import { Deck } from "@/types/Decks";
import { getCardImage } from "@/utils/images";
import { Badge } from "@/components/ui/badge";

interface DeckExportTemplateProps {
  deck: Deck;
  includeImages: boolean;
}

const normalizeCategory = (cat?: string) =>
  cat?.toLowerCase().replace("é", "e") || "";

export const DeckExportTemplate = forwardRef<HTMLDivElement, DeckExportTemplateProps>(
  ({ deck, includeImages }, ref) => {
    const mainCards = deck.cards?.filter((c) => c.role === "main") || [];
    const sideCards = deck.cards?.filter((c) => c.role === "side") || [];

    const pokemonCards = mainCards.filter(
      (c) => normalizeCategory(c.card?.category) === "pokemon",
    );
    const trainerCards = mainCards.filter(
      (c) => normalizeCategory(c.card?.category) === "trainer",
    );
    const energyCards = mainCards.filter(
      (c) => normalizeCategory(c.card?.category) === "energy",
    );
    const otherCards = mainCards.filter((c) => {
      const cat = normalizeCategory(c.card?.category);
      return cat !== "pokemon" && cat !== "trainer" && cat !== "energy";
    });

    const totalMain = mainCards.reduce((acc, c) => acc + c.qty, 0);

    return (
      <div 
        ref={ref} 
        className="p-8 bg-white text-black font-sans" 
        style={{ width: "800px", minHeight: "1100px" }}
      >
        {/* Header */}
        <div className="border-b-2 border-primary pb-4 mb-6">
          <h1 className="text-3xl font-bold uppercase tracking-tight">{deck.name}</h1>
          <div className="flex justify-between items-center mt-2 text-sm text-gray-600">
            <div className="flex gap-4">
              <span><strong>Format:</strong> {deck.format?.type}</span>
              <span><strong>Auteur:</strong> {deck.user?.firstName} {deck.user?.lastName}</span>
            </div>
            <span>{new Date().toLocaleDateString("fr-FR")}</span>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-100 p-3 rounded text-center">
            <div className="text-sm text-gray-500 uppercase">Total</div>
            <div className="text-xl font-bold">{totalMain}</div>
          </div>
          <div className="bg-gray-100 p-3 rounded text-center">
            <div className="text-sm text-gray-500 uppercase">Pokémon</div>
            <div className="text-xl font-bold">{pokemonCards.reduce((acc, c) => acc + c.qty, 0)}</div>
          </div>
          <div className="bg-gray-100 p-3 rounded text-center">
            <div className="text-sm text-gray-500 uppercase">Dresseurs</div>
            <div className="text-xl font-bold">{trainerCards.reduce((acc, c) => acc + c.qty, 0)}</div>
          </div>
          <div className="bg-gray-100 p-3 rounded text-center">
            <div className="text-sm text-gray-500 uppercase">Energies</div>
            <div className="text-xl font-bold">{energyCards.reduce((acc, c) => acc + c.qty, 0)}</div>
          </div>
        </div>

        {/* Layout: 2 columns for card lists */}
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-6">
            <CategorySection title="Pokémon" cards={pokemonCards} includeImages={includeImages} />
            <CategorySection title="Energies" cards={energyCards} includeImages={includeImages} />
          </div>
          <div className="space-y-6">
            <CategorySection title="Dresseurs" cards={trainerCards} includeImages={includeImages} />
            {otherCards.length > 0 && <CategorySection title="Autres" cards={otherCards} includeImages={includeImages} />}
            {sideCards.length > 0 && <CategorySection title="Reserve (Side)" cards={sideCards} includeImages={includeImages} />}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-4 border-t text-xs text-gray-400 flex justify-between">
          <div>Généré via TCG Nexus - Votre plateforme TCG</div>
          <div>https://tcg-nexus.org</div>
        </div>
      </div>
    );
  }
);

DeckExportTemplate.displayName = "DeckExportTemplate";

function CategorySection({ 
  title, 
  cards, 
  includeImages 
}: { 
  title: string; 
  cards: any[]; 
  includeImages: boolean 
}) {
  if (cards.length === 0) return null;

  const total = cards.reduce((acc, c) => acc + c.qty, 0);

  return (
    <div>
      <h2 className="text-lg font-bold border-b mb-3 flex justify-between">
        <span>{title}</span>
        <span className="text-gray-400 font-normal">{total}</span>
      </h2>
      <div className="space-y-2">
        {cards.map((deckCard) => (
          <div key={deckCard.id} className="flex items-center gap-2">
            <div className="font-bold w-6 text-right shrink-0">{deckCard.qty}x</div>
            {includeImages && (
              <div className="w-8 h-11 relative bg-gray-100 rounded overflow-hidden shrink-0 border">
                <img
                  src={getCardImage(deckCard.card, "low")}
                  alt=""
                  className="object-contain w-full h-full"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{deckCard.card?.name}</div>
              <div className="text-[10px] text-gray-500 flex gap-2">
                <span>{deckCard.card?.set?.name}</span>
                <span>{deckCard.card?.set?.id}-{deckCard.card?.localId}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
