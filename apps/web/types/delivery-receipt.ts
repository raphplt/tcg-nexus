export interface ReceiptImportPreviewItem {
  orderItemId: number;
  productName: string;
  productImage: string | null;
  cardId: string | null;
  sealedProductId: string | null;
  quantity: number;
  unitPrice: number;
  currency: string;
  condition: string | null;
  language: string | null;
  fulfillmentStatus: string;
  deliveredAt: string | null;
  alreadyImported: boolean;
  existingCollectionItemId: number | null;
  /** Copies of this line already received, in any collection. */
  importedQuantity: number;
  /** Copies of this line still available to receive. */
  remainingQuantity: number;
  /** Moment the buyer confirmed receiving this line. */
  receiptConfirmedAt: string | null;
}

export interface ReceiptImportPreviewResponse {
  orderId: number;
  isOrderDelivered: boolean;
  items: ReceiptImportPreviewItem[];
}

export interface ReceiptImportItem {
  orderItemId: number;
  condition?: string;
  variant?: string;
  storageLocation?: string;
  notes?: string;
  /** Copies to receive; defaults to the quantity not yet received. */
  quantity?: number;
  /** Idempotency key; a retry under the same key returns the existing receipt. */
  requestKey?: string;
}

export interface ReceiptImportRequest {
  collectionId?: string;
  items: ReceiptImportItem[];
  allowDuplicates?: boolean;
}

export interface ReceiptImportResult {
  importedCount: number;
  collectionId: string;
  items: any[];
}
