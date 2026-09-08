import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, Repository } from "typeorm";
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
import { ReceiptImport } from "./entities/receipt-import.entity";

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
    @InjectRepository(ReceiptImport)
    private readonly receiptImportRepository: Repository<ReceiptImport>,
    private readonly database: DataSource,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Copies of each order line already received, wherever they were filed.
   *
   * @returns Received quantity by order item identifier.
   */
  private async receivedQuantities(
    orderItemIds: number[],
    manager?: EntityManager,
  ): Promise<Map<number, number>> {
    const repository = manager
      ? manager.getRepository(ReceiptImport)
      : this.receiptImportRepository;
    const received = new Map<number, number>();
    if (!orderItemIds.length) return received;

    const receipts = await repository.find({
      where: orderItemIds.map((id) => ({ orderItem: { id } })),
      relations: ["orderItem", "collectionItem"],
    });
    for (const receipt of receipts) {
      received.set(
        receipt.orderItem.id,
        (received.get(receipt.orderItem.id) ?? 0) + receipt.quantity,
      );
    }
    return received;
  }

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

    const received = await this.receivedQuantities(
      order.orderItems.map((item) => item.id),
    );
    const receipts = await this.receiptImportRepository.find({
      where: order.orderItems.map((item) => ({ orderItem: { id: item.id } })),
      relations: ["orderItem", "collectionItem"],
    });
    const firstCollectionItem = new Map<number, number | null>();
    for (const receipt of receipts) {
      if (!firstCollectionItem.has(receipt.orderItem.id)) {
        firstCollectionItem.set(
          receipt.orderItem.id,
          receipt.collectionItem?.id ?? null,
        );
      }
    }

    const items: ReceiptImportPreviewItemDto[] = order.orderItems.map((it) => {
      const importedQuantity = received.get(it.id) ?? 0;
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
        receiptConfirmedAt: it.receiptConfirmedAt || null,
        alreadyImported: importedQuantity > 0,
        existingCollectionItemId: firstCollectionItem.get(it.id) ?? null,
        importedQuantity,
        remainingQuantity: Math.max(0, it.quantity - importedQuantity),
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
   * Receives confirmed order lines into a collection, once per purchased copy.
   *
   * Receipt identity belongs to the order line, so importing the same purchase
   * into another collection consumes the same remaining quantity instead of
   * duplicating the copies. Each line is locked, checked and written in one
   * transaction, and a retried request under the same key returns its receipt.
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
    const isStaff =
      user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR;

    if (!isBuyer && !isStaff) {
      throw new ForbiddenException(
        "Vous ne pouvez importer que les articles de vos propres commandes.",
      );
    }

    // Collections and their items always belong to the buyer; staff acting on a
    // support case files the receipt in the buyer's collection, not their own.
    const targetCollection = await this.resolveTargetCollection(
      order.buyer,
      dto,
    );

    return this.database.transaction(async (manager) => {
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

        // Locking the line serializes concurrent imports of the same purchase.
        await manager.findOne(OrderItem, {
          where: { id: orderItem.id },
          lock: { mode: "pessimistic_write" },
          loadEagerRelations: false,
        });

        if (orderItem.fulfillmentStatus !== FulfillmentStatus.DELIVERED) {
          throw new BadRequestException(
            `L'article #${orderItem.id} n'est pas encore livré (statut: ${orderItem.fulfillmentStatus}). Seuls les articles livrés peuvent être importés.`,
          );
        }
        // A seller's delivery declaration is not a buyer's receipt; staff may
        // still record one on the buyer's behalf during support work.
        if (!orderItem.receiptConfirmedAt && !isStaff) {
          throw new BadRequestException(
            `La réception de l'article #${orderItem.id} n'a pas encore été confirmée.`,
          );
        }

        const requestKey =
          requestedItem.requestKey ??
          `receipt:${orderItem.id}:${targetCollection.id}:${requestedItem.quantity ?? "remaining"}`;
        const existing = await manager.findOne(ReceiptImport, {
          where: { orderItem: { id: orderItem.id }, requestKey },
          relations: ["collectionItem"],
        });
        if (existing) {
          if (existing.collectionItem) {
            importedCollectionItems.push(existing.collectionItem);
          }
          continue;
        }

        const received = await this.receivedQuantities([orderItem.id], manager);
        const alreadyReceived = received.get(orderItem.id) ?? 0;
        const remaining = orderItem.quantity - alreadyReceived;
        if (alreadyReceived > 0 && !dto.allowDuplicates) {
          continue;
        }
        if (remaining <= 0) {
          throw new BadRequestException(
            `Toutes les copies de l'article #${orderItem.id} ont déjà été reçues.`,
          );
        }

        const quantity = requestedItem.quantity ?? remaining;
        if (!Number.isSafeInteger(quantity) || quantity <= 0) {
          throw new BadRequestException(
            "La quantité reçue doit être un nombre entier positif.",
          );
        }
        if (quantity > remaining) {
          throw new BadRequestException(
            `L'article #${orderItem.id} ne peut plus recevoir que ${remaining} copie(s).`,
          );
        }

        const collectionItem = await manager.save(
          CollectionItem,
          manager.create(CollectionItem, {
            collection: targetCollection,
            productKind: orderItem.productKind || ProductKind.CARD,
            pokemonCard: orderItem.listing?.pokemonCard || null,
            sealedProduct: orderItem.listing?.sealedProduct || null,
            cardState: await this.resolveCardState(requestedItem, orderItem),
            quantity,
            quantityAvailable: quantity,
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
          }),
        );

        await manager.save(
          ReceiptImport,
          manager.create(ReceiptImport, {
            orderItem,
            buyer: order.buyer,
            collection: targetCollection,
            collectionItem,
            quantity,
            requestKey,
          }),
        );

        importedCollectionItems.push(collectionItem);
      }

      if (importedCollectionItems.length === 0 && dto.items.length > 0) {
        throw new BadRequestException(
          "Tous les articles sélectionnés ont déjà été reçus.",
        );
      }

      await this.auditService.record(
        {
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
        },
        manager,
      );

      return {
        importedCount: importedCollectionItems.length,
        collectionId: targetCollection.id,
        items: importedCollectionItems,
      };
    });
  }

  /** Resolves the requested destination collection, or the buyer's default one. */
  private async resolveTargetCollection(
    user: User,
    dto: ReceiptImportRequestDto,
  ): Promise<Collection> {
    if (dto.collectionId) {
      const requested = await this.collectionRepository.findOne({
        where: { id: dto.collectionId, user: { id: user.id } },
      });
      if (!requested) {
        throw new NotFoundException(
          `Collection #${dto.collectionId} introuvable pour votre compte.`,
        );
      }
      return requested;
    }

    const existing = await this.collectionRepository.findOne({
      where: { user: { id: user.id } },
      order: { created_at: "ASC" },
    });
    if (existing) return existing;

    return this.collectionRepository.save(
      this.collectionRepository.create({
        name: "Ma Collection Principale",
        description: "Collection par défaut créée automatiquement",
        user,
      }),
    );
  }

  /** Resolves the card condition requested, or the one recorded on the order line. */
  private async resolveCardState(
    requestedItem: { condition?: string },
    orderItem: OrderItem,
  ): Promise<CardState | null> {
    const condition = requestedItem.condition || orderItem.productCondition;
    if (!condition) return null;
    return (
      (await this.cardStateRepository.findOne({
        where: [{ code: condition as CardStateCode }, { label: condition }],
      })) || null
    );
  }
}
