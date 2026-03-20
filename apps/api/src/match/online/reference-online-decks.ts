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
      // Dresseur (30)
      { tcgDexId: "me01-119", qty: 4 }, // Détermination de Lilie
      { tcgDexId: "sv02-185", qty: 4 }, // Mashynn
      { tcgDexId: "me01-114", qty: 3 }, // Ordres du Boss
      { tcgDexId: "sv10.5w-084", qty: 1 }, // Ludvina
      { tcgDexId: "sv05-144", qty: 4 }, // Poffin Copain-Copain
      { name: "Poké Registre", qty: 4 }, // ASC 198
      { tcgDexId: "sv04-160", qty: 3 }, // Attrape-Riposte
      { tcgDexId: "me01-131", qty: 3 }, // Hyper Ball
      { name: "Civière Nocturne", qty: 2 }, // ASC 196
      { tcgDexId: "sv06-153", qty: 2 }, // Tour de Brouillage
      // Énergie (7)
      { tcgDexId: "sv02-191", qty: 3 }, // Énergie Lumineuse
      { name: "Psy", qty: 2 },
      { name: "Feu", qty: 1 },
      { tcgDexId: "sv05-162", qty: 1 }, // Néo-Énergie Sup
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
      // Dresseur (32)
      { tcgDexId: "me01-119", qty: 4 }, // Détermination de Lilie
      { tcgDexId: "sv02-185", qty: 4 }, // Mashynn
      { tcgDexId: "sv03-186", qty: 2 }, // Pepper
      { tcgDexId: "sv04-171", qty: 1 }, // Plan du Professeur Turum
      { tcgDexId: "me01-131", qty: 4 }, // Hyper Ball
      { tcgDexId: "sv04-163", qty: 3 }, // Urne Terrestre
      { tcgDexId: "sv01-181", qty: 2 }, // Faiblo Ball
      { tcgDexId: "me01-125", qty: 2 }, // Super Bonbon
      { tcgDexId: "sv06.5-061", qty: 2 }, // Civière Nocturne
      { tcgDexId: "sv04-160", qty: 1 }, // Attrape-Riposte
      { tcgDexId: "sv02-188", qty: 1 }, // Méga Canne
      { tcgDexId: "sv06-163", qty: 1 }, // Boîte à Secrets
      { tcgDexId: "sv02-173", qty: 2 }, // Amulette Bravoure
      { tcgDexId: "sv04-178", qty: 1 }, // Capsule Technique : Évolution
      { tcgDexId: "sv02-171", qty: 1 }, // Cuencia
      { tcgDexId: "me01-122", qty: 1 }, // Jardin Mystère
      // Énergie (10)
      { name: "Psy", qty: 7 },
      { name: "Obscurité", qty: 3 },
    ],
  },
  {
    id: "comp-gromago",
    name: "Gromago-ex Beatdown",
    cards: [
      // Pokémon (16)
      { tcgDexId: "sv08-097", qty: 4 }, // Mordudor
      { tcgDexId: "sv04-139", qty: 4 }, // Gromago-ex
      { tcgDexId: "me01-075", qty: 3 }, // Solaroc
      { tcgDexId: "me01-074", qty: 2 }, // Séléroc
      { tcgDexId: "me02-083", qty: 1 }, // Laporeille
      { tcgDexId: "me02-084", qty: 1 }, // Méga-Lockpin-ex
      { name: "Favianos-ex", qty: 1 }, // ASC 142
      // Dresseur (33)
      { tcgDexId: "me01-114", qty: 4 }, // Ordres du Boss
      { tcgDexId: "sv05-145", qty: 2 }, // Décodage de Décryptomane
      { tcgDexId: "sv04-171", qty: 2 }, // Plan du Professeur Turum
      { tcgDexId: "me01-119", qty: 2 }, // Détermination de Lilie
      { tcgDexId: "sv10.5w-084", qty: 1 }, // Ludvina
      { tcgDexId: "sv06-155", qty: 1 }, // Soutien de Néphie
      { tcgDexId: "me01-116", qty: 4 }, // Gong de Combat
      { tcgDexId: "sv01-181", qty: 4 }, // Faiblo Ball
      { tcgDexId: "sv02-189", qty: 4 }, // Récupération d'Énergie Supérieure
      { tcgDexId: "sv04-163", qty: 3 }, // Urne Terrestre
      { name: "Poké Registre", qty: 2 }, // ASC 198
      { tcgDexId: "sv01-184", qty: 1 }, // Panier de Pique-Nique
      { name: "Ballon", qty: 1 }, // ASC 181
      { tcgDexId: "sv02-171", qty: 2 }, // Cuencia
      // Énergie (11)
      { name: "Combat", qty: 8 },
      { name: "Métal", qty: 2 },
      { tcgDexId: "sv06-167", qty: 1 }, // Énergie Héritage
    ],
  },
  {
    id: "comp-zoroark-n",
    name: "Zoroark-ex de N Shadow",
    cards: [
      // Pokémon (18)
      { tcgDexId: "sv09-097", qty: 4 }, // Zorua de N
      { tcgDexId: "sv09-098", qty: 4 }, // Zoroark-ex de N
      { tcgDexId: "sv09-026", qty: 2 }, // Darumarond de N
      { tcgDexId: "sv09-027", qty: 2 }, // Darumacho de N
      { tcgDexId: "sv09-116", qty: 1 }, // Reshiram de N
      { name: "Zekrom de N", qty: 1 }, // ASC 155
      { tcgDexId: "sv06.5-039", qty: 1 }, // Pêchaminus-ex
      { tcgDexId: "sv06-095", qty: 1 }, // Fortusimia
      { name: "Rozbouton", qty: 1 }, // ASC 16
      { name: "Favianos-ex", qty: 1 }, // ASC 142
      // Dresseur (33)
      { tcgDexId: "me01-119", qty: 4 }, // Détermination de Lilie
      { tcgDexId: "me01-114", qty: 3 }, // Ordres du Boss
      { tcgDexId: "sv02-185", qty: 2 }, // Mashynn
      { tcgDexId: "sv08-170", qty: 2 }, // Cyano
      { tcgDexId: "sv04-171", qty: 1 }, // Plan du Professeur Turum
      { tcgDexId: "sv09-143", qty: 1 }, // Entraînement de Karatéka
      { tcgDexId: "sv05-144", qty: 4 }, // Poffin Copain-Copain
      { name: "Civière Nocturne", qty: 3 }, // ASC 196
      { tcgDexId: "sv09-153", qty: 2 }, // PP Plus de N
      { tcgDexId: "sv04-160", qty: 1 }, // Attrape-Riposte
      { tcgDexId: "sv01-181", qty: 1 }, // Faiblo Ball
      { tcgDexId: "sv06-163", qty: 1 }, // Boîte à Secrets
      { tcgDexId: "me01-131", qty: 1 }, // Hyper Ball
      { tcgDexId: "sv01-182", qty: 1 }, // Registre Ami
      { tcgDexId: "sv06.5-063", qty: 1 }, // Sablier du Pouvoir
      { name: "Ballon", qty: 1 }, // ASC 181
      { tcgDexId: "sv01-169", qty: 1 }, // Bandeau de Défi
      { tcgDexId: "sv09-152", qty: 1 }, // Palais de N
      { tcgDexId: "sv10-180", qty: 1 }, // Tour d'Observation Team Rocket
      { tcgDexId: "sv02-171", qty: 1 }, // Cuencia
      // Énergie (9)
      { name: "Obscurité", qty: 7 },
      { tcgDexId: "sv02-192", qty: 2 }, // Énergie Inversion
    ],
  },
  {
    id: "comp-angoliath-rosemary",
    name: "Angoliath de Rosemary Darkness",
    cards: [
      // Pokémon (18)
      { tcgDexId: "sv06-095", qty: 4 }, // Fortusimia
      { tcgDexId: "sv10-134", qty: 3 }, // Grimalin de Rosemary
      { tcgDexId: "sv10-135", qty: 2 }, // Fourbelin de Rosemary
      { tcgDexId: "sv10-136", qty: 2 }, // Angoliath-ex de Rosemary
      { name: "Stalgamin", qty: 3 }, // ASC 46
      { tcgDexId: "sv06-053", qty: 3 }, // Momartik
      { tcgDexId: "sv06-141", qty: 1 }, // Ursaking Lune Vermeille-ex
      // Dresseur (33)
      { tcgDexId: "me01-119", qty: 4 }, // Détermination de Lilie
      { tcgDexId: "sv02-185", qty: 4 }, // Mashynn
      { tcgDexId: "sv03-186", qty: 4 }, // Pepper
      { tcgDexId: "me01-114", qty: 2 }, // Ordres du Boss
      { name: "Civière Nocturne", qty: 3 }, // ASC 196
      { tcgDexId: "sv04-160", qty: 2 }, // Attrape-Riposte
      { tcgDexId: "me01-125", qty: 2 }, // Super Bonbon
      { tcgDexId: "sv05-144", qty: 2 }, // Poffin Copain-Copain
      { tcgDexId: "sv01-181", qty: 1 }, // Faiblo Ball
      { tcgDexId: "me01-131", qty: 1 }, // Hyper Ball
      { tcgDexId: "sv06-163", qty: 1 }, // Boîte à Secrets
      { tcgDexId: "sv04-178", qty: 2 }, // Capsule Technique : Évolution
      { tcgDexId: "sv04-177", qty: 1 }, // Capsule Technique : Dés-Évolution
      { tcgDexId: "sv10-169", qty: 3 }, // Arène de Smashings
      { tcgDexId: "sv02-171", qty: 1 }, // Cuencia
      // Énergie (9)
      { name: "Obscurité", qty: 9 },
    ],
  },
  {
    id: "comp-noarfang-control",
    name: "Noarfang Control",
    cards: [
      // Pokémon (20)
      { tcgDexId: "sv07-114", qty: 3 }, // Hoothoot
      { tcgDexId: "sv07-115", qty: 3 }, // Noarfang
      { tcgDexId: "sv06-025", qty: 2 }, // Ogerpon Masque Turquoise-ex
      { tcgDexId: "sv05-123", qty: 2 }, // Ire-Foudre-ex
      { tcgDexId: "sv07-118", qty: 2 }, // Motisma Hélice
      { tcgDexId: "sv03.5-132", qty: 1 }, // Métamorph
      { tcgDexId: "sv03.5-151", qty: 1 }, // Mew-ex
      { tcgDexId: "sv06-064", qty: 1 }, // Ogerpon Masque du Puits-ex
      { name: "Favianos-ex", qty: 1 }, // ASC 142
      { tcgDexId: "sv07-111", qty: 1 }, // Ire-Foudre
      { tcgDexId: "me01-104", qty: 1 }, // Méga-Kangourex-ex
      { tcgDexId: "sv04-108", qty: 1 }, // Pelage-Sablé-ex
      { tcgDexId: "sv08-076", qty: 1 }, // Latias-ex
      // Dresseur (28)
      { tcgDexId: "sv07-133", qty: 4 }, // Rubépin
      { tcgDexId: "sv04-170", qty: 3 }, // Vitalité de la Professeure Olim
      { tcgDexId: "me01-114", qty: 1 }, // Ordres du Boss
      { tcgDexId: "sv04-171", qty: 1 }, // Plan du Professeur Turum
      { tcgDexId: "sv01-181", qty: 4 }, // Faiblo Ball
      { tcgDexId: "me01-131", qty: 3 }, // Hyper Ball
      { tcgDexId: "sv04-163", qty: 2 }, // Urne Terrestre
      { name: "Civière Nocturne", qty: 2 }, // ASC 196
      { tcgDexId: "me01-115", qty: 1 }, // Échange d'Énergie
      { tcgDexId: "sv05-157", qty: 1 }, // Attrape-Ultime
      { tcgDexId: "sv07-135", qty: 1 }, // Trompette de Verre
      { name: "Poké Registre", qty: 1 }, // ASC 198
      { tcgDexId: "sv01-197", qty: 1 }, // Bandeau Vitalité
      { tcgDexId: "sv07-131", qty: 2 }, // Abîme Zéro
      { tcgDexId: "sv02-171", qty: 1 }, // Cuencia
      // Énergie (12)
      { name: "Plante", qty: 5 },
      { name: "Combat", qty: 3 },
      { name: "Électrique", qty: 3 },
      { name: "Eau", qty: 1 },
    ],
  },
];
