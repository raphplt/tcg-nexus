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
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { UserRole } from "src/common/enums/user";
import { User } from "src/user/entities/user.entity";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AdminOrderQueryDto } from "./dto/admin-order-query.dto";
import { SellerSalesQueryDto } from "./dto/seller-sales-query.dto";
import { StartCheckoutDto } from "./dto/start-checkout.dto";
import { UpdateFulfillmentDto } from "./dto/update-fulfillment.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { OrderService } from "./order.service";

@ApiTags("orders")
@Controller("marketplace")
@UseGuards(ThrottlerGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  /**
   * Initiates checkout by reserving stock and creating a Stripe PaymentIntent.
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
   * Confirms order completion using Stripe payment intent status verification.
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
   * Retrieves all orders placed by the current user.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("orders")
  getMyOrders(@CurrentUser() user: User) {
    return this.orderService.findOrdersByBuyerId(user.id);
  }

  /**
   * Retrieves pending sales and fulfillment tasks for the authenticated seller.
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
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("sales/revenue")
  getMyRevenue(@CurrentUser() user: User) {
    return this.orderService.getSellerRevenue(user.id);
  }

  /**
   * Updates fulfillment status and tracking info for an order item.
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
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("orders/:id")
  getOrderById(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.orderService.findOrderById(id, user.id);
  }

  /**
   * Administrative search for platform orders across buyers and sellers.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Get("admin/orders")
  getAllOrders(@Query() query: AdminOrderQueryDto) {
    return this.orderService.findAllOrders(query);
  }

  /**
   * Administrative retrieval of any order details.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Get("admin/orders/:id")
  getOrderAsAdmin(@Param("id", ParseIntPipe) id: number) {
    return this.orderService.findOrderByIdAsAdmin(id);
  }

  /**
   * Administrative order status override.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Patch("admin/orders/:id/status")
  updateOrderStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.transitionOrder(id, dto.status);
  }
}
