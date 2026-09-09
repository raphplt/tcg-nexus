import { ApiProperty } from "@nestjs/swagger";

export class DeckCardOfferDto {
  @ApiProperty()
  listingId: number;

  @ApiProperty()
  sellerId: number;

  @ApiProperty()
  sellerName: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  quantityAvailable: number;

  @ApiProperty()
  shippingCost: number;

  @ApiProperty({ nullable: true })
  cardState?: string | null;
}

export class DeckInventoryRequirementCardDto {
  @ApiProperty()
  cardId: string;

  @ApiProperty({ nullable: true })
  tcgDexId?: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  image?: string;

  @ApiProperty()
  requiredQuantity: number;

  @ApiProperty()
  ownedAvailableQuantity: number;

  @ApiProperty()
  missingQuantity: number;

  @ApiProperty({ type: [DeckCardOfferDto] })
  offers: DeckCardOfferDto[];
}

export class DeckInventoryRequirementsDto {
  @ApiProperty()
  deckId: number;

  @ApiProperty()
  totalCardsRequired: number;

  @ApiProperty()
  totalCardsOwned: number;

  @ApiProperty()
  totalCardsMissing: number;

  @ApiProperty()
  isFullyOwned: boolean;

  @ApiProperty({ type: [DeckInventoryRequirementCardDto] })
  cards: DeckInventoryRequirementCardDto[];
}
