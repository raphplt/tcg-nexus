import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { User } from "src/user/entities/user.entity";
import { RegisterTokenDto } from "./dto/register-token.dto";
import { NotificationService } from "./notification.service";

@ApiTags("notifications")
@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: "Get paginated user notifications" })
  findAll(
    @CurrentUser() user: User,
    @Query("page") page = "1",
    @Query("limit") limit = "20",
  ) {
    return this.notificationService.getNotifications(
      user.id,
      Number(page),
      Number(limit),
    );
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark a notification as read" })
  markAsRead(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.notificationService.markAsRead(user.id, id);
  }

  @Post("read-all")
  @ApiOperation({ summary: "Mark all user notifications as read" })
  markAllAsRead(@CurrentUser() user: User) {
    return this.notificationService.markAllAsRead(user.id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a specific notification" })
  remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.notificationService.deleteNotification(user.id, id);
  }

  @Post("tokens")
  @ApiOperation({ summary: "Register a device token for push notifications" })
  registerToken(
    @CurrentUser() user: User,
    @Body() registerTokenDto: RegisterTokenDto,
  ) {
    return this.notificationService.registerToken(
      user.id,
      registerTokenDto.token,
      registerTokenDto.platform,
    );
  }

  @Delete("tokens/:token")
  @ApiOperation({ summary: "Unregister/remove a device token" })
  unregisterToken(@CurrentUser() user: User, @Param("token") token: string) {
    return this.notificationService.unregisterToken(user.id, token);
  }
}
