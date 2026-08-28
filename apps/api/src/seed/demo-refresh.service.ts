import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Card } from "src/card/entities/card.entity";
import {
  CardStateCode,
  CardState as CardStateEntity,
} from "src/card-state/entities/card-state.entity";
import { Collection } from "src/collection/entities/collection.entity";
import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
import { Currency } from "src/common/enums/currency";
import { DeckCardRole } from "src/common/enums/deckCardRole";
import { ListingStatus } from "src/common/enums/listing-status";
import { CardState, PokemonCardsType } from "src/common/enums/pokemonCardsType";
import { ProductKind } from "src/common/enums/product-kind";
import { Deck } from "src/deck/entities/deck.entity";
import { DeckCard } from "src/deck-card/entities/deck-card.entity";
import { Listing } from "src/marketplace/entities/listing.entity";
import { PriceHistory } from "src/marketplace/entities/price-history.entity";
import { Player } from "src/player/entities/player.entity";
import { RankedMatchHistory } from "src/ranking/entities/ranked-match-history.entity";
import { Ranking } from "src/ranking/entities/ranking.entity";
import { Tournament } from "src/tournament/entities/tournament.entity";
import { TournamentRegistration } from "src/tournament/entities/tournament-registration.entity";
import { RegistrationStatus } from "src/tournament/entities/tournament-registration.entity";
import { User } from "src/user/entities/user.entity";
import { In, Not, Repository } from "typeorm";
import {
  DEMO_JUNK_TOURNAMENT_NAMES,
  DEMO_MASTER_SET_COMPLETION,
  DEMO_ONGOING_TOURNAMENT,
  DEMO_OPEN_TOURNAMENT,
  DEMO_PAST_TOURNAMENTS,
  DEMO_PRICE_TREND,
  DEMO_SELLER_RENAMES,
  DEMO_SHOWCASE_DECK,
  DEMO_USERS,
  MAXIME_TARGET_ELO,
} from "./demo-refresh.constants";

const DAY_MS = 86_400_000;

/** Outcome of a refresh run, one line per step, returned to the caller. */
export interface DemoRefreshReport {
  steps: string[];
  warnings: string[];
}

/**
 * Brings the demo dataset back to the state the presentation script expects.
 *
 * The dataset seeded by `SeedService.seedDemoDataset` stores absolute dates and
 * only creates rows that do not exist yet, so it drifts as days pass and
 * re-running it fixes nothing. This service is the counterpart: idempotent,
 * non-destructive for anything outside the demo fixtures, and safe to run again
 * the morning of a presentation.
 */
@Injectable()
export class DemoRefreshService {
  private readonly logger = new Logger(DemoRefreshService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    @InjectRepository(Tournament)
    private readonly tournamentRepository: Repository<Tournament>,
    @InjectRepository(TournamentRegistration)
    private readonly registrationRepository: Repository<TournamentRegistration>,
    @InjectRepository(Ranking)
    private readonly rankingRepository: Repository<Ranking>,
    @InjectRepository(RankedMatchHistory)
    private readonly rankedHistoryRepository: Repository<RankedMatchHistory>,
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
    @InjectRepository(CollectionItem)
    private readonly collectionItemRepository: Repository<CollectionItem>,
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    @InjectRepository(CardStateEntity)
    private readonly cardStateRepository: Repository<CardStateEntity>,
    @InjectRepository(Deck)
    private readonly deckRepository: Repository<Deck>,
    @InjectRepository(DeckCard)
    private readonly deckCardRepository: Repository<DeckCard>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @InjectRepository(PriceHistory)
    private readonly priceHistoryRepository: Repository<PriceHistory>,
  ) {}

