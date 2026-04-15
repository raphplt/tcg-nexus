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
        data-export-root
        className="p-10 bg-slate-950 text-white font-sans" 
        style={{ 
          width: "1000px", // Wider for a nice grid
          minHeight: "800px",
          "--background": "#020617",
          "--foreground": "#ffffff",
        } as React.CSSProperties}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          [data-export-root], [data-export-root] * {
            --background: #020617 !important;
            --foreground: #ffffff !important;
            background-color: transparent;
            color: #ffffff !important;
          }
          .card-grid {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 20px;
          }
          .card-container {
            position: relative;
            aspect-ratio: 2.5/3.5;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            background: #1e293b;
          }
          .card-qty-badge {
            position: absolute;
            bottom: 8px;
            right: 8px;
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 900;
            font-size: 14px;
            border: 1px solid rgba(255,255,255,0.2);
            z-index: 10;
          }
          .deck-title {
            font-size: 32px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: -0.02em;
            margin-bottom: 30px;
            padding-left: 0;
          }
        ` }} />

        <div className="deck-title">
          {deck.name}
          <div className="text-sm font-medium opacity-50 mt-1 uppercase tracking-widest">
            {deck.format?.type} • {totalMain} CARTES
          </div>
        </div>

        <div className="card-grid">
          {mainCards.map((deckCard) => (
            <div key={deckCard.id} className="card-container">
              <img
                src={getCardImage(deckCard.card, "high")}
                alt={deckCard.card?.name}
                className="w-full h-full object-cover"
              />
              <div className="card-qty-badge">×{deckCard.qty}</div>
            </div>
          ))}
        </div>

        {sideCards.length > 0 && (
          <div className="mt-16">
            <div className="text-xl font-black uppercase mb-6 opacity-30 tracking-tighter">Reserve / Side Deck</div>
            <div className="card-grid">
              {sideCards.map((deckCard) => (
                <div key={deckCard.id} className="card-container opacity-80">
                  <img
                    src={getCardImage(deckCard.card, "high")}
                    alt={deckCard.card?.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="card-qty-badge">×{deckCard.qty}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-16 pt-8 border-t border-white/10 text-right text-xs font-bold uppercase tracking-widest opacity-30">
          Generated via TCG Nexus
        </div>
      </div>
    );
  }
);

DeckExportTemplate.displayName = "DeckExportTemplate";
