export interface SellerReview {
  id: number;
  sellerId: number;
  buyerId: number;
  orderId: number;
  orderItemId: number;
  rating: number;
  comment?: string | null;
  verifiedPurchase: boolean;
  buyer?: {
    id: number;
    username: string;
    avatarUrl?: string | null;
  } | null;
  orderItem?: {
    id: number;
    productName: string;
    productImage?: string | null;
    productCondition?: string | null;
  } | null;
  createdAt: string;
}

export interface SellerProfileSummary {
  sellerId: number;
  sellerName: string;
  avatarUrl?: string | null;
  memberSince: string;
  completedSalesCount: number;
  totalReviewsCount: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  recentReviews: SellerReview[];
}

export interface CreateSellerReviewDto {
  rating: number;
  comment?: string;
}
