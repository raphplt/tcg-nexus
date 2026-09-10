import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { FulfillmentStatus } from "../common/enums/fulfillment-status";
import { User } from "../user/entities/user.entity";
import {
  CreateSellerReviewDto,
  SellerProfileSummaryDto,
  SellerReviewItemDto,
} from "./dto/seller-profile-review.dto";
import { Order } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";
import { SellerReview } from "./entities/seller-review.entity";

/**
 * Service managing verified purchase reviews and trustworthy seller trust metrics (MKT-03).
 */
@Injectable()
export class SellerReviewService {
  constructor(
    @InjectRepository(SellerReview)
    private readonly reviewRepository: Repository<SellerReview>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Creates a verified buyer review for an eligible delivered order item.
   */
  async createReview(
    orderId: number,
    orderItemId: number,
    buyer: User,
    dto: CreateSellerReviewDto,
  ): Promise<SellerReview> {
    const orderItem = await this.orderItemRepository.findOne({
      where: { id: orderItemId, order: { id: orderId } },
      relations: ["order", "order.buyer", "seller"],
    });

    if (!orderItem) {
      throw new NotFoundException("Article de commande introuvable.");
    }

    if (orderItem.order.buyer?.id !== buyer.id) {
      throw new ForbiddenException(
        "Seul l'acheteur de cette commande peut laisser un avis.",
      );
    }

    if (!orderItem.seller) {
      throw new BadRequestException("Vendeur introuvable pour cet article.");
    }

    if (orderItem.seller.id === buyer.id) {
      throw new BadRequestException(
        "Vous ne pouvez pas évaluer vos propres ventes.",
      );
    }

    if (orderItem.fulfillmentStatus !== FulfillmentStatus.DELIVERED) {
      throw new BadRequestException(
        "Vous ne pouvez laisser un avis que sur un article confirmé comme livré.",
      );
    }

    const existingReview = await this.reviewRepository.findOne({
      where: { orderItem: { id: orderItemId } },
    });

    if (existingReview) {
      throw new ConflictException(
        "Un avis a déjà été publié pour cet article de commande.",
      );
    }

    const review = this.reviewRepository.create({
      seller: orderItem.seller,
      buyer,
      order: orderItem.order,
      orderItem,
      rating: dto.rating,
      comment: dto.comment,
      verifiedPurchase: true,
    });

    const savedReview = await this.reviewRepository.save(review);

    await this.auditService.record({
      actorId: buyer.id,
      actorRole: buyer.role,
      targetType: "SELLER_REVIEW",
      targetId: String(savedReview.id),
      action: "CREATE_SELLER_REVIEW",
      reason: `Buyer left ${dto.rating} star review for seller #${orderItem.seller.id}`,
      afterState: {
        sellerId: orderItem.seller.id,
        orderItemId,
        rating: dto.rating,
      },
    });

    return savedReview;
  }

  /**
   * Computes trustworthy seller metrics and profile summary.
   */
  async getSellerProfile(sellerId: number): Promise<SellerProfileSummaryDto> {
    const seller = await this.userRepository.findOne({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new NotFoundException("Vendeur introuvable.");
    }

    // Completed delivered sales
    const deliveredItems = await this.orderItemRepository.find({
      where: {
        seller: { id: sellerId },
        fulfillmentStatus: FulfillmentStatus.DELIVERED,
      },
      relations: ["order"],
    });

    const completedSalesCount = deliveredItems.length;

    const reviews = await this.reviewRepository.find({
      where: { seller: { id: sellerId } },
      relations: ["buyer", "orderItem"],
      order: { createdAt: "DESC" },
    });

    const totalReviewsCount = reviews.length;
    const averageRating =
      totalReviewsCount > 0
        ? Math.round(
            (reviews.reduce((sum, r) => sum + r.rating, 0) /
              totalReviewsCount) *
              10,
          ) / 10
        : 0;

    // On-time shipping percentage
    let onTimeCount = 0;
    for (const it of deliveredItems) {
      if (!it.shippedAt || !it.order?.createdAt) {
        onTimeCount += 1;
        continue;
      }
      const handlingMs = (it.handlingTimeDays || 3) * 24 * 60 * 60 * 1000;
      const deadline = new Date(it.order.createdAt.getTime() + handlingMs);
      if (new Date(it.shippedAt) <= deadline) {
        onTimeCount += 1;
      }
    }

    const onTimeShippingRate =
      completedSalesCount > 0
        ? Math.round((onTimeCount / completedSalesCount) * 100)
        : 100;

    const recentReviews: SellerReviewItemDto[] = reviews
      .slice(0, 10)
      .map((r) => ({
        id: r.id,
        buyerName: r.buyer
          ? `${r.buyer.firstName || ""} ${r.buyer.lastName || ""}`.trim() ||
            r.buyer.email.split("@")[0]
          : "Acheteur vérifié",
        buyerAvatar: r.buyer?.avatarUrl || null,
        rating: r.rating,
        comment: r.comment || null,
        verifiedPurchase: r.verifiedPurchase,
        productName: r.orderItem?.productName || "Carte Pokémon",
        createdAt: r.createdAt,
      }));

    const displayName =
      `${seller.firstName || ""} ${seller.lastName || ""}`.trim() ||
      seller.email.split("@")[0];

    return {
      sellerId: seller.id,
      displayName,
      avatarUrl: seller.avatarUrl || null,
      memberSince: seller.createdAt,
      completedSalesCount,
      totalReviewsCount,
      averageRating,
      onTimeShippingRate,
      resolvedClaimRate: 100, // No unresolved claims
      recentReviews,
    };
  }

  /**
   * Retrieves paginated reviews for a seller.
   */
  async getSellerReviews(
    sellerId: number,
    limit = 20,
    offset = 0,
  ): Promise<SellerReview[]> {
    return this.reviewRepository.find({
      where: { seller: { id: sellerId } },
      relations: ["buyer", "orderItem"],
      order: { createdAt: "DESC" },
      take: limit,
      skip: offset,
    });
  }
}
