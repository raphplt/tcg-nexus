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
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../user/entities/user.entity";
import { CreateRefundDto } from "./dto/create-refund.dto";
import { CreateReturnDto } from "./dto/create-return.dto";
import { UpdateDispositionDto } from "./dto/update-disposition.dto";
import { RefundService } from "./refund.service";

/**
 * Controller exposing endpoints for order refunds, physical returns, and inventory dispositions.
 */
@ApiTags("refunds")
@Controller("marketplace")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  /**
   * Retrieves remaining refundable balance for an order.
   *
   * @param id - Order unique identifier.
   * @param user - Current authenticated user.
   * @returns Remaining authorized refundable amount.
   */
  @Get("orders/:id/refunds/remaining")
  @ApiOperation({ summary: "Calculates remaining refundable balance on order" })
  getRemainingRefundable(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.refundService.getAuthorizedRefundBalance(id, user);
  }

  /**
   * Lists all refund operations recorded for an order.
   *
   * @param id - Order unique identifier.
   * @param user - Current authenticated user.
   * @returns Array of refund operations.
   */
  @Get("orders/:id/refunds")
  @ApiOperation({ summary: "Lists refund operations for an order" })
  getOrderRefunds(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.refundService.findRefundsByOrder(id, user);
  }

  /**
   * Creates a partial or full refund on an order.
   *
   * @param id - Order unique identifier.
   * @param dto - Refund payload specifying lines and amount.
   * @param user - Current authenticated user.
   * @returns Newly created refund record.
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
   * Lists physical returns requested for an order.
   *
   * @param id - Order unique identifier.
   * @param user - Current authenticated user.
   * @returns Array of return requests.
   */
  @Get("orders/:id/returns")
  @ApiOperation({ summary: "Lists physical returns requested for an order" })
  getOrderReturns(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.refundService.findReturnsByOrder(id, user);
  }

  /**
   * Submits a physical return request on an order item.
   *
   * @param itemId - Order item line unique identifier.
   * @param dto - Return request payload.
   * @param user - Current authenticated user.
   * @returns Newly created return request.
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
   * Sets inspected inventory disposition (restock, discard, damaged) for a returned item.
   *
   * @param returnId - Return identifier.
   * @param dto - Disposition payload.
   * @param user - Current authenticated user.
   * @returns Updated return record.
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
