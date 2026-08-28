import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { UserRole } from "src/common/enums/user";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import {
  DetailsReport,
  HealthService,
  ReadinessReport,
} from "./health.service";

/**
 * Controller exposing operational health checks: liveness, readiness, and administrator diagnostics.
 */
@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Process liveness probe.
   * Confirms the NestJS event loop is responding.
   */
  @Public()
  @Get("live")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Process liveness check" })
  @ApiResponse({ status: 200, description: "Process is alive and responding" })
  getLiveness(): { status: "ok"; timestamp: string; uptime: number } {
    return this.healthService.getLiveness();
  }

  /**
   * Readiness probe validating database connectivity, vector extension, and dependencies.
   */
  @Public()
  @Get("ready")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "System readiness check" })
  @ApiResponse({
    status: 200,
    description: "System is ready to serve requests",
  })
  @ApiResponse({ status: 503, description: "Critical subsystem is down" })
  async getReadiness(): Promise<ReadinessReport> {
    const report = await this.healthService.getReadiness();
    if (report.status === "down") {
      throw new ServiceUnavailableException(report);
    }
    return report;
  }

  /**
   * Diagnostic details report reserved for administrators.
   */
  @Get("details")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Detailed administrative diagnostics" })
  @ApiResponse({ status: 200, description: "Detailed diagnostics report" })
  async getDetails(): Promise<DetailsReport> {
    return this.healthService.getDetails();
  }
}
