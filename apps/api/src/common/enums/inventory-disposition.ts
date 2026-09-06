/**
 * Physical disposition decided after inspecting returned goods or handling refund claims.
 */
export enum InventoryDisposition {
  RESTOCK = "restock",
  DAMAGED = "damaged",
  DISCARDED = "discarded",
  NO_RETURN_REQUIRED = "no_return_required",
}
