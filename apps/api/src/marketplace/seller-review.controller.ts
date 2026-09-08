import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { ThrottlerGuard } from "@nestjs/throttler";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../user/entities/user.entity";
import { CreateSellerReviewDto } from "./dto/seller-profile-review.dto";
import { SellerReviewService } from "./seller-review.service";

/**
 * Controller managing verified seller reviews and trust profiles (MKT-03).
 */
@ApiTags("seller-reviews")
@Controller("marketplace")
@UseGuards(ThrottlerGuard)
export class SellerReviewController {
  constructor(private readonly reviewService: SellerReviewService) {}

  /**
   * Submits a verified buyer review on an eligible delivered order item.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("orders/:orderId/items/:itemId/review")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Submits a verified buyer review on an eligible delivered order item",
  })
  createReview(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Param("itemId", ParseIntPipe) itemId: number,
    @CurrentUser() user: User,
    @Body() dto: CreateSellerReviewDto,
  ) {
    return this.reviewService.createReview(orderId, itemId, user, dto);
  }

  /**
   * Retrieves public seller trust profile with aggregate performance metrics.
   */
  @Public()
  @Get("sellers/:id/profile")
  @ApiOperation({
    summary:
      "Retrieves public seller trust profile with rating, completed sales, and on-time shipment rate",
  })
  getSellerProfile(@Param("id", ParseIntPipe) id: number) {
    return this.reviewService.getSellerProfile(id);
  }

  /**
   * Retrieves paginated reviews for a specific seller.
   */
  @Public()
  @Get("sellers/:id/reviews")
  @ApiOperation({
    summary: "Retrieves paginated verified reviews for a specific seller",
  })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "offset", required: false, type: Number })
  getSellerReviews(
    @Param("id", ParseIntPipe) id: number,
    @Query("limit") limit?: number,
    @Query("offset") offset?: number,
  ) {
    return this.reviewService.getSellerReviews(
      id,
      limit ? +limit : 20,
      offset ? +offset : 0,
    );
  }
}
