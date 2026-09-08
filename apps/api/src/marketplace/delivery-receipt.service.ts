import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import {
  CardState,
  CardStateCode,
} from "../card-state/entities/card-state.entity";
import { CollectionItem } from "../collection-item/entities/collection-item.entity";
import { Collection } from "../collection/entities/collection.entity";
import { FulfillmentStatus } from "../common/enums/fulfillment-status";
import { ProductKind } from "../common/enums/product-kind";
import { UserRole } from "../common/enums/user";
import { User } from "../user/entities/user.entity";
import {
  ReceiptImportPreviewItemDto,
  ReceiptImportPreviewResponseDto,
  ReceiptImportRequestDto,
} from "./dto/delivery-receipt-import.dto";
import { Order, OrderStatus } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";

/**
 * Service managing delivery-to-collection receipt imports with provenance and deduplication (INT-03).
 */
@Injectable()
export class DeliveryReceiptService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
    @InjectRepository(CollectionItem)
    private readonly collectionItemRepository: Repository<CollectionItem>,
    @InjectRepository(CardState)
    private readonly cardStateRepository: Repository<CardState>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Previews delivered items eligible for receipt import into user's collection.
   */
  async getReceiptImportPreview(
    orderId: number,
    user: User,
  ): Promise<ReceiptImportPreviewResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: [
        "buyer",
        "orderItems",
        "orderItems.listing",
        "orderItems.listing.pokemonCard",
        "orderItems.listing.sealedProduct",
      ],
    });

    if (!order) {
      throw new NotFoundException("Commande introuvable.");
    }

    const isBuyer = order.buyer?.id === user.id;
    const isAdmin =
      user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR;

    if (!isBuyer && !isAdmin) {
      throw new ForbiddenException(
        "Vous ne pouvez prévisualiser la réception que pour vos propres commandes.",
      );
    }

    // Find all collection items owned by this user to check provenance
    const userCollections = await this.collectionRepository.find({
      where: { user: { id: user.id } },
      relations: ["items"],
    });

    const alreadyImportedMap = new Map<number, number>(); // orderItemId -> collectionItemId
    for (const col of userCollections) {
      for (const item of col.items || []) {
        if (item.provenance?.orderItemId) {
          alreadyImportedMap.set(Number(item.provenance.orderItemId), item.id);
        }
      }
    }

    const items: ReceiptImportPreviewItemDto[] = order.orderItems.map((it) => {
      const existingId = alreadyImportedMap.get(it.id) ?? null;
      return {
        orderItemId: it.id,
        productName: it.productName || "Article TCG",
        productImage: it.productImage || null,
        cardId: it.listing?.pokemonCard?.id || null,
        sealedProductId: it.listing?.sealedProduct?.id || null,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        currency: order.currency,
        condition: it.productCondition || null,
        language: it.productLanguage || null,
        fulfillmentStatus: it.fulfillmentStatus,
        deliveredAt: it.deliveredAt || null,
        alreadyImported: existingId !== null,
        existingCollectionItemId: existingId,
      };
    });

    return {
      orderId: order.id,
      isOrderDelivered:
        order.status === OrderStatus.DELIVERED ||
        order.orderItems.every(
          (it) => it.fulfillmentStatus === FulfillmentStatus.DELIVERED,
        ),
      items,
    };
  }

  /**
   * Imports confirmed received order items into target collection with provenance.
   */
  async importDeliveredItems(
    orderId: number,
    user: User,
    dto: ReceiptImportRequestDto,
  ): Promise<{
    importedCount: number;
    collectionId: string;
    items: CollectionItem[];
  }> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: [
        "buyer",
        "orderItems",
        "orderItems.seller",
        "orderItems.listing",
        "orderItems.listing.pokemonCard",
        "orderItems.listing.sealedProduct",
      ],
    });

    if (!order) {
      throw new NotFoundException("Commande introuvable.");
    }

    const isBuyer = order.buyer?.id === user.id;
    const isAdmin =
      user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR;

    if (!isBuyer && !isAdmin) {
      throw new ForbiddenException(
        "Vous ne pouvez importer que les articles de vos propres commandes.",
      );
    }

    // Determine target collection
    let targetCollection: Collection | null = null;
    if (dto.collectionId) {
      targetCollection = await this.collectionRepository.findOne({
        where: { id: dto.collectionId, user: { id: user.id } },
      });
      if (!targetCollection) {
        throw new NotFoundException(
          `Collection #${dto.collectionId} introuvable pour votre compte.`,
        );
      }
    } else {
      // Pick first collection or create default
      targetCollection = await this.collectionRepository.findOne({
        where: { user: { id: user.id } },
        order: { created_at: "ASC" },
      });

      if (!targetCollection) {
        targetCollection = this.collectionRepository.create({
          name: "Ma Collection Principale",
          description: "Collection par défaut créée automatiquement",
          user,
        });
        await this.collectionRepository.save(targetCollection);
      }
    }

    // Check existing provenance in this collection
    const existingItems = await this.collectionItemRepository.find({
      where: { collection: { id: targetCollection.id } },
    });

    const existingOrderItemIds = new Set(
      existingItems
        .filter((it) => it.provenance?.orderItemId != null)
        .map((it) => Number(it.provenance!.orderItemId)),
    );

    const importedCollectionItems: CollectionItem[] = [];

    for (const requestedItem of dto.items) {
      const orderItem = order.orderItems.find(
        (it) => it.id === requestedItem.orderItemId,
      );

      if (!orderItem) {
        throw new NotFoundException(
          `Article #${requestedItem.orderItemId} introuvable dans la commande #${orderId}`,
        );
      }

      if (orderItem.fulfillmentStatus !== FulfillmentStatus.DELIVERED) {
        throw new BadRequestException(
          `L'article #${orderItem.id} n'est pas encore livré (statut: ${orderItem.fulfillmentStatus}). Seuls les articles livrés peuvent être importés.`,
        );
      }

      // Deduplication guard
      if (
        !dto.allowDuplicates &&
        existingOrderItemIds.has(requestedItem.orderItemId)
      ) {
        // Skip duplicate import if not explicitly allowed
        continue;
      }

      // Card state resolution
      let cardState: CardState | null = null;
      const cond = requestedItem.condition || orderItem.productCondition;
      if (cond) {
        cardState =
          (await this.cardStateRepository.findOne({
            where: [{ code: cond as CardStateCode }, { label: cond }],
          })) || null;
      }

      const collectionItem = this.collectionItemRepository.create({
        collection: targetCollection,
        productKind: orderItem.productKind || ProductKind.CARD,
        pokemonCard: orderItem.listing?.pokemonCard || null,
        sealedProduct: orderItem.listing?.sealedProduct || null,
        cardState,
        quantity: orderItem.quantity,
        quantityAvailable: orderItem.quantity,
        quantityReserved: 0,
        quantitySold: 0,
        variant: requestedItem.variant || "normal",
        language: orderItem.productLanguage || "fr",
        storageLocation: requestedItem.storageLocation || null,
        notes:
          requestedItem.notes ||
          `Acheté sur la Marketplace (Commande #${orderId})`,
        acquisitionCost: Number(orderItem.unitPrice),
        acquisitionCurrency: order.currency,
        acquiredAt: orderItem.deliveredAt || new Date(),
        photoUrls: orderItem.listingPhotoUrls || null,
        provenance: {
          source: "MARKETPLACE_ORDER",
          orderId,
          orderItemId: orderItem.id,
          sellerId: orderItem.seller?.id,
          sellerName: orderItem.sellerName,
          importedAt: new Date(),
        },
      });

      const saved = await this.collectionItemRepository.save(collectionItem);
      importedCollectionItems.push(saved);
      existingOrderItemIds.add(orderItem.id);
    }

    if (importedCollectionItems.length === 0 && dto.items.length > 0) {
      throw new BadRequestException(
        "Tous les articles sélectionnés ont déjà été importés dans cette collection.",
      );
    }

    await this.auditService.record({
      actorId: user.id,
      actorRole: user.role,
      targetType: "COLLECTION",
      targetId: String(targetCollection.id),
      action: "RECEIPT_TO_COLLECTION_IMPORT",
      reason: `Imported ${importedCollectionItems.length} items from order #${orderId}`,
      afterState: {
        orderId,
        collectionId: targetCollection.id,
        importedCount: importedCollectionItems.length,
        itemIds: importedCollectionItems.map((it) => it.id),
      },
    });

    return {
      importedCount: importedCollectionItems.length,
      collectionId: targetCollection.id,
      items: importedCollectionItems,
    };
  }
}
