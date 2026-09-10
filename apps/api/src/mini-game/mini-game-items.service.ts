import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, In, Repository } from "typeorm";
import { CatalogLocalizationService } from "../card/catalog-localization.service";
import { Card } from "../card/entities/card.entity";
import { CardGame } from "../common/enums/cardGame";
import { PokemonCardsType } from "../common/enums/pokemonCardsType";
import { Listing } from "../marketplace/entities/listing.entity";
import { SealedProduct } from "../sealed-product/entities/sealed-product.entity";
import type { SupportedLocale } from "../translation/supported-locales";
import { cardMarketValue, roundPrice } from "./mini-game-pricing";

/** One Juste Prix round: the thing to price and its reference price. */
export type JustePrixItem =
  | { type: "card"; id: string; price: number; data: Card }
  | { type: "sealed"; id: string; price: number; data: SealedProduct };

/** Number of cards in a Case Opening booster. */
export const CASE_OPENING_PACK_SIZE = 6;

/** Share of Juste Prix rounds that feature a card rather than a sealed product. */
const JUSTE_PRIX_CARD_SHARE = 0.6;

/**
 * Cheapest card worth guessing, in euros. Below that, the 20 cent tolerance
 * makes nearly any low guess "right" and basic energies dominate the draw.
 */
export const JUSTE_PRIX_MIN_CARD_PRICE = 1;

/**
 * Draws and prices the items the mini-games are played with.
 *
 * Every draw is restricted to Pokémon cards and to items with a real market
 * price: a card without pricing or a sealed product without any active listing
 * is never served. When the catalog cannot supply enough items the draw fails
 * loudly instead of padding with mock data.
 */
@Injectable()
export class MiniGameItemsService {
  constructor(
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    @InjectRepository(SealedProduct)
    private readonly sealedProductRepository: Repository<SealedProduct>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    private readonly catalogLocalization: CatalogLocalizationService,
  ) {}

  /**
   * Random priced Pokémon cards, with their set and Pokémon details loaded.
   *
   * @param count Number of cards wanted.
   * @param setId Optional set restriction.
   * @param options `minPrice` drops cards below that value (in euros).
   * @returns Up to `count` distinct cards, fewer when the catalog runs short.
   */
  async drawPricedCards(
    count: number,
    setId?: string,
    options: { minPrice?: number } = {},
  ): Promise<Card[]> {
    if (count <= 0) return [];
    const minPrice = options.minPrice ?? 0;

    const qb = this.cardRepository
      .createQueryBuilder("card")
      .leftJoinAndSelect("card.set", "set")
      .leftJoinAndSelect("card.pokemonDetails", "pokemonDetails")
      .where("card.game = :game", { game: CardGame.Pokemon })
      .andWhere(
        new Brackets((where) => {
          where
            .where("(card.pricing->'cardmarket'->>'trend') IS NOT NULL")
            .orWhere("(card.pricing->'cardmarket'->>'avg') IS NOT NULL")
            .orWhere("(card.pricing->'cardmarket'->>'low') IS NOT NULL")
            .orWhere(
              "(card.pricing->'tcgplayer'->'normal'->>'marketPrice') IS NOT NULL",
            )
            .orWhere(
              "(card.pricing->'tcgplayer'->'holofoil'->>'marketPrice') IS NOT NULL",
            )
            .orWhere(
              "(card.pricing->'tcgplayer'->'reverseHolofoil'->>'marketPrice') IS NOT NULL",
            );
        }),
      );

    if (setId) {
      qb.andWhere("set.id = :setId", { setId });
    }

    // Over-fetch: a JSON price can be present yet unusable (zero, negative,
    // or under the floor), and the floor is checked in code because the value
    // comes from whichever source is available first.
    const candidates = await qb
      .orderBy("RANDOM()")
      .limit(count * (minPrice > 0 ? 4 : 2))
      .getMany();

    return candidates
      .filter((card) => {
        const value = cardMarketValue(card);
        return value !== null && value >= minPrice;
      })
      .slice(0, count);
  }

  /**
   * Random sealed products that currently have at least one active listing,
   * priced at the average of those listings.
   *
   * @param count Number of products wanted.
   * @returns Products with their reference price, fewer than `count` when the
   * marketplace has too few priced products.
   */
  async drawPricedSealedProducts(
    count: number,
  ): Promise<{ product: SealedProduct; price: number }[]> {
    if (count <= 0) return [];

    const rows: { id: string; avgPrice: string }[] = await this.listingRepository
      .createQueryBuilder("listing")
      .select("sealed.id", "id")
      .addSelect("AVG(listing.price)", "avgPrice")
      .innerJoin("listing.sealedProduct", "sealed")
      .where("listing.quantityAvailable > 0")
      .andWhere("(listing.expiresAt IS NULL OR listing.expiresAt > :now)", {
        now: new Date(),
      })
      .groupBy("sealed.id")
      .orderBy("RANDOM()")
      .limit(count)
      .getRawMany();

    const priced = rows
      .map((row) => ({ id: row.id, price: roundPrice(Number(row.avgPrice)) }))
      .filter((row) => Number.isFinite(row.price) && row.price > 0);
    if (priced.length === 0) return [];

    const products = await this.sealedProductRepository.find({
      where: { id: In(priced.map((row) => row.id)) },
      relations: ["pokemonSet"],
    });
    const byId = new Map(products.map((product) => [product.id, product]));

    return priced.flatMap((row) => {
      const product = byId.get(row.id);
      return product ? [{ product, price: row.price }] : [];
    });
  }

