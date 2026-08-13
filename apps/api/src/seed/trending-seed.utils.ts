const MILLISECONDS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
const MINIMUM_RECENCY_WEIGHT = 0.05;
const RECENCY_DECAY_YEARS = 3;

interface CardWithReleaseDate {
  set?: {
    releaseDate?: string;
  };
}

/**
 * Calculates a sampling weight that decays as a card's set gets older.
 *
 * The newest set receives a weight close to 1, while old or undated sets keep
 * a small non-zero chance of being sampled.
 *
 * @param card - Card whose set release date determines the weight.
 * @param newestReleaseTimestamp - Timestamp of the newest set in the catalog.
 * @returns Positive sampling weight.
 */
export function calculateCardRecencyWeight(
  card: CardWithReleaseDate,
  newestReleaseTimestamp: number,
): number {
  const releaseTimestamp = Date.parse(card.set?.releaseDate ?? "");
  if (!Number.isFinite(releaseTimestamp)) return MINIMUM_RECENCY_WEIGHT;

  const ageInYears = Math.max(
    0,
    (newestReleaseTimestamp - releaseTimestamp) / MILLISECONDS_PER_YEAR,
  );

  return MINIMUM_RECENCY_WEIGHT + Math.exp(-ageInYears / RECENCY_DECAY_YEARS);
}

/**
 * Selects unique cards randomly while strongly favoring recently released sets.
 *
 * Uses weighted random keys so every card can be selected without allowing
 * duplicates. Passing a random source makes the behavior deterministic in tests.
 *
 * @param cards - Candidate cards with their set release dates loaded.
 * @param count - Maximum number of cards to select.
 * @param random - Random number source returning values between 0 and 1.
 * @returns Randomized, recency-weighted card sample.
 */
export function sampleRecentCards<T extends CardWithReleaseDate>(
  cards: T[],
  count: number,
  random: () => number = Math.random,
): T[] {
  if (count <= 0 || cards.length === 0) return [];

  const releaseTimestamps = cards
    .map((card) => Date.parse(card.set?.releaseDate ?? ""))
    .filter(Number.isFinite);
  const newestReleaseTimestamp =
    releaseTimestamps.length > 0 ? Math.max(...releaseTimestamps) : Date.now();

  return cards
    .map((card) => {
      const weight = calculateCardRecencyWeight(card, newestReleaseTimestamp);
      const randomValue = Math.min(Math.max(random(), Number.EPSILON), 1);
      return { card, key: Math.pow(randomValue, 1 / weight) };
    })
    .sort((a, b) => b.key - a.key)
    .slice(0, Math.min(count, cards.length))
    .map(({ card }) => card);
}

/**
 * Determines how many seeded interactions should fall in the latest week.
 *
 * Recently released sets receive substantially more recent activity while old
 * sets retain a smaller randomized baseline.
 *
 * @param card - Card whose release date affects recent activity.
 * @param newestReleaseTimestamp - Timestamp of the newest set in the sample.
 * @param random - Random number source returning values between 0 and 1.
 * @returns Fraction of events assigned to the latest seven days.
 */
export function calculateRecentEventShare(
  card: CardWithReleaseDate,
  newestReleaseTimestamp: number,
  random: () => number = Math.random,
): number {
  const weight = calculateCardRecencyWeight(card, newestReleaseTimestamp);
  const normalizedRecency = Math.min(
    1,
    Math.max(0, weight - MINIMUM_RECENCY_WEIGHT),
  );
  const jitter = (random() - 0.5) * 0.04;

  return Math.min(
    0.24,
    Math.max(0.07, 0.08 + normalizedRecency * 0.14 + jitter),
  );
}
