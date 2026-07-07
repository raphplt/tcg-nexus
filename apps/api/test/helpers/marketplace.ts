import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Card } from "../../src/card/entities/card.entity";
import { CardGame } from "../../src/common/enums/cardGame";
import { Currency } from "../../src/common/enums/currency";
import { CardState } from "../../src/common/enums/pokemonCardsType";
import { ProductKind } from "../../src/common/enums/product-kind";
import { Listing } from "../../src/marketplace/entities/listing.entity";
import { User } from "../../src/user/entities/user.entity";
import { Repository } from "typeorm";
import { TestUser } from "./auth";

export async function ensureCard(app: INestApplication): Promise<Card> {
  const cardRepo = app.get<Repository<Card>>(getRepositoryToken(Card));
  let card = await cardRepo.findOne({ where: {} });
  if (!card) {
    card = await cardRepo.save(
      cardRepo.create({
        name: `E2E Card ${Date.now()}`,
        game: CardGame.Pokemon,
      }),
    );
  }
  return card;
}

export async function seedListingForSeller(
  app: INestApplication,
  seller: TestUser,
  overrides: Partial<Listing> = {},
): Promise<number> {
  const listingRepo = app.get<Repository<Listing>>(getRepositoryToken(Listing));

  const card = await ensureCard(app);

  const listing = await listingRepo.save(
    listingRepo.create({
      seller: { id: seller.id } as User,
      productKind: ProductKind.CARD,
      pokemonCard: card,
      price: 12.5,
      currency: Currency.EUR,
      quantityAvailable: 5,
      cardState: CardState.NM,
      ...overrides,
    }),
  );

  return listing.id;
}
