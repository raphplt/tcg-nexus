import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Card } from "src/card/entities/card.entity";
import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
import { CompletionPolicy } from "src/common/enums/completion-policy";
import { ProductKind } from "src/common/enums/product-kind";
import { UserRole } from "src/common/enums/user";
import { User } from "src/user/entities/user.entity";
import { Repository } from "typeorm";
import { CollectionCompletionDto } from "./dto/collection-completion.dto";
import { Collection } from "./entities/collection.entity";

@Injectable()
export class CollectionCompletionService {
  constructor(
    @InjectRepository(Collection)
    private readonly collectionRepo: Repository<Collection>,
    @InjectRepository(CollectionItem)
    private readonly itemRepo: Repository<CollectionItem>,
    @InjectRepository(Card)
    private readonly cardRepo: Repository<Card>,
  ) {}

  /**
   * Asserts that a viewer has authorization to read collection metrics.
   *
   * @param collection Target collection entity.
   * @param viewer Authenticated user, or undefined for public visits.
   */
  private assertCanView(collection: Collection, viewer?: User): void {
    if (collection.isPublic) return;
    if (!viewer) {
      throw new NotFoundException(`Collection with id ${collection.id} not found`);
    }
    if (collection.user?.id !== viewer.id && viewer.role !== UserRole.ADMIN) {
      throw new NotFoundException(`Collection with id ${collection.id} not found`);
    }
  }

  /**
   * Authoritatively calculates collection completion metrics based on the specified policy.
   *
   * - Invariant 1: Adding duplicate copies does NOT increase completion percentage.
   * - Invariant 2: Client pagination or search filters do NOT alter overall completion.
   * - Invariant 3: Base Set requires 1 copy per distinct card, Master Set accounts for distinct variants.
   *
   * @param collectionId Target collection ID.
   * @param policyOverride Optional policy override ('base' or 'master').
   * @param viewer Requesting user.
   * @returns Detailed completion calculation DTO.
   */
  async calculateCompletion(
    collectionId: string,
    policyOverride?: "base" | "master",
    viewer?: User,
  ): Promise<CollectionCompletionDto> {
    const collection = await this.collectionRepo.findOne({
      where: { id: collectionId },
      relations: ["user", "masterSet"],
    });

    if (!collection) {
      throw new NotFoundException(`Collection with id ${collectionId} not found`);
    }

    this.assertCanView(collection, viewer);

    const activePolicy =
      policyOverride ??
      (collection.completionPolicy === "master" ? "master" : "base");

    // Fetch all owned items in this collection
    const ownedItems = await this.itemRepo.find({
      where: { collection: { id: collectionId } },
      relations: ["pokemonCard", "pokemonCard.set"],
    });

    // Compute total copies and duplicates
    let totalCopiesCount = 0;
    const ownedCardsMap = new Map<string, number>(); // cardId -> count
    const ownedVariantsMap = new Set<string>(); // cardId:variant

    for (const item of ownedItems) {
      const qty = item.quantity || 0;
      if (qty <= 0) continue;
      totalCopiesCount += qty;

      if (item.productKind === ProductKind.CARD && item.pokemonCard) {
        const cardId = item.pokemonCard.id;
        ownedCardsMap.set(cardId, (ownedCardsMap.get(cardId) || 0) + qty);

        const variant = item.variant?.toLowerCase() || "normal";
        ownedVariantsMap.add(`${cardId}:${variant}`);
      }
    }

    const rarityBreakdown: Record<string, { total: number; owned: number }> = {};

    // Case 1: Master Set or Set-linked collection
    if (collection.masterSet) {
      const setCards = await this.cardRepo.find({
        where: { set: { id: collection.masterSet.id } },
        relations: ["translations"],
      });

      let totalUniqueTargets = 0;
      let ownedUniqueTargets = 0;

      for (const card of setCards) {
        const rarity =
          card.translations?.[0]?.rarity || card.rarity || "Common";

        if (!rarityBreakdown[rarity]) {
          rarityBreakdown[rarity] = { total: 0, owned: 0 };
        }

        if (activePolicy === "base") {
          // Base Set: 1 target per distinct card
          totalUniqueTargets += 1;
          rarityBreakdown[rarity].total += 1;

          if (ownedCardsMap.has(card.id)) {
            ownedUniqueTargets += 1;
            rarityBreakdown[rarity].owned += 1;
          }
        } else {
          // Master Set: distinct targets for each defined variant
          const variants = card.variants || { normal: true };
          const variantKeys = Object.keys(variants).filter(
            (k) => Boolean(variants[k]),
          );
          const targetVariants = variantKeys.length > 0 ? variantKeys : ["normal"];

          for (const v of targetVariants) {
            totalUniqueTargets += 1;
            rarityBreakdown[rarity].total += 1;

            const isOwned =
              ownedVariantsMap.has(`${card.id}:${v.toLowerCase()}`) ||
              (targetVariants.length === 1 && ownedCardsMap.has(card.id));

            if (isOwned) {
              ownedUniqueTargets += 1;
              rarityBreakdown[rarity].owned += 1;
            }
          }
        }
      }

      const percentage =
        totalUniqueTargets > 0
          ? Math.round((ownedUniqueTargets / totalUniqueTargets) * 10000) / 100
          : 0;

      const duplicateCopiesCount = Math.max(0, totalCopiesCount - ownedUniqueTargets);
      const missingCount = Math.max(0, totalUniqueTargets - ownedUniqueTargets);

      return {
        policy: activePolicy,
        totalUniqueTargets,
        ownedUniqueTargets,
        percentage,
        totalCopiesCount,
        duplicateCopiesCount,
        missingCount,
        isComplete: totalUniqueTargets > 0 && ownedUniqueTargets === totalUniqueTargets,
        rarityBreakdown,
      };
    }

    // Case 2: Custom / freeform collection
    const uniqueCardCount = ownedCardsMap.size;
    const duplicateCopiesCount = Math.max(0, totalCopiesCount - uniqueCardCount);

    return {
      policy: activePolicy,
      totalUniqueTargets: uniqueCardCount,
      ownedUniqueTargets: uniqueCardCount,
      percentage: uniqueCardCount > 0 ? 100 : 0,
      totalCopiesCount,
      duplicateCopiesCount,
      missingCount: 0,
      isComplete: true,
      rarityBreakdown,
    };
  }
}
