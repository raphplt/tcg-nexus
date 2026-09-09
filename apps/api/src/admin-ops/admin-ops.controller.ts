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
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UserRole } from "../common/enums/user";
import { AdminOpsService } from "./admin-ops.service";
import {
  ExpireStaleOrdersDto,
  OpsMetricsResponseDto,
  QueryAuditLogsDto,
  RetryOutboxEventsDto,
  SettlementReconciliationResponseDto,
} from "./dto/admin-ops.dto";

/**
 * Administrative controller providing system operations, health telemetry,
 * audit investigation, outbox recovery, and financial reconciliation.
 */
@ApiTags("admin-ops")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("admin/ops")
export class AdminOpsController {
  constructor(private readonly adminOpsService: AdminOpsService) {}

  /**
   * Retrieves aggregated operational health metrics across checkout, outbox,
   * settlements, claims, and tournaments.
   */
  @Get("metrics")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Retrieve operational telemetry metrics" })
  @ApiResponse({
    status: 200,
    description: "Operational telemetry metrics",
    type: OpsMetricsResponseDto,
  })
  async getMetrics(): Promise<OpsMetricsResponseDto> {
    return this.adminOpsService.getMetrics();
  }

  /**
   * Searches and filters domain audit logs with pagination.
   */
  @Get("audit-logs")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Query domain audit logs with filtering and pagination",
  })
  @ApiResponse({
    status: 200,
    description: "Paginated audit logs",
  })
  async queryAuditLogs(@Query() query: QueryAuditLogsDto) {
    return this.adminOpsService.queryAuditLogs(query);
  }

  /**
   * Manually replays failed transactional outbox domain events.
   */
  @Post("outbox/retry-failed")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Replay failed outbox domain events" })
  @ApiResponse({
    status: 200,
    description: "Outbox retry summary",
  })
  async retryFailedOutboxEvents(
    @Body() dto: RetryOutboxEventsDto,
    @Request() req: any,
  ) {
    return this.adminOpsService.retryFailedOutboxEvents(dto, req.user?.id);
  }

  /**
   * Sweeps and expires unpaid checkout orders past the reservation threshold,
   * restoring reserved listing quantities.
   */
  @Post("orders/expire-stale")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Expire stale pending checkout orders and restore stock",
  })
  @ApiResponse({
    status: 200,
    description: "Stale order sweep summary",
  })
  async expireStalePendingOrders(
    @Body() dto: ExpireStaleOrdersDto,
    @Request() req: any,
  ) {
    return this.adminOpsService.expireStalePendingOrders(dto, req.user?.id);
  }

  /**
   * Lists captures owed back to a buyer that have not been refunded yet.
   */
  @Get("payments/compensation")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "List payments captured against cancelled orders awaiting refund",
  })
  @ApiResponse({
    status: 200,
    description: "Payments owing compensation",
  })
  async listPaymentsAwaitingCompensation() {
    return this.adminOpsService.findPaymentsAwaitingCompensation();
  }

  /**
   * Refunds a capture that can no longer be honoured, once.
   */
  @Post("payments/:id/compensate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Refund a payment captured against a cancelled order",
  })
  @ApiResponse({
    status: 200,
    description: "Compensation outcome",
  })
  async compensatePayment(
    @Param("id", ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.adminOpsService.compensatePayment(id, req.user?.id);
  }

  /**
   * Verifies mathematical reconciliation between order allocations, seller accounts,
   * and completed disbursements.
   */
  @Get("settlement/reconcile")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Reconcile marketplace ledger against seller account balances",
  })
  @ApiResponse({
    status: 200,
    description: "Ledger reconciliation report",
    type: SettlementReconciliationResponseDto,
  })
  async reconcileSettlement(): Promise<SettlementReconciliationResponseDto> {
    return this.adminOpsService.reconcileSettlement();
  }
}
