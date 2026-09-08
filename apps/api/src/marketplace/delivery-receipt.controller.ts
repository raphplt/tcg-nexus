import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ThrottlerGuard } from "@nestjs/throttler";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../user/entities/user.entity";
import { DeliveryReceiptService } from "./delivery-receipt.service";
import { ReceiptImportRequestDto } from "./dto/delivery-receipt-import.dto";

/**
 * Controller managing delivery-to-collection receipt imports (INT-03).
 */
@ApiTags("delivery-receipt")
@Controller("marketplace")
@UseGuards(ThrottlerGuard)
export class DeliveryReceiptController {
  constructor(private readonly receiptService: DeliveryReceiptService) {}

  /**
   * Previews delivered items from an order with provenance and duplication detection.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("orders/:id/receipt-preview")
  @ApiOperation({
    summary:
      "Previews delivered items eligible for receipt import into user's collection",
  })
  getReceiptPreview(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.receiptService.getReceiptImportPreview(id, user);
  }

  /**
   * Imports confirmed received order items into target collection with provenance.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(["orders/:id/receipt-import", "orders/:id/import-to-collection"])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Imports delivered order items into user's collection with provenance and deduplication",
  })
  importDeliveredItems(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Body() dto: ReceiptImportRequestDto,
  ) {
    return this.receiptService.importDeliveredItems(id, user, dto);
  }
}
