import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
import { DataSource, EntityManager, Repository } from "typeorm";
import { InventoryMovementKind } from "../common/enums/inventory-movement";
import { ListingStatus } from "../common/enums/listing-status";
import { InventoryMovement } from "./entities/inventory-movement.entity";
import { Listing } from "./entities/listing.entity";
import { OrderItem } from "./entities/order-item.entity";
import { ReturnItem } from "./entities/return-item.entity";

/** One physical redistribution of a collection item's copies. */
interface Movement {
  kind: InventoryMovementKind;
  requestKey: string;
  available?: number;
  reserved?: number;
  sold?: number;
  listing?: Listing | null;
  orderItem?: OrderItem | null;
  returnItem?: ReturnItem | null;
  reason?: string | null;
}

/** Offer state of a listing before or after the transition being applied. */
interface ListingOffer {
  quantityAvailable: number;
  status: ListingStatus;
  deleted?: boolean;
}

/**
 * Owns the physical copies of collection items across listings, sales and returns
 * (INT-02, MKT-02).
 *
 * Each transition writes an append-only {@link InventoryMovement} under a row lock
 * on the collection item, keyed by the business event that caused it. Replaying a
 * transition therefore moves no copy twice, and a listing's reservation is an
 * explicit stored quantity rather than a value re-derived from its offer.
 */
@Injectable()
export class InventoryLedgerService {
  private readonly logger = new Logger(InventoryLedgerService.name);

  constructor(
    private readonly database: DataSource,
    @InjectRepository(InventoryMovement)
    private readonly movementRepository: Repository<InventoryMovement>,
  ) {}

  /** Runs work inside the caller's transaction, or opens one when called standalone. */
  private run<T>(
    manager: EntityManager | undefined,
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return manager
      ? work(manager)
      : this.database.transaction((transaction) => work(transaction));
  }

  /**
   * Applies one movement to a locked collection item exactly once.
   *
   * @returns The recorded movement, or null when its key was already applied.
   */
  async applyMovement(
    manager: EntityManager,
    collectionItemId: number,
    movement: Movement,
  ): Promise<InventoryMovement | null> {
    const available = movement.available ?? 0;
    const reserved = movement.reserved ?? 0;
    const sold = movement.sold ?? 0;
    if (
      available + reserved + sold !== 0 &&
      movement.kind !== InventoryMovementKind.OPENING_BALANCE
    ) {
      throw new BadRequestException(
        "An inventory movement must redistribute copies, not create them",
      );
    }
    if (!available && !reserved && !sold) return null;

    // Eager relations would join nullable sides, which PostgreSQL refuses to lock.
    const item = await manager.findOne(CollectionItem, {
      where: { id: collectionItemId },
      lock: { mode: "pessimistic_write" },
      loadEagerRelations: false,
    });
    // A collection item deleted by its owner leaves the listing unbacked; the
    // caller's own quantities stay authoritative and no movement is recorded.
    if (!item) return null;

    const existing = await manager.findOne(InventoryMovement, {
      where: {
        collectionItem: { id: collectionItemId },
        requestKey: movement.requestKey,
      },
    });
    if (existing) return null;

    // The first movement of an item adopts the quantities it already carried,
    // so its stored values stay explainable by the ledger from then on.
    if (
      movement.kind !== InventoryMovementKind.OPENING_BALANCE &&
      (await manager.count(InventoryMovement, {
        where: { collectionItem: { id: collectionItemId } },
      })) === 0
    ) {
      await this.applyMovement(manager, collectionItemId, {
        kind: InventoryMovementKind.OPENING_BALANCE,
        requestKey: `item:${collectionItemId}:opening`,
        available: item.quantityAvailable ?? 0,
        reserved: item.quantityReserved ?? 0,
        sold: item.quantitySold ?? 0,
        reason: "Quantities recorded before this item's first movement",
      });
    }

    const opening = movement.kind === InventoryMovementKind.OPENING_BALANCE;
    const nextAvailable = opening
      ? 0
      : (item.quantityAvailable ?? 0) + available;
    const nextReserved = opening ? 0 : (item.quantityReserved ?? 0) + reserved;
    const nextSold = opening ? 0 : (item.quantitySold ?? 0) + sold;
    if (nextAvailable < 0 || nextReserved < 0 || nextSold < 0) {
      throw new BadRequestException(
        "Insufficient physical copies for this inventory movement",
      );
    }

    const recorded = await manager.save(
      InventoryMovement,
      manager.create(InventoryMovement, {
        collectionItem: { id: collectionItemId } as CollectionItem,
        kind: movement.kind,
        deltaAvailable: available,
        deltaReserved: reserved,
        deltaSold: sold,
        listing: movement.listing ?? null,
        orderItem: movement.orderItem ?? null,
        returnItem: movement.returnItem ?? null,
        requestKey: movement.requestKey,
        reason: movement.reason ?? null,
      }),
    );

    if (movement.kind !== InventoryMovementKind.OPENING_BALANCE) {
      item.quantityAvailable = nextAvailable;
      item.quantityReserved = nextReserved;
      item.quantitySold = nextSold;
      await manager.save(CollectionItem, item);
    }

    return recorded;
  }