  /**
   * Runs every refresh step, reporting what changed.
   *
   * Each step is isolated: a step that cannot find its fixture records a
   * warning and the run continues, so a partially seeded database still gets
   * everything the rest of the steps can fix.
   *
   * @param now - Reference instant every relative date is computed from.
   * @returns One line per step, plus the warnings raised along the way.
   */
  async refresh(now: Date = new Date()): Promise<DemoRefreshReport> {
    const report: DemoRefreshReport = { steps: [], warnings: [] };

    const steps: Array<[string, () => Promise<string>]> = [
      ["personas", () => this.assertPersonas()],
      ["tournament dates", () => this.refreshTournamentDates(now)],
      ["open registrations", () => this.clearShowcaseRegistration()],
      ["past tournament fields", () => this.fillPastTournaments()],
      ["elo history", () => this.rebuildEloHistory(now)],
      ["master set", () => this.refreshMasterSet()],
      ["empty master sets", () => this.dropEmptyMasterSets()],
      ["showcase deck", () => this.rebuildShowcaseDeck()],
      ["featured card", () => this.refreshFeaturedCard(now)],
      ["seller names", () => this.renameTestSellers()],
      ["junk tournaments", () => this.hideJunkTournaments()],
    ];

    for (const [label, run] of steps) {
      try {
        report.steps.push(await run());
      } catch (error) {
        const message = `${label}: ${(error as Error).message}`;
        report.warnings.push(message);
        this.logger.warn(message);
      }
    }

    return report;
  }

