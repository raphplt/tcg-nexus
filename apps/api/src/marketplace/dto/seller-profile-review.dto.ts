import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

/**
 * Payload for a buyer to review a seller on a delivered order item (MKT-03).
 */
export class CreateSellerReviewDto {
  @ApiProperty({
    description: "Rating score from 1 to 5 stars",
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating: number;

  @ApiPropertyOptional({
    description: "Detailed feedback comment from the buyer",
    example: "Cards arrived carefully packaged in toploaders. Perfect condition!",
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

/**
 * Public review item on a seller's profile (MKT-03).
 */
export class SellerReviewItemDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  buyerName: string;

  @ApiPropertyOptional()
  buyerAvatar?: string | null;

  @ApiProperty()
  rating: number;

  @ApiPropertyOptional()
  comment?: string | null;

  @ApiProperty()
  verifiedPurchase: boolean;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  createdAt: Date;
}

/**
 * Trustworthy seller profile and performance indicators (MKT-03).
 */
export class SellerProfileSummaryDto {
  @ApiProperty()
  sellerId: number;

  @ApiProperty()
  displayName: string;

  @ApiPropertyOptional()
  avatarUrl?: string | null;

  @ApiProperty()
  memberSince: Date;

  @ApiProperty({ description: "Total completed and delivered sales count" })
  completedSalesCount: number;

  @ApiProperty({ description: "Total count of reviews received" })
  totalReviewsCount: number;

  @ApiProperty({ description: "Average rating (1.0 to 5.0) or 0 if unrated" })
  averageRating: number;

  @ApiProperty({ description: "Percentage of shipments on-time within handling window" })
  onTimeShippingRate: number;

  @ApiProperty({ description: "Resolved customer claim rate percentage" })
  resolvedClaimRate: number;

  @ApiProperty({ type: [SellerReviewItemDto] })
  recentReviews: SellerReviewItemDto[];
}
