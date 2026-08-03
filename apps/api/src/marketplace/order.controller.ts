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

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("checkout")
  @ApiOperation({
    summary:
      "Crée la commande, réserve le stock et ouvre le paiement Stripe associé",
  })
  startCheckout(@Body() dto: StartCheckoutDto, @CurrentUser() user: User) {
    return this.orderService.startCheckout(dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("orders/:id/confirm")
  @ApiOperation({
    summary:
      "Confirme la commande à partir de l'état réel du paiement chez Stripe",
  })
  confirmOrder(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.orderService.confirmOrderPayment(id, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("orders")
  getMyOrders(@CurrentUser() user: User) {
    return this.orderService.findOrdersByBuyerId(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("sales")
  @ApiOperation({ summary: "Ventes à traiter par le vendeur connecté" })
  getMySales(@Query() query: SellerSalesQueryDto, @CurrentUser() user: User) {
    return this.orderService.findSalesBySellerId(user.id, query);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("sales/revenue")
  getMyRevenue(@CurrentUser() user: User) {
    return this.orderService.getSellerRevenue(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch("sales/:id/fulfillment")
  @ApiOperation({ summary: "Fait avancer l'expédition d'une ligne vendue" })
  updateFulfillment(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateFulfillmentDto,
    @CurrentUser() user: User,
  ) {
    return this.orderService.updateFulfillment(id, dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("orders/:id")
  getOrderById(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.orderService.findOrderById(id, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Get("admin/orders")
  getAllOrders(@Query() query: AdminOrderQueryDto) {
    return this.orderService.findAllOrders(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Get("admin/orders/:id")
  getOrderAsAdmin(@Param("id", ParseIntPipe) id: number) {
    return this.orderService.findOrderByIdAsAdmin(id);
  }

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
