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
import { GetNotificationsQueryDto } from "./dto/get-notifications.query.dto";
import { RegisterTokenDto } from "./dto/register-token.dto";
import { NotificationService } from "./notification.service";

@ApiTags("notifications")
@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: "Get paginated user notifications with optional filter" })
  findAll(
    @CurrentUser() user: User,
    @Query() query: GetNotificationsQueryDto,
  ) {
    return this.notificationService.getNotifications(
      user.id,
      query.page ?? 1,
      query.limit ?? 20,
      query.filter ?? "all",
    );
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark a notification as read" })
  markAsRead(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.notificationService.markAsRead(user.id, id);
  }

  @Patch("read-all")
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

  @Post("register-device")
  @ApiOperation({ summary: "Register a device token (ticket alias of /tokens)" })
  registerDevice(
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
