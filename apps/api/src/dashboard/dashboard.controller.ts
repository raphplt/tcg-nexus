import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../user/entities/user.entity";
import { DashboardService } from "./dashboard.service";
import { DashboardResponseDto } from "./dto/dashboard-response.dto";

/**
 * Controller providing aggregated player dashboard metrics and telemetry.
 */
@ApiTags("dashboard")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Retrieves comprehensive dashboard metrics for the authenticated user.
   *
   * @param user - Authenticated user entity.
   * @returns Aggregated statistics covering collection, tournaments, decks, marketplace, and activity.
   */
  @Get()
  @ApiOperation({
    summary: "Get aggregated dashboard statistics for the authenticated user",
  })
  @ApiResponse({
    status: 200,
    description: "Aggregated user dashboard statistics.",
  })
  async getDashboard(@CurrentUser() user: User): Promise<DashboardResponseDto> {
    return this.dashboardService.getDashboard(user);
  }
}