  /** Reports whether a listing state offers its copies to buyers. */
  private isOffering(offer: ListingOffer): boolean {
    return !offer.deleted && offer.status === ListingStatus.ACTIVE;
  }

  /** Copies a listing offers in a given state, which is what it must hold. */
  private heldFor(offer: ListingOffer): number {
    return this.isOffering(offer) ? Math.max(0, offer.quantityAvailable) : 0;
  }

  /**
   * Reserves or releases the exact difference between a listing's previous and
   * next offer, covering activation, deactivation, quantity edits and deletion.
   *
   * Copies committed to pending orders stay reserved: only the offered quantity
   * moves, so deactivating twice, or deleting an already inactive listing,
   * releases nothing further.
   *
   * @param listing - Listing being transitioned, with its `inventoryItem` relation.
   * @param previous - Offer state currently persisted.
   * @param next - Offer state the caller is about to persist.
   * @param cause - Short, stable label identifying the transition for its movement key.
   * @returns The listing's reservation after the transition.
   */
  async syncListingReservation(
    manager: EntityManager,
    listing: Listing,
    previous: ListingOffer,
    next: ListingOffer,
    cause: string,
  ): Promise<number> {
    const held = listing.inventoryReservedQuantity ?? 0;
    if (!listing.isInventoryBacked || !listing.inventoryItem?.id) return held;

    const delta = this.heldFor(next) - this.heldFor(previous);
    if (delta === 0) return held;

    // Repeated deactivate/reactivate cycles are legitimate, so each movement is
    // identified by its own revision rather than by the states it moved between.
    const revision = (listing.reservationRevision ?? 0) + 1;
    const applied = await this.applyMovement(
      manager,
      listing.inventoryItem.id,
      {
        kind:
          delta > 0
            ? InventoryMovementKind.LISTING_RESERVE
            : InventoryMovementKind.LISTING_RELEASE,
        requestKey: `listing:${listing.id}:rev:${revision}`,
        available: -delta,
        reserved: delta,
        listing,
        reason: `Listing ${listing.id} ${delta > 0 ? "reserved" : "released"} ${Math.abs(delta)} copies (${cause})`,
      },
    );
    if (!applied) return held;

    const reserved = Math.max(0, held + delta);
    listing.inventoryReservedQuantity = reserved;
    listing.reservationRevision = revision;
    await manager.update(
      Listing,
      { id: listing.id },
      { inventoryReservedQuantity: reserved, reservationRevision: revision },
    );
    return reserved;
  }

  /**
   * Transfers reserved copies to sold when an order is paid.
   *
   * The listing stops holding them, so a later deactivation or deletion cannot
   * release copies the buyer already owns.
   */
  async commitSale(
    manager: EntityManager,
    listing: Listing,
    orderItem: OrderItem,
    quantity: number,
  ): Promise<void> {
    if (!listing.isInventoryBacked || !listing.inventoryItem?.id) return;

    const applied = await this.applyMovement(
      manager,
      listing.inventoryItem.id,
      {
        kind: InventoryMovementKind.SALE_COMMIT,
        requestKey: `order-item:${orderItem.id}:sold`,
        reserved: -quantity,
        sold: quantity,
        listing,
        orderItem,
        reason: `Order item ${orderItem.id} paid`,
      },
    );
    if (!applied) return;

    await manager.update(
      Listing,
      { id: listing.id },
      {
        inventoryReservedQuantity: Math.max(
          0,
          (listing.inventoryReservedQuantity ?? 0) - quantity,
        ),
      },
    );
  }

