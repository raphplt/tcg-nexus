import React from "react";
import { H2 } from "../Shared/Titles";
import { Card } from "../ui/card";
import { trendingDecks } from "./homeMocks";
import Image from "next/image";
import { XIcon } from "lucide-react";

const TrendingDecks = () => (
  <Card className="bg-card rounded-xl shadow p-6 mt-8 card-hover">
    <div className="flex items-center justify-between mb-4">
      <H2>Decks tendances</H2>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {trendingDecks.map((deck, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-3 rounded-lg border bg-background hover:shadow-md transition group"
        >
          <div className="flex-shrink-0">
            {deck.image ? (
              <Image
                src={deck.image}
                alt={deck.name}
                width={48}
                height={48}
                className="object-cover rounded border group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                <XIcon className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{deck.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {deck.percent} - {deck.place}
            </div>
          </div>
        </div>
      ))}
    </div>
  </Card>
);

export default TrendingDecks;
