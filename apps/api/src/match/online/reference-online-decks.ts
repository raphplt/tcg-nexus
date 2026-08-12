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
  /* ──────────────────────────────────────────────────
   * Legacy / simple presets
   * ────────────────────────────────────────────────── */
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

  /* ──────────────────────────────────────────────────
   * Competitive presets (metagame 2025-2026)
   * ────────────────────────────────────────────────── */
  {
    id: "comp-lanssorien",
    name: "Lanssorien-ex Control",
    cards: [
      // Pokémon (23)
      { tcgDexId: "sv06-128", qty: 4 }, // Fantyrm
      { tcgDexId: "sv06-129", qty: 4 }, // Dispareptil
      { tcgDexId: "sv06-130", qty: 3 }, // Lanssorien-ex
      { tcgDexId: "sv08.5-035", qty: 2 }, // Skelénox
      { tcgDexId: "sv08.5-036", qty: 2 }, // Téraclope
      { tcgDexId: "sv08.5-037", qty: 1 }, // Noctunoir
      { name: "Rozbouton", qty: 2 }, // ASC 16
      { tcgDexId: "sv06-141", qty: 1 }, // Ursaking Lune Vermeille-ex
      { name: "Favianos-ex", qty: 1 }, // ASC 142
      { tcgDexId: "sv08-076", qty: 1 }, // Latias-ex
      { tcgDexId: "sv06-095", qty: 1 }, // Fortusimia
      { tcgDexId: "sv01-118", qty: 1 }, // Brutalibré
      // Trainer (30)
      { tcgDexId: "me01-119", qty: 4 }, // Lilie's Determination
      { tcgDexId: "sv02-185", qty: 4 }, // Iono
      { tcgDexId: "me01-114", qty: 3 }, // Boss's Orders
      { tcgDexId: "sv10.5w-084", qty: 1 }, // Ludvina
      { tcgDexId: "sv05-144", qty: 4 }, // Buddy-Buddy Poffin
      { name: "Poké Registre", qty: 4 }, // ASC 198
      { tcgDexId: "sv04-160", qty: 3 }, // Counter Catcher
      { tcgDexId: "me01-131", qty: 3 }, // Ultra Ball
      { name: "Civière Nocturne", qty: 2 }, // ASC 196
      { tcgDexId: "sv06-153", qty: 2 }, // Jamming Tower
      // Energy (7)
      { tcgDexId: "sv02-191", qty: 3 }, // Luminous Energy
      { name: "Psy", qty: 2 },
      { name: "Feu", qty: 1 },
      { tcgDexId: "sv05-162", qty: 1 }, // Neo Upper Energy
    ],
  },
  {
    id: "comp-gardevoir",
    name: "Gardevoir-ex Psychic",
    cards: [
      // Pokémon (18)
      { tcgDexId: "me01-058", qty: 3 }, // Tarsal
      { tcgDexId: "me01-059", qty: 2 }, // Kirlia
      { tcgDexId: "sv01-086", qty: 2 }, // Gardevoir-ex
      { tcgDexId: "sv06-095", qty: 3 }, // Fortusimia
      { tcgDexId: "sv10.5w-044", qty: 2 }, // Viskuse
      { tcgDexId: "sv10.5w-045", qty: 1 }, // Moyade-ex
      { tcgDexId: "sv09-056", qty: 1 }, // Mélofée-ex de Lilie
      { tcgDexId: "sv03.5-151", qty: 1 }, // Mew-ex
      { tcgDexId: "me02-041", qty: 1 }, // Méga-Diancie-ex
      { tcgDexId: "sv06.5-038", qty: 1 }, // Favianos-ex
      { tcgDexId: "sv04-086", qty: 1 }, // Hurle-Queue
      // Trainer (32)
      { tcgDexId: "me01-119", qty: 4 }, // Lilie's Determination
      { tcgDexId: "sv02-185", qty: 4 }, // Iono
      { tcgDexId: "sv03-186", qty: 2 }, // Arven
      { tcgDexId: "sv04-171", qty: 1 }, // Professor Turo's Scenario
      { tcgDexId: "me01-131", qty: 4 }, // Ultra Ball
      { tcgDexId: "sv04-163", qty: 3 }, // Earthen Vessel
      { tcgDexId: "sv01-181", qty: 2 }, // Nest Ball
      { tcgDexId: "me01-125", qty: 2 }, // Rare Candy
      { tcgDexId: "sv06.5-061", qty: 2 }, // Night Stretcher
      { tcgDexId: "sv04-160", qty: 1 }, // Counter Catcher
      { tcgDexId: "sv02-188", qty: 1 }, // Super Rod
      { tcgDexId: "sv06-163", qty: 1 }, // Secret Box
      { tcgDexId: "sv02-173", qty: 2 }, // Bravery Charm
      { tcgDexId: "sv04-178", qty: 1 }, // Technical Machine: Evolution
      { tcgDexId: "sv02-171", qty: 1 }, // Artazon
      { tcgDexId: "me01-122", qty: 1 }, // Mystery Garden
      // Energy (10)
      { name: "Psy", qty: 7 },
      { name: "Obscurité", qty: 3 },
    ],
  },
  {
    id: "comp-gromago",
    name: "Gromago-ex Beatdown",
    cards: [
      // Pokémon (16)
      { tcgDexId: "sv08-097", qty: 4 }, // Gimmighoul
      { tcgDexId: "sv04-139", qty: 4 }, // Gholdengo-ex
      { tcgDexId: "me01-075", qty: 3 }, // Solrock
      { tcgDexId: "me01-074", qty: 2 }, // Lunatone
      { tcgDexId: "me02-083", qty: 1 }, // Buneary
      { tcgDexId: "me02-084", qty: 1 }, // Mega Lopunny-ex
      { name: "Favianos-ex", qty: 1 }, // ASC 142
      // Trainer (33)
      { tcgDexId: "me01-114", qty: 4 }, // Boss's Orders
      { tcgDexId: "sv05-145", qty: 2 }, // Cryptomaniac's Deciphering
      { tcgDexId: "sv04-171", qty: 2 }, // Professor Turo's Scenario
      { tcgDexId: "me01-119", qty: 2 }, // Lilie's Determination
      { tcgDexId: "sv10.5w-084", qty: 1 }, // Ludvina
      { tcgDexId: "sv06-155", qty: 1 }, // Lana's Aid
      { tcgDexId: "me01-116", qty: 4 }, // Battle Gong
      { tcgDexId: "sv01-181", qty: 4 }, // Nest Ball
      { tcgDexId: "sv02-189", qty: 4 }, // Superior Energy Retrieval
      { tcgDexId: "sv04-163", qty: 3 }, // Earthen Vessel
      { name: "Poké Registre", qty: 2 }, // ASC 198
      { tcgDexId: "sv01-184", qty: 1 }, // Picnic Basket
      { name: "Ballon", qty: 1 }, // ASC 181
      { tcgDexId: "sv02-171", qty: 2 }, // Artazon
      // Energy (11)
      { name: "Combat", qty: 8 },
      { name: "Métal", qty: 2 },
      { tcgDexId: "sv06-167", qty: 1 }, // Legacy Energy
    ],
  },
  {
    id: "comp-zoroark-n",
    name: "Zoroark-ex de N Shadow",
    cards: [
      // Pokémon (18)
      { tcgDexId: "sv09-097", qty: 4 }, // N's Zorua
      { tcgDexId: "sv09-098", qty: 4 }, // N's Zoroark-ex
      { tcgDexId: "sv09-026", qty: 2 }, // N's Darumaka
      { tcgDexId: "sv09-027", qty: 2 }, // N's Darmanitan
      { tcgDexId: "sv09-116", qty: 1 }, // N's Reshiram
      { name: "Zekrom de N", qty: 1 }, // ASC 155
      { tcgDexId: "sv06.5-039", qty: 1 }, // Pecharunt-ex
      { tcgDexId: "sv06-095", qty: 1 }, // Munkidori
      { name: "Rozbouton", qty: 1 }, // ASC 16
      { name: "Favianos-ex", qty: 1 }, // ASC 142
      // Trainer (33)
      { tcgDexId: "me01-119", qty: 4 }, // Lilie's Determination
      { tcgDexId: "me01-114", qty: 3 }, // Boss's Orders
      { tcgDexId: "sv02-185", qty: 2 }, // Iono
      { tcgDexId: "sv08-170", qty: 2 }, // Xerosic's Machinations
      { tcgDexId: "sv04-171", qty: 1 }, // Professor Turo's Scenario
      { tcgDexId: "sv09-143", qty: 1 }, // Karateka Training
      { tcgDexId: "sv05-144", qty: 4 }, // Buddy-Buddy Poffin
      { name: "Civière Nocturne", qty: 3 }, // ASC 196
      { tcgDexId: "sv09-153", qty: 2 }, // N's PP Up
      { tcgDexId: "sv04-160", qty: 1 }, // Counter Catcher
      { tcgDexId: "sv01-181", qty: 1 }, // Nest Ball
      { tcgDexId: "sv06-163", qty: 1 }, // Secret Box
      { tcgDexId: "me01-131", qty: 1 }, // Ultra Ball
      { tcgDexId: "sv01-182", qty: 1 }, // Pal Pad
      { tcgDexId: "sv06.5-063", qty: 1 }, // Power Hourglass
      { name: "Ballon", qty: 1 }, // ASC 181
      { tcgDexId: "sv01-169", qty: 1 }, // Defiance Band
      { tcgDexId: "sv09-152", qty: 1 }, // N's Castle
      { tcgDexId: "sv10-180", qty: 1 }, // Team Rocket's Watchtower
      { tcgDexId: "sv02-171", qty: 1 }, // Artazon
      // Energy (9)
      { name: "Obscurité", qty: 7 },
      { tcgDexId: "sv02-192", qty: 2 }, // Reversal Energy
    ],
  },
  {
    id: "comp-angoliath-rosemary",
    name: "Angoliath de Rosemary Darkness",
    cards: [
      // Pokémon (18)
      { tcgDexId: "sv06-095", qty: 4 }, // Munkidori
      { tcgDexId: "sv10-134", qty: 3 }, // Marnie's Impidimp
      { tcgDexId: "sv10-135", qty: 2 }, // Marnie's Morgrem
      { tcgDexId: "sv10-136", qty: 2 }, // Marnie's Grimmsnarl-ex
      { name: "Stalgamin", qty: 3 }, // ASC 46
      { tcgDexId: "sv06-053", qty: 3 }, // Froslass
      { tcgDexId: "sv06-141", qty: 1 }, // Bloodmoon Ursaluna-ex
      // Trainer (33)
      { tcgDexId: "me01-119", qty: 4 }, // Lilie's Determination
      { tcgDexId: "sv02-185", qty: 4 }, // Iono
      { tcgDexId: "sv03-186", qty: 4 }, // Arven
      { tcgDexId: "me01-114", qty: 2 }, // Boss's Orders
      { name: "Civière Nocturne", qty: 3 }, // ASC 196
      { tcgDexId: "sv04-160", qty: 2 }, // Counter Catcher
      { tcgDexId: "me01-125", qty: 2 }, // Rare Candy
      { tcgDexId: "sv05-144", qty: 2 }, // Buddy-Buddy Poffin
      { tcgDexId: "sv01-181", qty: 1 }, // Nest Ball
      { tcgDexId: "me01-131", qty: 1 }, // Ultra Ball
      { tcgDexId: "sv06-163", qty: 1 }, // Secret Box
      { tcgDexId: "sv04-178", qty: 2 }, // Technical Machine: Evolution
      { tcgDexId: "sv04-177", qty: 1 }, // Technical Machine: Devolution
      { tcgDexId: "sv10-169", qty: 3 }, // Spikemuth Arena
      { tcgDexId: "sv02-171", qty: 1 }, // Artazon
      // Energy (9)
      { name: "Obscurité", qty: 9 },
    ],
  },
  {
    id: "comp-noarfang-control",
    name: "Noarfang Control",
    cards: [
      // Pokémon (20)
      { tcgDexId: "sv07-114", qty: 3 }, // Hoothoot
      { tcgDexId: "sv07-115", qty: 3 }, // Noctowl
      { tcgDexId: "sv06-025", qty: 2 }, // Teal Mask Ogerpon-ex
      { tcgDexId: "sv05-123", qty: 2 }, // Raging Bolt-ex
      { tcgDexId: "sv07-118", qty: 2 }, // Fan Rotom
      { tcgDexId: "sv03.5-132", qty: 1 }, // Ditto
      { tcgDexId: "sv03.5-151", qty: 1 }, // Mew-ex
      { tcgDexId: "sv06-064", qty: 1 }, // Wellspring Mask Ogerpon-ex
      { name: "Favianos-ex", qty: 1 }, // ASC 142
      { tcgDexId: "sv07-111", qty: 1 }, // Raging Bolt
      { tcgDexId: "me01-104", qty: 1 }, // Mega Kangaskhan-ex
      { tcgDexId: "sv04-108", qty: 1 }, // Sandy Shocks-ex
      { tcgDexId: "sv08-076", qty: 1 }, // Latias-ex
      // Trainer (28)
      { tcgDexId: "sv07-133", qty: 4 }, // Crispin
      { tcgDexId: "sv04-170", qty: 3 }, // Professor Sada's Vitality
      { tcgDexId: "me01-114", qty: 1 }, // Boss's Orders
      { tcgDexId: "sv04-171", qty: 1 }, // Professor Turo's Scenario
      { tcgDexId: "sv01-181", qty: 4 }, // Nest Ball
      { tcgDexId: "me01-131", qty: 3 }, // Ultra Ball
      { tcgDexId: "sv04-163", qty: 2 }, // Earthen Vessel
      { name: "Civière Nocturne", qty: 2 }, // ASC 196
      { tcgDexId: "me01-115", qty: 1 }, // Energy Switch
      { tcgDexId: "sv05-157", qty: 1 }, // Prime Catcher
      { tcgDexId: "sv07-135", qty: 1 }, // Glass Trumpet
      { name: "Poké Registre", qty: 1 }, // ASC 198
      { tcgDexId: "sv01-197", qty: 1 }, // Vitality Band
      { tcgDexId: "sv07-131", qty: 2 }, // Area Zero Underdepths
      { tcgDexId: "sv02-171", qty: 1 }, // Artazon
      // Energy (12)
      { name: "Plante", qty: 5 },
      { name: "Combat", qty: 3 },
      { name: "Électrique", qty: 3 },
      { name: "Eau", qty: 1 },
    ],
  },
];