  /**
   * Builds the rounds of a Juste Prix game: a shuffled mix of priced cards and
   * priced sealed products, cards making up roughly 60 % of the rounds. When
   * sealed products run short, cards fill the gap.
   *
   * @param roundCount Number of rounds to build.
   * @param setId Optional set restriction for the cards.
   * @throws ServiceUnavailableException when the catalog cannot fill the rounds.
   */
  async buildJustePrixItems(
    roundCount: number,
    setId?: string,
  ): Promise<JustePrixItem[]> {
    const wantedCards = Math.ceil(roundCount * JUSTE_PRIX_CARD_SHARE);
    const wantedSealed = roundCount - wantedCards;

    const sealed = await this.drawPricedSealedProducts(wantedSealed);
    const cards = await this.drawPricedCards(roundCount - sealed.length, setId, {
      minPrice: JUSTE_PRIX_MIN_CARD_PRICE,
    });

    const items: JustePrixItem[] = [
      ...cards.map((card): JustePrixItem => ({
        type: "card",
        id: card.id,
        price: cardMarketValue(card) as number,
        data: card,
      })),
      ...sealed.map(
        ({ product, price }): JustePrixItem => ({
          type: "sealed",
          id: product.id,
          price,
          data: product,
        }),
      ),
    ];

    if (items.length < roundCount) {
      throw new ServiceUnavailableException(
        "Not enough priced items in the catalog to start a game",
      );
    }

    return shuffle(items);
  }

  /**
   * Builds the boosters of a Case Opening duel: for each round, one pack per
   * player, every card carrying a real market value.
   *
   * @param roundCount Number of rounds (boosters per player).
   * @param playerCount Number of players.
   * @param setId Optional set restriction.
   * @returns `packs[round][player]` arrays of cards.
   * @throws ServiceUnavailableException when the catalog cannot fill the packs.
   */
  async buildCaseOpeningPacks(
    roundCount: number,
    playerCount: number,
    setId?: string,
  ): Promise<Card[][][]> {
    const needed = roundCount * playerCount * CASE_OPENING_PACK_SIZE;
    const pool = await this.drawPricedCards(needed, setId);

    if (pool.length === 0) {
      throw new ServiceUnavailableException(
        "Not enough priced cards in the catalog to open boosters",
      );
    }

    // A small set legitimately holds fewer priced cards than a full duel needs:
    // reuse the pool rather than refuse the game, the way a real set repeats.
    const cards = Array.from({ length: needed }, (_, index) => pool[index % pool.length]);
    const packs: Card[][][] = [];
    for (let round = 0; round < roundCount; round += 1) {
      const roundPacks: Card[][] = [];
      for (let player = 0; player < playerCount; player += 1) {
        const start = (round * playerCount + player) * CASE_OPENING_PACK_SIZE;
        roundPacks.push(cards.slice(start, start + CASE_OPENING_PACK_SIZE));
      }
      packs.push(roundPacks);
    }
    return packs;
  }

  /**
   * Localized, price-free copy of a card for a client payload.
   *
   * Labels only live in translation tables and are attached to HTTP responses
   * by an interceptor the WebSocket gateway never goes through, so the gateway
   * resolves them here, per recipient locale. The copy also drops `pricing`:
   * a Juste Prix client must not be able to read the answer.
   *
   * @param cards Cards to localize.
   * @param locale Recipient locale.
   * @param options `keepPricing` preserves prices for cards already revealed.
   */
  async localizeCards(
    cards: Card[],
    locale: SupportedLocale,
    options: { keepPricing?: boolean } = {},
  ): Promise<Card[]> {
    const copies = cards.map((card) => cloneCard(card, options.keepPricing ?? false));
    await this.catalogLocalization.localize(copies, locale);
    return copies;
  }

  /**
   * Localized, price-free copy of a Juste Prix item for a client payload.
   *
   * @param item Round item.
   * @param locale Recipient locale.
   */
  async localizeJustePrixItem(
    item: JustePrixItem,
    locale: SupportedLocale,
  ): Promise<{ type: JustePrixItem["type"]; id: string; data: Card | SealedProduct }> {
    if (item.type === "card") {
      const [data] = await this.localizeCards([item.data], locale);
      return { type: "card", id: item.id, data: data! };
    }

    const copy = cloneSealedProduct(item.data);
    await this.catalogLocalization.localize(copy, locale);
    return { type: "sealed", id: item.id, data: copy };
  }

  /** Whether a card belongs to the Pokémon category (not a trainer or energy). */
  static isPokemonCard(card: Card): boolean {
    return card.pokemonDetails?.category === PokemonCardsType.Pokemon;
  }
}

/**
 * Shallow-clones a TypeORM entity while preserving its class, so the
 * localization service still recognizes it as a catalog entity.
 */
function cloneEntity<T extends object>(entity: T): T {
  return Object.assign(Object.create(Object.getPrototypeOf(entity)), entity);
}

function cloneCard(card: Card, keepPricing: boolean): Card {
  const copy = cloneEntity(card);
  if (card.set) copy.set = cloneEntity(card.set);
  if (card.pokemonDetails) copy.pokemonDetails = cloneEntity(card.pokemonDetails);
  if (!keepPricing) delete copy.pricing;
  return copy;
}

function cloneSealedProduct(product: SealedProduct): SealedProduct {
  const copy = cloneEntity(product);
  if (product.pokemonSet) copy.pokemonSet = cloneEntity(product.pokemonSet);
  return copy;
}

/** Fisher-Yates shuffle, returning a new array. */
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
