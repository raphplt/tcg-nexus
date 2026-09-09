/**
 * Physical movement recorded by an append-only inventory ledger entry.
 *
 * Every change to a collection item's available, reserved or sold copies carries
 * one kind, so the quantities of a physical copy can be explained and replayed
 * safely.
 */
export enum InventoryMovementKind {
  /** Quantities recorded before the ledger existed, written once by its migration. */
  OPENING_BALANCE = "opening_balance",
  /** Copies held by a listing offered for sale. */
  LISTING_RESERVE = "listing_reserve",
  /** Copies returned to the collection when a listing stops offering them. */
  LISTING_RELEASE = "listing_release",
  /** Reserved copies transferred to sold when their order is paid. */
  SALE_COMMIT = "sale_commit",
  /** Sold copies physically received back and offered again by their listing. */
  RETURN_RESTOCK_TO_LISTING = "return_restock_to_listing",
  /** Sold copies physically received back into the collection, unlisted. */
  RETURN_RESTOCK_TO_COLLECTION = "return_restock_to_collection",
  /** Explicit reversal of a previously applied return restock. */
  RETURN_RESTOCK_REVERSED = "return_restock_reversed",
}
