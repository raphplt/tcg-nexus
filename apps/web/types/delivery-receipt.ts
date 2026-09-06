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
