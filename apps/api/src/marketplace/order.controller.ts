import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ThrottlerGuard } from "@nestjs/throttler";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UserRole } from "../common/enums/user";
import { User } from "../user/entities/user.entity";
import { AdminOrderQueryDto } from "./dto/admin-order-query.dto";
import { CreateClaimDto } from "./dto/create-claim.dto";
import { SellerSalesQueryDto } from "./dto/seller-sales-query.dto";
import { StartCheckoutDto } from "./dto/start-checkout.dto";
import { UpdateFulfillmentDto } from "./dto/update-fulfillment.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { OrderService } from "./order.service";

/**
 * Controller managing marketplace orders, checkout workflows, fulfillment, and claims.
 */
@ApiTags("orders")
@Controller("marketplace")
@UseGuards(ThrottlerGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  /**
   * Initiates checkout by reserving stock and creating a Stripe PaymentIntent.
   *
   * @param dto - Checkout initiation payload with listings and quantities.
   * @param user - Authenticated buyer.
   * @returns Checkout session details and payment client secret.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("checkout")
  @ApiOperation({
    summary:
      "Creates order, reserves stock, and opens associated Stripe payment session",
  })
  startCheckout(@Body() dto: StartCheckoutDto, @CurrentUser() user: User) {
    return this.orderService.startCheckout(dto, user);
  }

  /**
   * Retrieves active pending checkout session for the authenticated buyer.
   *
   * @param user - Authenticated buyer.
   * @returns Active checkout session with reserved items and expiration countdown.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("checkout/pending")
  @ApiOperation({
    summary:
      "Retrieves active pending checkout session with reserved items and countdown",
  })
  getPendingCheckout(@CurrentUser() user: User) {
    return this.orderService.findPendingCheckoutSession(user.id);
  }

  /**
   * Confirms order completion using Stripe payment intent status verification.
   *
   * @param id - Order unique identifier.
   * @param user - Authenticated buyer.
   * @returns Confirmed order details.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("orders/:id/confirm")
  @ApiOperation({
    summary:
      "Confirms order using actual payment intent status retrieved from Stripe",
  })
  confirmOrder(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.orderService.confirmOrderPayment(id, user);
  }

  /**
   * Cancels a pending order and releases reserved stock immediately.
   *
   * @param id - Order unique identifier.
   * @param user - Authenticated buyer.
   * @returns Cancellation confirmation.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("orders/:id/cancel")
  @ApiOperation({
    summary:
      "Cancels an unfinalized pending order and releases reserved stock immediately",
  })
  cancelPendingOrder(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.orderService.cancelPendingOrderByBuyer(id, user);
  }

  /**
   * Confirms delivery of an order item by the buyer (MKT-05).
   *
   * @param orderId - Order unique identifier.
   * @param itemId - Order item line identifier.
   * @param user - Authenticated buyer.
   * @returns Updated order item entity.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("orders/:orderId/items/:itemId/confirm-receipt")
  @ApiOperation({
    summary: "Confirms delivery of an order item by the buyer",
  })
  confirmItemReceipt(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Param("itemId", ParseIntPipe) itemId: number,
    @CurrentUser() user: User,
  ) {
    return this.orderService.confirmItemReceipt(orderId, itemId, user);
  }

  /**
   * Opens an item-specific claim or dispute (MKT-04).
   *
   * @param orderId - Order unique identifier.
   * @param itemId - Order item line identifier.
   * @param dto - Claim payload detailing dispute reason.
   * @param user - Authenticated buyer.
   * @returns Created claim resolution record.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("orders/:orderId/items/:itemId/claim")
  @ApiOperation({
    summary: "Opens an item-specific claim or dispute",
  })
  createItemClaim(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Param("itemId", ParseIntPipe) itemId: number,
    @Body() dto: CreateClaimDto,
    @CurrentUser() user: User,
  ) {
    return this.orderService.createItemClaim(orderId, itemId, dto, user);
  }

  /**
   * Retrieves all orders placed by the current user.
   *
   * @param user - Authenticated buyer.
   * @returns Array of orders placed by the user.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("orders")
  @ApiOperation({ summary: "List all orders placed by authenticated user" })
  getMyOrders(@CurrentUser() user: User) {
    return this.orderService.findOrdersByBuyerId(user.id);
  }

  /**
   * Retrieves pending sales and fulfillment tasks for the authenticated seller.
   *
   * @param query - Sales filter query.
   * @param user - Authenticated seller.
   * @returns Sold items requiring packaging and shipping.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("sales")
  @ApiOperation({
    summary:
      "Retrieves order sales requiring fulfillment for the authenticated seller",
  })
  getMySales(@Query() query: SellerSalesQueryDto, @CurrentUser() user: User) {
    return this.orderService.findSalesBySellerId(user.id, query);
  }

  /**
   * Retrieves revenue metrics for the authenticated seller.
   *
   * @param user - Authenticated seller.
   * @returns Revenue breakdown and pending payout calculations.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("sales/revenue")
  @ApiOperation({ summary: "Get seller sales and revenue summary" })
  getMyRevenue(@CurrentUser() user: User) {
    return this.orderService.getSellerRevenue(user.id);
  }

  /**
   * Updates fulfillment status and tracking info for an order item.
   *
   * @param id - Order item line identifier.
   * @param dto - Fulfillment update payload (tracking number, carrier).
   * @param user - Authenticated seller.
   * @returns Updated order item line.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch("sales/:id/fulfillment")
  @ApiOperation({
    summary:
      "Updates fulfillment status and tracking information for a sold order item",
  })
  updateFulfillment(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateFulfillmentDto,
    @CurrentUser() user: User,
  ) {
    return this.orderService.updateFulfillment(id, dto, user);
  }

  /**
   * Retrieves details of a specific order owned by the user.
   *
   * @param id - Order unique identifier.
   * @param user - Authenticated buyer.
   * @returns Order entity with item lines.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("orders/:id")
  @ApiOperation({ summary: "Get order details by ID for authenticated buyer" })
  getOrderById(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.orderService.findOrderById(id, user.id);
  }

  /**
   * Administrative search for platform orders across buyers and sellers.
   *
   * @param query - Administrative order filter parameters.
   * @returns Paginated platform orders.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Get("admin/orders")
  @ApiOperation({
    summary: "List platform orders across all users (Admin only)",
  })
  getAllOrders(@Query() query: AdminOrderQueryDto) {
    return this.orderService.findAllOrders(query);
  }

  /**
   * Administrative retrieval of any order details.
   *
   * @param id - Order unique identifier.
   * @returns Complete order entity.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Get("admin/orders/:id")
  @ApiOperation({ summary: "Get complete order details as administrator" })
  getOrderAsAdmin(@Param("id", ParseIntPipe) id: number) {
    return this.orderService.findOrderByIdAsAdmin(id);
  }

  /**
   * Administrative order status override.
   *
   * @param id - Order unique identifier.
   * @param dto - Status update payload.
   * @returns Updated order entity.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Patch("admin/orders/:id/status")
  @ApiOperation({ summary: "Override order status as administrator" })
  updateOrderStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.transitionOrder(id, dto.status);
  }
}