  /** Loads a demo persona, failing loudly when the dataset was never seeded. */
  private async requireUser(email: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new Error(
        `demo user ${email} is missing — run the demo seed before refreshing`,
      );
    }
    return user;
  }

  private async assertPersonas(): Promise<string> {
    for (const email of Object.values(DEMO_USERS)) {
      await this.requireUser(email);
    }
    return `personas present: ${Object.values(DEMO_USERS).join(", ")}`;
  }

  /**
   * Recomputes every demo tournament date relative to the run, and realigns the
   * year in the names of the past editions with the dates they now carry.
   */
  private async refreshTournamentDates(now: Date): Promise<string> {
    const touched: string[] = [];
    const nowMs = now.getTime();

    const open = await this.tournamentRepository.findOne({
      where: { name: DEMO_OPEN_TOURNAMENT.name },
    });
    if (open) {
      open.startDate = new Date(nowMs + DEMO_OPEN_TOURNAMENT.startsInDays * DAY_MS);
      open.endDate = new Date(open.startDate.getTime() + DAY_MS);
      open.registrationDeadline = new Date(
        nowMs + DEMO_OPEN_TOURNAMENT.deadlineInDays * DAY_MS,
      );
      open.status = DEMO_OPEN_TOURNAMENT.status;
      open.isFinished = false;
      open.isPublic = true;
      await this.tournamentRepository.save(open);
      touched.push(open.name);
    }

    const ongoing = await this.tournamentRepository.findOne({
      where: { name: DEMO_ONGOING_TOURNAMENT.name },
    });
    if (ongoing) {
      // Started an hour ago so the tournament reads as live, and closing
      // tomorrow so no countdown shows a negative value on stage.
      ongoing.startDate = new Date(nowMs - 3_600_000);
      ongoing.endDate = new Date(nowMs + DAY_MS);
      ongoing.status = DEMO_ONGOING_TOURNAMENT.status;
      ongoing.currentRound = 1;
      ongoing.totalRounds = 3;
      ongoing.isFinished = false;
      ongoing.isPublic = true;
      await this.tournamentRepository.save(ongoing);
      touched.push(ongoing.name);
    }

    for (const past of DEMO_PAST_TOURNAMENTS) {
      const tournament = await this.tournamentRepository.findOne({
        where: { name: In([past.name, past.legacyName]) },
      });
      if (!tournament) {
        continue;
      }
      const startDate = new Date(nowMs - past.daysAgo * DAY_MS);
      tournament.startDate = startDate;
      tournament.endDate = new Date(startDate.getTime() + DAY_MS);
      // The seeded names carried a year the relative dates contradicted.
      tournament.name = past.name.replace(
        "{year}",
        String(startDate.getFullYear()),
      );
      await this.tournamentRepository.save(tournament);
      touched.push(tournament.name);
    }

    return `dates realigned on ${touched.length} tournaments`;
  }

  /**
   * Removes the showcase player from the open tournament so the presentation
   * can register live. A confirmed registration disables the button entirely.
   */
  private async clearShowcaseRegistration(): Promise<string> {
    const maxime = await this.requireUser(DEMO_USERS.maxime);
    const tournament = await this.tournamentRepository.findOne({
      where: { name: DEMO_OPEN_TOURNAMENT.name },
      relations: ["players"],
    });
    const player = await this.playerRepository.findOne({
      where: { user: { id: maxime.id } },
    });

    if (!tournament || !player) {
      return "open tournament or player missing, nothing to clear";
    }

    const removed = await this.registrationRepository.delete({
      tournament: { id: tournament.id },
      player: { id: player.id },
    });

    tournament.players = (tournament.players ?? []).filter(
      (entry) => entry.id !== player.id,
    );
    await this.tournamentRepository.save(tournament);

    await this.rankingRepository.delete({
      tournament: { id: tournament.id },
      player: { id: player.id },
    });

    return `open tournament: ${removed.affected ?? 0} registration(s) cleared for ${maxime.email}`;
  }

  /**
   * Gives the finished tournaments a full roster.
   *
   * They were seeded with the showcase player alone, so the history read
   * "rank 3 of 1 participant" on screen.
   */
  private async fillPastTournaments(): Promise<string> {
    const fillers = await this.playerRepository.find({
      where: { user: { email: Not(In(Object.values(DEMO_USERS))) } },
      relations: ["user"],
      take: 12,
      order: { id: "ASC" },
    });

    let added = 0;
    for (const past of DEMO_PAST_TOURNAMENTS) {
      const tournament = await this.tournamentRepository.findOne({
        where: {
          name: In([
            past.name.replace("{year}", String(new Date().getFullYear())),
            past.name,
            past.legacyName,
          ]),
        },
        relations: ["players"],
      });
      if (!tournament) {
        continue;
      }

      const existing = await this.registrationRepository.find({
        where: { tournament: { id: tournament.id } },
        relations: ["player"],
      });
      const known = new Set(existing.map((entry) => entry.player?.id));
      const missing = fillers.filter((player) => !known.has(player.id));

      const rankings = await this.rankingRepository.find({
        where: { tournament: { id: tournament.id } },
      });
      // Ranks are a standing, not a counter: fillers take the places left free
      // around the one the showcase player finished at.
      const takenRanks = new Set(rankings.map((entry) => entry.rank));
      const freeRanks: number[] = [];
      for (let rank = 1; rank <= past.totalPlayers; rank += 1) {
        if (!takenRanks.has(rank)) {
          freeRanks.push(rank);
        }
      }

      for (const player of missing.slice(0, past.totalPlayers - known.size)) {
        await this.registrationRepository.save(
          this.registrationRepository.create({
            tournament,
            player,
            status: RegistrationStatus.CONFIRMED,
            paymentCompleted: true,
            checkedIn: true,
          }),
        );

        const alreadyRanked = await this.rankingRepository.findOne({
          where: {
            tournament: { id: tournament.id },
            player: { id: player.id },
          },
        });
        if (!alreadyRanked) {
          const rank = freeRanks.shift() ?? past.totalPlayers;
          // Points fall as the rank drops, so the standings read consistently.
          const wins = Math.max(0, past.totalPlayers - rank - 1);
          await this.rankingRepository.save(
            this.rankingRepository.create({
              tournament,
              player,
              rank,
              points: wins * 3,
              wins,
              losses: Math.max(1, 4 - wins),
              draws: 0,
              winRate: Math.round(
                (wins / Math.max(1, wins + Math.max(1, 4 - wins))) * 100,
              ),
            }),
          );
        }
        added += 1;
      }
    }

    return `past tournaments: ${added} filler registration(s) added`;
  }

  /**
   * Rebuilds the ranked history feeding the profile ELO chart.
   *
   * The chart reads `ranked_match_history`, which only online ranked play
   * writes: the demo profile therefore showed an empty state next to a 1540
   * badge. The rebuilt curve ends exactly on that badge.
   */
  private async rebuildEloHistory(now: Date): Promise<string> {
    const maxime = await this.requireUser(DEMO_USERS.maxime);
    const opponents = await this.userRepository.find({
      where: { email: Not(In(Object.values(DEMO_USERS))) },
      take: 6,
      order: { id: "ASC" },
    });

    if (opponents.length === 0) {
      return "no opponent available, elo history left untouched";
    }

    await this.rankedHistoryRepository.delete([
      { winner: { id: maxime.id } },
      { loser: { id: maxime.id } },
    ]);

    // A rising but not monotonic curve: a flat line reads as fabricated.
    const deltas = [24, 18, -12, 26, 15, -9, 21, 17, 28, -11, 19, 22];
    const total = deltas.reduce((sum, value) => sum + value, 0);
    let elo = MAXIME_TARGET_ELO - total;

    const rows: RankedMatchHistory[] = [];
    deltas.forEach((delta, index) => {
      const opponent = opponents[index % opponents.length];
      const before = elo;
      const after = before + delta;
      elo = after;

      const won = delta > 0;
      rows.push(
        this.rankedHistoryRepository.create({
          winner: won ? maxime : opponent,
          loser: won ? opponent : maxime,
          winnerEloBefore: won ? before : 1400,
          winnerEloAfter: won ? after : 1400 + Math.abs(delta),
          loserEloBefore: won ? 1400 : before,
          loserEloAfter: won ? 1400 - Math.abs(delta) : after,
          delta: Math.abs(delta),
          isDraw: false,
          createdAt: new Date(
            now.getTime() - (deltas.length - index) * 5 * DAY_MS,
          ),
        }),
      );
    });

    const saved = await this.rankedHistoryRepository.save(rows);

    // createdAt is a CreateDateColumn: TypeORM stamps it on insert and ignores
    // the value above, so the dates are written back explicitly.
    for (const [index, row] of saved.entries()) {
      await this.rankedHistoryRepository.update(row.id, {
        createdAt: new Date(
          now.getTime() - (deltas.length - index) * 5 * DAY_MS,
        ),
      });
    }

    const player = await this.playerRepository.findOne({
      where: { user: { id: maxime.id } },
    });
    if (player) {
      player.elo = MAXIME_TARGET_ELO;
      await this.playerRepository.save(player);
    }

    return `elo history: ${saved.length} ranked results ending at ${MAXIME_TARGET_ELO}`;
  }

  /**
   * Brings the showcase master set to the completion the script announces, and
   * drops any row that does not belong to the tracked extension.
   */
  private async refreshMasterSet(): Promise<string> {
    const laura = await this.requireUser(DEMO_USERS.laura);
    const tracked = await this.collectionRepository.find({
      where: { user: { id: laura.id } },
      relations: ["masterSet", "items"],
    });

    // The preferred extension is the one the script names, but the seed picks
    // whichever set the catalogue offers first: fall back to the master set
    // holding the most cards rather than skipping the step entirely.
    const masterSets = tracked.filter((entry) => entry.masterSet);
    const collection =
      masterSets.find(
        (entry) => entry.masterSet?.id === DEMO_MASTER_SET_COMPLETION.setId,
      ) ??
      masterSets.sort(
        (a, b) => (b.items ?? []).length - (a.items ?? []).length,
      )[0];

    if (!collection) {
      return "no master set tracked, skipped";
    }

    const setId = collection.masterSet!.id;

    const items = await this.collectionItemRepository.find({
      where: { collection: { id: collection.id } },
      relations: ["pokemonCard", "pokemonCard.set"],
    });

    const strays = items.filter(
      (item) => item.pokemonCard?.set?.id !== setId,
    );
    if (strays.length > 0) {
      await this.collectionItemRepository.remove(strays);
    }

    const setCards = await this.cardRepository.find({
      where: { set: { id: setId } },
      order: { localId: "ASC" },
    });
    const total =
      collection.masterSet?.cardCount?.total || setCards.length || 0;
    const target = Math.min(
      setCards.length,
      Math.round(total * DEMO_MASTER_SET_COMPLETION.ratio),
    );

    const kept = items.filter((item) => !strays.includes(item));
    const owned = new Map(
      kept
        .filter((item) => (item.quantity || 0) > 0 && item.pokemonCard)
        .map((item) => [item.pokemonCard!.id, item]),
    );

    const nmState = await this.cardStateRepository.findOne({
      where: { code: CardStateCode.NM },
    });

    const toCreate: CollectionItem[] = [];
    for (const card of setCards) {
      if (owned.size + toCreate.length >= target) {
        break;
      }
      if (owned.has(card.id)) {
        continue;
      }
      toCreate.push(
        this.collectionItemRepository.create({
          collection,
          pokemonCard: card,
          cardState: nmState ?? undefined,
          quantity: 1,
          productKind: ProductKind.CARD,
        }),
      );
    }

    if (toCreate.length > 0) {
      await this.collectionItemRepository.save(toCreate);
    }

    const finalOwned = owned.size + toCreate.length;
    const percent = total > 0 ? Math.round((finalOwned / total) * 100) : 0;
    return `master set ${setId}: ${finalOwned}/${total} (${percent}%), ${strays.length} stray row(s) removed`;
  }

  /**
   * Deletes the master sets holding nothing.
   *
   * Left in place they show 0% and drag the average completion of the
   * collection page down to a number that undersells the account.
   */
  private async dropEmptyMasterSets(): Promise<string> {
    const laura = await this.requireUser(DEMO_USERS.laura);
    const collections = await this.collectionRepository.find({
      where: { user: { id: laura.id } },
      relations: ["masterSet", "items"],
    });

    const empties = collections.filter(
      (collection) =>
        collection.masterSet &&
        (collection.items ?? []).every((item) => (item.quantity || 0) === 0),
    );

    for (const collection of empties) {
      await this.collectionRepository.remove(collection);
    }

    return `${empties.length} empty master set(s) removed`;
  }

  /**
   * Rebuilds the deck shown during the analysis demo.
   *
   * It was filled with 60 Pokémon of seven types and no energy or trainer, so
   * the analyser — correctly — reported it as unplayable while the narration
   * presented it as a competitive list.
   */
  private async rebuildShowcaseDeck(): Promise<string> {
    const maxime = await this.requireUser(DEMO_USERS.maxime);
    const deck = await this.deckRepository.findOne({
      where: { user: { id: maxime.id }, name: DEMO_SHOWCASE_DECK.name },
    });

    if (!deck) {
      return `deck "${DEMO_SHOWCASE_DECK.name}" not found, skipped`;
    }

    const pokemon = await this.pickCards(
      PokemonCardsType.Pokemon,
      DEMO_SHOWCASE_DECK.pokemonTypes,
      12,
    );
    const trainers = await this.pickCards(PokemonCardsType.Trainer, null, 10);
    const energies = await this.pickCards(
      PokemonCardsType.Energy,
      DEMO_SHOWCASE_DECK.pokemonTypes,
      2,
    );

    if (pokemon.length === 0 || trainers.length === 0 || energies.length === 0) {
      return "catalogue lacks trainers or energies, deck left untouched";
    }

    await this.deckCardRepository.delete({ deck: { id: deck.id } });

    const rows: DeckCard[] = [];
    const push = (cards: Card[], slots: number, maxPerCard: number): number => {
      let placed = 0;
      let index = 0;
      while (placed < slots && cards.length > 0) {
        const card = cards[index % cards.length];
        const qty = Math.min(maxPerCard, slots - placed);
        rows.push(
          this.deckCardRepository.create({
            deck,
            card,
            qty,
            role: DeckCardRole.main,
          }),
        );
        placed += qty;
        index += 1;
        if (index > cards.length * maxPerCard) {
          break;
        }
      }
      return placed;
    };

    // 18 Pokémon / 30 trainers / 12 energies: a standard-legal skeleton, and
    // four copies maximum outside basic energy.
    const placedPokemon = push(pokemon, DEMO_SHOWCASE_DECK.pokemonCount, 4);
    const placedTrainers = push(trainers, DEMO_SHOWCASE_DECK.trainerCount, 4);
    const placedEnergies = push(energies, DEMO_SHOWCASE_DECK.energyCount, 12);

    await this.deckCardRepository.save(rows);

    if (deck.coverCard === null || deck.coverCard === undefined) {
      deck.coverCard = pokemon[0];
      await this.deckRepository.save(deck);
    }

    return `deck "${deck.name}": ${placedPokemon} pokemon / ${placedTrainers} trainers / ${placedEnergies} energies`;
  }

  /**
   * Picks distinct playable cards of a category, preferring the given types.
   *
   * @param category - Card category to select.
   * @param types - Preferred Pokémon types, or null to ignore typing.
   * @param limit - Maximum number of distinct cards returned.
   */
  private async pickCards(
    category: PokemonCardsType,
    types: readonly string[] | null,
    limit: number,
  ): Promise<Card[]> {
    // `Card.image` is virtual, resolved from translations at read time: the
    // illustration has to be filtered on the translation row itself.
    const query = this.cardRepository
      .createQueryBuilder("card")
      .innerJoinAndSelect("card.pokemonDetails", "details")
      .innerJoin("card.translations", "translation")
      .where("details.category = :category", { category })
      .andWhere("translation.image IS NOT NULL")
      .orderBy("card.id", "ASC")
      .take(limit);

    if (types && types.length > 0) {
      query.andWhere("details.types && :types", { types });
    }

    const matches = await query.getMany();
    if (matches.length > 0 || !types) {
      return matches;
    }

    // Typing is a preference, never a blocker: fall back to any card of the
    // category so a narrow catalogue still produces a legal deck.
    return this.pickCards(category, null, limit);
  }

  /**
   * Points the marketplace showcase at a recognisable card and regenerates its
   * price history inside the 90-day window the stats endpoint reads.
   */
  private async refreshFeaturedCard(now: Date): Promise<string> {
    const featured = await this.cardRepository
      .createQueryBuilder("card")
      .innerJoin("card.translations", "translation")
      .where("translation.name = :name", { name: DEMO_PRICE_TREND.cardName })
      .andWhere("translation.image IS NOT NULL")
      .orderBy("card.id", "ASC")
      .getOne();

    if (!featured) {
      return `card "${DEMO_PRICE_TREND.cardName}" not found, showcase untouched`;
    }

    const sellers = await this.userRepository.find({
      where: { email: Not(In([DEMO_USERS.laura, DEMO_USERS.maxime])) },
      take: DEMO_PRICE_TREND.listingPrices.length,
      order: { id: "ASC" },
    });

    for (const [index, price] of DEMO_PRICE_TREND.listingPrices.entries()) {
      const seller = sellers[index];
      if (!seller) {
        break;
      }
      const existing = await this.listingRepository.findOne({
        where: {
          pokemonCard: { id: featured.id },
          seller: { id: seller.id },
        },
      });
      const listing =
        existing ??
        this.listingRepository.create({
          seller,
          pokemonCard: featured,
          productKind: ProductKind.CARD,
        });
      listing.price = price;
      listing.currency = Currency.EUR;
      listing.quantityAvailable = index + 1;
      listing.cardState = CardState.NM;
      listing.status = ListingStatus.ACTIVE;
      listing.shippingCost = 3.5;
      listing.handlingTimeDays = 2;
      await this.listingRepository.save(listing);
    }

    await this.priceHistoryRepository.delete({
      pokemonCard: { id: featured.id },
    });

    // The stats endpoint only reads the last 90 days, so a six-month history
    // could never be plotted: the rise is compressed into the visible window
    // and stops yesterday rather than on the day it was seeded.
    const points = 24;
    const rows: PriceHistory[] = [];
    for (let index = 0; index < points; index += 1) {
      const fraction = index / (points - 1);
      const daysAgo = Math.round(88 * (1 - fraction)) + 1;
      const price =
        DEMO_PRICE_TREND.startPrice *
        (1 + DEMO_PRICE_TREND.growth * fraction) *
        // Deterministic ripple: a perfectly smooth ramp reads as generated.
        (1 + Math.sin(index * 1.7) * 0.018);

      rows.push(
        this.priceHistoryRepository.create({
          pokemonCard: featured,
          price: Math.round(price * 100) / 100,
          currency: Currency.EUR,
          cardState: CardState.NM,
          quantityAvailable: 2,
          recordedAt: new Date(now.getTime() - daysAgo * DAY_MS),
        }),
      );
    }
    await this.priceHistoryRepository.save(rows);

    const first = rows[0].price;
    const last = rows[rows.length - 1].price;
    const variation = Math.round((last / first - 1) * 100);
    return `featured card "${DEMO_PRICE_TREND.cardName}": ${DEMO_PRICE_TREND.listingPrices.length} listings, ${points} price points, +${variation}%`;
  }

  /** Replaces placeholder seller names visible on the marketplace listings. */
  private async renameTestSellers(): Promise<string> {
    let renamed = 0;
    for (const [email, identity] of Object.entries(DEMO_SELLER_RENAMES)) {
      const user = await this.userRepository.findOne({ where: { email } });
      if (!user) {
        continue;
      }
      user.firstName = identity.firstName;
      user.lastName = identity.lastName;
      await this.userRepository.save(user);
      renamed += 1;
    }
    return `${renamed} seller(s) renamed`;
  }

  /**
   * Takes the scaffolding tournaments out of the public listing.
   *
   * They are unpublished rather than deleted: matches, rankings and
   * registrations hang off them, and the demo only needs them out of sight.
   */
  private async hideJunkTournaments(): Promise<string> {
    const junk = await this.tournamentRepository.find({
      where: { name: In(DEMO_JUNK_TOURNAMENT_NAMES) },
    });

    for (const tournament of junk) {
      tournament.isPublic = false;
      await this.tournamentRepository.save(tournament);
    }

    return `${junk.length} scaffolding tournament(s) unpublished`;
  }
}
