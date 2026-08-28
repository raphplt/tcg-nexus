import { TournamentStatus } from "src/tournament/entities/tournament.entity";

/** Accounts the presentation is driven from. */
export const DEMO_USERS = {
  laura: "laura.demo@tcg-nexus.com",
  maxime: "maxime.demo@tcg-nexus.com",
  theo: "theo.demo@tcg-nexus.com",
} as const;

/** ELO the profile badge and the progression chart must both land on. */
export const MAXIME_TARGET_ELO = 1540;

/** Tournament players register into during the demo. */
export const DEMO_OPEN_TOURNAMENT = {
  name: "Tournoi Open de Printemps — Paris 2026",
  status: TournamentStatus.REGISTRATION_OPEN,
  startsInDays: 21,
  // Comfortably ahead of the start date: past the deadline a registration is
  // only accepted as "pending", which keeps it out of the confirmed roster.
  deadlineInDays: 14,
} as const;

/** Tournament the organizer runs live, bracket and check-in included. */
export const DEMO_ONGOING_TOURNAMENT = {
  name: "Championnat de Printemps 2026 — Phase Finale",
  status: TournamentStatus.IN_PROGRESS,
} as const;

/**
 * Finished editions backing the tournament history.
 *
 * `name` carries a `{year}` placeholder resolved from the recomputed start
 * date, because the seeded names stated a year their relative dates denied.
 */
export const DEMO_PAST_TOURNAMENTS = [
  {
    name: "Tournoi d'Automne Lille {year}",
    legacyName: "Tournoi d'Automne Lille 2025",
    daysAgo: 120,
    rank: 5,
    points: 6,
    wins: 2,
    losses: 2,
    totalPlayers: 8,
  },
  {
    name: "Special Event Marseille {year}",
    legacyName: "Special Event Marseille 2025",
    daysAgo: 90,
    rank: 2,
    points: 9,
    wins: 3,
    losses: 1,
    totalPlayers: 8,
  },
  {
    name: "League Cup Lyon {year}",
    legacyName: "League Cup Lyon 2026",
    daysAgo: 60,
    rank: 3,
    points: 9,
    wins: 3,
    losses: 1,
    totalPlayers: 8,
  },
  {
    name: "Championnat Régional Paris {year}",
    legacyName: "Championnat Régional Paris 2026",
    daysAgo: 30,
    rank: 1,
    points: 12,
    wins: 4,
    losses: 0,
    totalPlayers: 8,
  },
] as const;

/**
 * Completion of the showcased master set.
 *
 * The ratio applies to `cardCount.total`, which is what the collection page
 * divides by — not the count of official cards in the extension.
 */
export const DEMO_MASTER_SET_COMPLETION = {
  setId: "sv03.5",
  ratio: 0.62,
} as const;

/** Composition of the deck put through the analyser on stage. */
export const DEMO_SHOWCASE_DECK = {
  name: "Dracaufeu ex / Pidgeot ex Compétitif",
  pokemonCount: 18,
  trainerCount: 30,
  energyCount: 12,
  pokemonTypes: ["Feu", "Fire", "Incolore", "Colorless"],
} as const;

/** Card and price curve backing the marketplace act. */
export const DEMO_PRICE_TREND = {
  cardName: "Dracaufeu",
  startPrice: 21.8,
  growth: 0.3,
  listingPrices: [24.9, 29.5, 38] as number[],
} as const;

/** Placeholder accounts appearing as sellers on the showcased listings. */
export const DEMO_SELLER_RENAMES: Record<
  string,
  { firstName: string; lastName: string }
> = {
  "test1@test.com": { firstName: "Camille", lastName: "Rousseau" },
  "test2@test.com": { firstName: "Hugo", lastName: "Lambert" },
  "test3@test.com": { firstName: "Inès", lastName: "Fabre" },
};

/** Tournaments created while building the app, hidden from the public list. */
export const DEMO_JUNK_TOURNAMENT_NAMES = [
  "Test Tournament 1",
  "Test Tournament 2",
  "Test Tournament 3",
  "Tournoi de Démonstration avec Seeding",
  "test",
];
