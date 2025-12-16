import { Deck } from "@/types/Decks";
import { Card } from "@/components/ui/card";

interface DeckStatsProps {
  deck: Deck;
}

const StatBlock = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg border bg-card/70 p-3">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className="text-2xl font-semibold">{value}</p>
  </div>
);

export function DeckStats({ deck }: DeckStatsProps) {
  const totalCards = deck.cards?.reduce((acc, c) => acc + c.qty, 0) || 0;
  const mainCards = deck.cards?.filter((c) => c.role === "main") || [];
  const sideCards = deck.cards?.filter((c) => c.role === "side") || [];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4">
      <StatBlock label="Total cartes" value={totalCards} />
      <StatBlock
        label="Principal"
        value={mainCards.reduce((acc, c) => acc + c.qty, 0)}
      />
      <StatBlock
        label="Side"
        value={sideCards.reduce((acc, c) => acc + c.qty, 0)}
      />
      <StatBlock label="Variétés" value={deck.cards?.length || 0} />
    </div>
  );
}
