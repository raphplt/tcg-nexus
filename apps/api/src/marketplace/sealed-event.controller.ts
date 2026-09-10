import { Body, Controller, Ip, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ThrottlerGuard } from "@nestjs/throttler";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { User } from "../user/entities/user.entity";
import { CreateSealedEventDto } from "./dto/sealed-event.dto";
import { SealedEventService } from "./sealed-event.service";

/**
 * Controller handling sealed product interaction and telemetry events.
 */
@ApiTags("marketplace")
@Controller("marketplace")
export class SealedEventController {
  constructor(private readonly sealedEventService: SealedEventService) {}

  /**
   * Records a user engagement event on a sealed product (view, click, intent).
   *
   * @param dto - Sealed event details payload.
   * @param user - Current authenticated user if logged in.
   * @param ipAddress - Client IP address.
   * @param req - Express request object.
   * @returns Telemetry recording result.
   */
  @Post("sealed-events")
  @Public()
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: "Record a sealed product interaction event" })
  @ApiResponse({
    status: 201,
    description: "Sealed product event successfully recorded",
  })
  @ApiResponse({ status: 400, description: "Invalid event payload" })
  async recordEvent(
    @Body() dto: CreateSealedEventDto,
    @CurrentUser() user?: User,
    @Ip() ipAddress?: string,
    @Req() req?: any,
  ) {
    await this.sealedEventService.recordEvent(
      dto,
      user?.id,
      ipAddress,
      req?.headers?.["user-agent"] as string | undefined,
      dto.sessionId,
    );

    return { success: true };
  }
}
