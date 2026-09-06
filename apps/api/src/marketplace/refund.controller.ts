import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { User } from "src/user/entities/user.entity";
import { CreateRefundDto } from "./dto/create-refund.dto";
import { CreateReturnDto } from "./dto/create-return.dto";
import { UpdateDispositionDto } from "./dto/update-disposition.dto";
import { RefundService } from "./refund.service";

/**
 * Controller exposing endpoints for order refunds, returns and inventory dispositions.
 */
@ApiTags("refunds")
@Controller("marketplace")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  /**
   * Retrieves remaining refundable balance for an order.
   */
  @Get("orders/:id/refunds/remaining")
  @ApiOperation({ summary: "Calculates remaining refundable balance on order" })
  getRemainingRefundable(@Param("id", ParseIntPipe) id: number) {
    return this.refundService.calculateRemainingRefundable(id);
  }

  /**
   * Lists all refund operations recorded for an order.
   */
  @Get("orders/:id/refunds")
  @ApiOperation({ summary: "Lists refund operations for an order" })
  getOrderRefunds(@Param("id", ParseIntPipe) id: number) {
    return this.refundService.findRefundsByOrder(id);
  }

  /**
   * Creates a partial or full refund on an order.
   */
  @Post("orders/:id/refund")
  @ApiOperation({ summary: "Creates a partial or full refund for an order" })
  createRefund(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateRefundDto,
    @CurrentUser() user: User,
  ) {
    return this.refundService.createRefund(id, dto, user);
  }

  /**
   * Lists returns for an order.
   */
  @Get("orders/:id/returns")
  @ApiOperation({ summary: "Lists physical returns requested for an order" })
  getOrderReturns(@Param("id", ParseIntPipe) id: number) {
    return this.refundService.findReturnsByOrder(id);
  }

  /**
   * Submits a return request on an order item.
   */
  @Post("orders/:orderId/items/:itemId/returns")
  @ApiOperation({ summary: "Creates a return request for an order item" })
  createReturnRequest(
    @Param("itemId", ParseIntPipe) itemId: number,
    @Body() dto: CreateReturnDto,
    @CurrentUser() user: User,
  ) {
    return this.refundService.createReturnRequest(itemId, dto, user);
  }

  /**
   * Sets inspected inventory disposition for a returned item.
   */
  @Patch("returns/:returnId/disposition")
  @ApiOperation({
    summary: "Sets physical disposition (restock, damaged) for returned goods",
  })
  setDisposition(
    @Param("returnId") returnId: string,
    @Body() dto: UpdateDispositionDto,
    @CurrentUser() user: User,
  ) {
    return this.refundService.setReturnDisposition(returnId, dto, user);
  }
}
