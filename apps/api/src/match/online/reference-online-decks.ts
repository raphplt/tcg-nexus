export interface ReferenceOnlineDeckCard {
  tcgDexId?: string;
  name?: string;
  qty: number;
}

export interface ReferenceOnlineDeck {
  id: string;
  name: string;
  cards: ReferenceOnlineDeckCard[];
}

export const REFERENCE_ONLINE_DECKS: ReferenceOnlineDeck[] = [
  {
    id: "mvp-blaziken-lite",
    name: "MVP Blazing Basics",
    cards: [
      { tcgDexId: "np-6", qty: 4 },
      { tcgDexId: "xy7-5", qty: 4 },
      { tcgDexId: "swsh4-185", qty: 4 },
      { name: "Feu", qty: 24 },
      { name: "Plante", qty: 24 },
    ],
  },
  {
    id: "mvp-lucario-lite",
    name: "MVP Lucario Tempo",
    cards: [
      { tcgDexId: "xy3-107", qty: 4 },
      { tcgDexId: "swsh4-185", qty: 4 },
      { name: "Combat", qty: 26 },
      { name: "Psy", qty: 26 },
    ],
  },
];