  /**
   * Returns physically received copies to sellable stock, once per disposition.
   *
   * A still-offered inventory-backed listing takes the copies back into its own
   * reservation; otherwise they return to the collection as freely available.
   *
   * @param revision - Disposition revision, which makes the movement key unique.
   */
  async restockReturn(
    manager: EntityManager,
    returnItem: ReturnItem,
    listing: Listing | null,
    quantity: number,
    revision: number,
  ): Promise<boolean> {
    if (quantity <= 0) return false;
    const item = listing?.isInventoryBacked ? listing.inventoryItem : null;
    const offering =
      !!listing &&
      this.isOffering({
        quantityAvailable: listing.quantityAvailable,
        status: listing.status,
      });

    if (item?.id) {
      const applied = await this.applyMovement(manager, item.id, {
        kind: offering
          ? InventoryMovementKind.RETURN_RESTOCK_TO_LISTING
          : InventoryMovementKind.RETURN_RESTOCK_TO_COLLECTION,
        requestKey: `return:${returnItem.id}:rev:${revision}`,
        sold: -quantity,
        reserved: offering ? quantity : 0,
        available: offering ? 0 : quantity,
        listing,
        returnItem,
        reason: `Return ${returnItem.id} restocked ${quantity} copies`,
      });
      if (!applied) return false;
    }

    if (listing && offering) {
      await manager.increment(
        Listing,
        { id: listing.id },
        "quantityAvailable",
        quantity,
      );
      if (item?.id) {
        await manager.increment(
          Listing,
          { id: listing.id },
          "inventoryReservedQuantity",
          quantity,
        );
      }
    }
    this.logger.log(
      `Return ${returnItem.id} restocked ${quantity} copies (revision ${revision})`,
    );
    return true;
  }

  /**
   * Reverses a restock whose disposition was corrected to a non-sellable outcome.
   *
   * The copies go back to sold: they left the seller's stock with the buyer's
   * order and the corrected inspection says they cannot be offered again.
   */
  async reverseRestock(
    manager: EntityManager,
    returnItem: ReturnItem,
    listing: Listing | null,
    quantity: number,
    revision: number,
  ): Promise<boolean> {
    if (quantity <= 0) return false;
    const item = listing?.isInventoryBacked ? listing.inventoryItem : null;
    const offering =
      !!listing &&
      this.isOffering({
        quantityAvailable: listing.quantityAvailable,
        status: listing.status,
      });

    if (item?.id) {
      const applied = await this.applyMovement(manager, item.id, {
        kind: InventoryMovementKind.RETURN_RESTOCK_REVERSED,
        requestKey: `return:${returnItem.id}:rev:${revision}`,
        sold: quantity,
        reserved: offering ? -quantity : 0,
        available: offering ? 0 : -quantity,
        listing,
        returnItem,
        reason: `Return ${returnItem.id} restock reversed for ${quantity} copies`,
      });
      if (!applied) return false;
    }

    if (listing && offering) {
      const remaining = Math.max(0, listing.quantityAvailable - quantity);
      await manager.update(
        Listing,
        { id: listing.id },
        {
          quantityAvailable: remaining,
          ...(item?.id
            ? {
                inventoryReservedQuantity: Math.max(
                  0,
                  (listing.inventoryReservedQuantity ?? 0) - quantity,
                ),
              }
            : {}),
        },
      );
    }
    return true;
  }

  /**
   * Lists the movements recorded for one collection item, newest first.
   */
  async getMovements(
    collectionItemId: number,
    manager?: EntityManager,
  ): Promise<InventoryMovement[]> {
    return this.run(manager, async (transaction) =>
      transaction.find(InventoryMovement, {
        where: { collectionItem: { id: collectionItemId } },
        order: { createdAt: "DESC" },
      }),
    );
  }

  /**
   * Verifies that a collection item's stored quantities match its movements.
   *
   * Items predating the ledger carry an opening movement, so a mismatch means a
   * write bypassed this service rather than an unexplained legacy balance.
   */
  async reconcileItem(collectionItemId: number): Promise<{
    tracked: boolean;
    consistent: boolean;
    mismatches: string[];
  }> {
    const item = await this.movementRepository.manager.findOne(CollectionItem, {
      where: { id: collectionItemId },
    });
    if (!item)
      return {
        tracked: false,
        consistent: false,
        mismatches: ["item not found"],
      };

    const movements = await this.movementRepository.find({
      where: { collectionItem: { id: collectionItemId } },
    });
    // An item that never moved carries no ledger history to compare it against.
    if (!movements.length)
      return { tracked: false, consistent: true, mismatches: [] };
    const sum = (pick: (movement: InventoryMovement) => number) =>
      movements.reduce((total, movement) => total + pick(movement), 0);

    const mismatches: string[] = [];
    const compare = (label: string, stored: number, ledger: number) => {
      if (stored !== ledger)
        mismatches.push(`${label}: stored ${stored} vs ledger ${ledger}`);
    };
    compare(
      "available",
      item.quantityAvailable ?? 0,
      sum((movement) => movement.deltaAvailable),
    );
    compare(
      "reserved",
      item.quantityReserved ?? 0,
      sum((movement) => movement.deltaReserved),
    );
    compare(
      "sold",
      item.quantitySold ?? 0,
      sum((movement) => movement.deltaSold),
    );

    return { tracked: true, consistent: mismatches.length === 0, mismatches };
  }
}
