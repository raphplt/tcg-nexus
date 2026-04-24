import { ApiProperty } from "@nestjs/swagger";

export enum ExternalOfferSource {
  CARDMARKET = "cardmarket",
  TCGPLAYER = "tcgplayer",
  EBAY = "ebay",
}

/**
 * Offre externe affichée à côté des listings internes (vue « idealo-like »).
 * `price` est absent quand on ne peut pas connaître le prix sans API payante
 * (cas eBay : on fournit juste un lien de recherche).
 */
export class ExternalOfferDto {
  @ApiProperty({ enum: ExternalOfferSource })
  source: ExternalOfferSource;

  @ApiProperty({ required: false, nullable: true })
  price: number | null;

  @ApiProperty({ required: false, nullable: true })
  currency: string | null;

  @ApiProperty()
  url: string;

  @ApiProperty({ required: false, nullable: true })
  updated: string | null;
}

export class ExternalOffersResponseDto {
  @ApiProperty({ type: [ExternalOfferDto] })
  offers: ExternalOfferDto[];
}
