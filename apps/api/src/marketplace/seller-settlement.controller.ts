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
import { ThrottlerGuard } from "@nestjs/throttler";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UserRole } from "../common/enums/user";
import { User } from "../user/entities/user.entity";
import {
  AdminProcessPayoutDto,
  RequestPayoutDto,
  UpdatePayoutSettingsDto,
} from "./dto/seller-settlement.dto";
import { SellerSettlementService } from "./seller-settlement.service";

/**
 * Controller managing seller settlement accounts, allocations, and payout disbursements (MKT-06).
 */
@ApiTags("seller-settlement")
@Controller("marketplace")
@UseGuards(ThrottlerGuard)
export class SellerSettlementController {
  constructor(
    private readonly settlementService: SellerSettlementService,
  ) {}

  /**
   * Retrieves current settlement account balances and settings for the authenticated seller.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("seller/settlement/summary")
  @ApiOperation({
    summary:
      "Retrieves current seller account balances (pending, available, on-hold, paid out)",
  })
  getSellerSummary(@CurrentUser() user: User) {
    return this.settlementService.getSellerSummary(user.id);
  }

  /**
   * Retrieves order-level allocation ledger records for the authenticated seller.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("seller/settlement/allocations")
  @ApiOperation({
    summary: "Lists all order allocations, commissions, and net amounts for the seller",
  })
  getSellerAllocations(@CurrentUser() user: User) {
    return this.settlementService.getSellerAllocations(user.id);
  }

  /**
   * Retrieves payout request and execution history for the authenticated seller.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("seller/settlement/payouts")
  @ApiOperation({
    summary: "Lists payout requests and processing history for the seller",
  })
  getSellerPayouts(@CurrentUser() user: User) {
    return this.settlementService.getSellerPayouts(user.id);
  }

  /**
   * Updates payout preferences and bank details for the authenticated seller.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch("seller/settlement/settings")
  @ApiOperation({
    summary: "Updates payout bank information and preferred disbursement method",
  })
  updatePayoutSettings(
    @CurrentUser() user: User,
    @Body() dto: UpdatePayoutSettingsDto,
  ) {
    return this.settlementService.updatePayoutSettings(user.id, dto);
  }

  /**
   * Requests a payout from available balance.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(["seller/settlement/payouts", "seller/settlement/payouts/request"])
  @ApiOperation({
    summary: "Requests a payout disbursement from available seller balance",
  })
  requestPayout(@CurrentUser() user: User, @Body() dto: RequestPayoutDto) {
    return this.settlementService.requestPayout(user, dto);
  }

  /**
   * Administrative platform-wide settlement overview.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Get(["admin/payouts/overview", "admin/settlements/overview"])
  @ApiOperation({
    summary:
      "Administrative overview of platform balances, holds, and pending payouts",
  })
  getAdminOverview() {
    return this.settlementService.getAdminSettlementOverview();
  }

  /**
   * Administrative action to process, complete, or fail a payout request.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Post(["admin/payouts/:id/process", "admin/settlements/payouts/:id/process"])
  @ApiOperation({
    summary: "Processes, completes, or fails a seller payout disbursement",
  })
  adminProcessPayout(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() admin: User,
    @Body() dto: AdminProcessPayoutDto,
  ) {
    return this.settlementService.adminProcessPayout(id, admin, dto);
  }
}
