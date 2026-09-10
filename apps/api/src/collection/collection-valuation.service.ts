import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Card } from "src/card/entities/card.entity";
import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
import { Currency } from "src/common/enums/currency";
import { ProductKind } from "src/common/enums/product-kind";
import { UserRole } from "src/common/enums/user";
import { getMarketReferencePrice, round2 } from "src/marketplace/price.helper";
import { User } from "src/user/entities/user.entity";
import { Repository } from "typeorm";
import { CollectionValuationDto } from "./dto/collection-valuation.dto";
import { Collection } from "./entities/collection.entity";

@Injectable()
export class CollectionValuationService {
  constructor(
    @InjectRepository(Collection)
    private readonly collectionRepo: Repository<Collection>,
    @InjectRepository(CollectionItem)
    private readonly itemRepo: Repository<CollectionItem>,
  ) {}

  private assertCanView(collection: Collection, viewer?: User): void {
    if (collection.isPublic) return;
    if (!viewer) {
      throw new NotFoundException(
        `Collection with id ${collection.id} not found`,
      );
    }
    if (collection.user?.id !== viewer.id && viewer.role !== UserRole.ADMIN) {
      throw new NotFoundException(
        `Collection with id ${collection.id} not found`,
      );
    }
  }

  /**
   * Transparently computes the market valuation and acquisition cost comparison of a collection.
   *
   * Adheres to COL-06 rules:
   * - Does NOT treat cards with missing price observations as zero value.
   * - Distinguishes valued vs unvalued item counts and computes explicit coverage percentage.
   * - Preserves original acquisition cost records and calculates gain/loss only on items with known cost.
   *
   * @param collectionId Target collection ID.
   * @param targetCurrency Currency for valuation (default EUR).
   * @param viewer Requesting user.
   * @returns Detailed valuation metrics DTO.
   */
  async calculateValuation(
    collectionId: string,
    targetCurrency: string = Currency.EUR,
    viewer?: User,
  ): Promise<CollectionValuationDto> {
    const collection = await this.collectionRepo.findOne({
      where: { id: collectionId },
      relations: ["user"],
    });

    if (!collection) {
      throw new NotFoundException(
        `Collection with id ${collectionId} not found`,
      );
    }

    this.assertCanView(collection, viewer);

    const items = await this.itemRepo.find({
      where: { collection: { id: collectionId } },
      relations: ["pokemonCard", "cardState"],
    });

    let totalCopiesCount = 0;
    let valuedCopiesCount = 0;
    let unvaluedCopiesCount = 0;
    let totalEstimatedValue = 0;
    let totalAcquisitionCost: number | null = null;
    let hasAnyAcquisitionCost = false;

    const sourcesSet = new Set<string>();

    for (const item of items) {
      const qty = item.quantity || 0;
      if (qty <= 0) continue;
      totalCopiesCount += qty;

      // Track acquisition costs if recorded
      if (item.acquisitionCost != null && item.acquisitionCost > 0) {
        hasAnyAcquisitionCost = true;
        totalAcquisitionCost =
          (totalAcquisitionCost || 0) + Number(item.acquisitionCost) * qty;
      }

      // Estimate price for cards with catalog pricing data
      if (item.productKind === ProductKind.CARD && item.pokemonCard?.pricing) {
        const refPrice = getMarketReferencePrice(
          item.pokemonCard.pricing,
          targetCurrency,
        );

        if (refPrice !== null && refPrice > 0) {
          // Adjust for condition if applicable (NM: 1.0, LP/EX: 0.85, MP: 0.70, HP/DMG: 0.50)
          const conditionMultiplier = this.getConditionMultiplier(
            item.cardState?.code,
          );
          const effectivePrice = round2(refPrice * conditionMultiplier);

          totalEstimatedValue += effectivePrice * qty;
          valuedCopiesCount += qty;

          if (
            targetCurrency === Currency.EUR &&
            item.pokemonCard.pricing.cardmarket
          ) {
            sourcesSet.add("Cardmarket (trend/avg)");
          }
          if (
            targetCurrency === Currency.USD &&
            item.pokemonCard.pricing.tcgplayer
          ) {
            sourcesSet.add("TCGPlayer (market)");
          }
        } else {
          unvaluedCopiesCount += qty;
        }
      } else {
        unvaluedCopiesCount += qty;
      }
    }

    if (sourcesSet.size === 0) {
      sourcesSet.add("Catalog reference");
    }

    const roundedEstimatedValue = round2(totalEstimatedValue);
    const coveragePercentage =
      totalCopiesCount > 0
        ? round2((valuedCopiesCount / totalCopiesCount) * 100)
        : 0;

    let unrealizedGainLoss: number | null = null;
    let roiPercentage: number | null = null;

    if (
      hasAnyAcquisitionCost &&
      totalAcquisitionCost !== null &&
      totalAcquisitionCost > 0
    ) {
      totalAcquisitionCost = round2(totalAcquisitionCost);
      unrealizedGainLoss = round2(roundedEstimatedValue - totalAcquisitionCost);
      roiPercentage = round2((unrealizedGainLoss / totalAcquisitionCost) * 100);
    }

    const estimatedValueEur =
      targetCurrency === Currency.EUR
        ? roundedEstimatedValue
        : round2(roundedEstimatedValue * 0.92);

    const estimatedValueUsd =
      targetCurrency === Currency.USD
        ? roundedEstimatedValue
        : round2(roundedEstimatedValue * 1.08);

    return {
      currency: targetCurrency,
      totalEstimatedValue: roundedEstimatedValue,
      totalCopiesCount,
      valuedCopiesCount,
      unvaluedCopiesCount,
      coveragePercentage,
      totalAcquisitionCost,
      unrealizedGainLoss,
      roiPercentage,
      sources: Array.from(sourcesSet),
      computedAt: new Date().toISOString(),
      estimatedValueEur,
      estimatedValueUsd,
      totalValuedCopies: valuedCopiesCount,
      totalUnvaluedCopies: unvaluedCopiesCount,
      knownAcquisitionCostEur: totalAcquisitionCost ?? 0,
      roiEur: unrealizedGainLoss ?? undefined,
    };
  }

  private getConditionMultiplier(conditionCode?: string): number {
    switch (conditionCode?.toUpperCase()) {
      case "MT":
      case "NM":
        return 1.0;
      case "EX":
        return 0.9;
      case "LP":
        return 0.8;
      case "PL":
      case "MP":
        return 0.65;
      case "HP":
      case "DMG":
      case "POOR":
        return 0.45;
      default:
        return 1.0;
    }
  }
}
