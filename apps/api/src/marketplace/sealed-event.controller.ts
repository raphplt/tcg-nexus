import { Body, Controller, Ip, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ThrottlerGuard } from "@nestjs/throttler";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { Public } from "src/auth/decorators/public.decorator";
import { User } from "src/user/entities/user.entity";
import { CreateSealedEventDto } from "./dto/sealed-event.dto";
import { SealedEventService } from "./sealed-event.service";

@ApiTags("marketplace")
@Controller("marketplace")
export class SealedEventController {
  constructor(private readonly sealedEventService: SealedEventService) {}

  @Post("sealed-events")
  @Public()
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: "Enregistre un événement de produit scellé" })
  @ApiResponse({ status: 201, description: "Événement enregistré" })
  @ApiResponse({ status: 400, description: "Requête invalide" })
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
