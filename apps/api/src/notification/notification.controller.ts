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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../user/entities/user.entity";
import { GetNotificationsQueryDto } from "./dto/get-notifications.query.dto";
import { RegisterTokenDto } from "./dto/register-token.dto";
import { NotificationService } from "./notification.service";

/**
 * Controller exposing endpoints for user notifications management and device push token registration.
 */
@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Retrieves paginated notifications for the current authenticated user.
   *
   * @param user Current authenticated user.
   * @param query Pagination and read/unread filter query parameters.
   * @returns Paginated list of notifications and unread counter.
   */
  @Get()
  @ApiOperation({
    summary: "Get paginated user notifications with optional filter",
  })
  findAll(@CurrentUser() user: User, @Query() query: GetNotificationsQueryDto) {
    return this.notificationService.getNotifications(
      user.id,
      query.page ?? 1,
      query.limit ?? 20,
      query.filter ?? "all",
    );
  }

  /**
   * Marks a specific notification as read.
   *
   * @param id Notification ID.
   * @param user Current authenticated user.
   * @returns Updated notification entity.
   */
  @Patch(":id/read")
  @ApiOperation({ summary: "Mark a notification as read" })
  @ApiParam({ name: "id", description: "Notification identifier" })
  markAsRead(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.notificationService.markAsRead(user.id, id);
  }

  /**
   * Marks all notifications belonging to the current user as read.
   *
   * @param user Current authenticated user.
   * @returns Confirmation or count of updated notifications.
   */
  @Patch("read-all")
  @ApiOperation({ summary: "Mark all user notifications as read" })
  markAllAsRead(@CurrentUser() user: User) {
    return this.notificationService.markAllAsRead(user.id);
  }

  /**
   * Deletes a specific notification belonging to the current user.
   *
   * @param id Notification ID.
   * @param user Current authenticated user.
   * @returns Deletion confirmation.
   */
  @Delete(":id")
  @ApiOperation({ summary: "Delete a specific notification" })
  @ApiParam({ name: "id", description: "Notification identifier" })
  remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.notificationService.deleteNotification(user.id, id);
  }

  /**
   * Registers a device push token (Expo, iOS, Android, Web) for remote notifications.
   *
   * @param user Current authenticated user.
   * @param registerTokenDto Device token and platform payload.
   * @returns Created or updated device token entity.
   */
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

  /**
   * Registers a device push token (alias route for backward compatibility).
   *
   * @param user Current authenticated user.
   * @param registerTokenDto Device token and platform payload.
   * @returns Created or updated device token entity.
   */
  @Post("register-device")
  @ApiOperation({
    summary: "Register a device token (ticket alias of /tokens)",
  })
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

  /**
   * Unregisters and removes an existing device push token.
   *
   * @param user Current authenticated user.
   * @param token Push notification token string to remove.
   * @returns Deletion confirmation.
   */
  @Delete("tokens/:token")
  @ApiOperation({ summary: "Unregister/remove a device token" })
  @ApiParam({ name: "token", description: "Device push token string" })
  unregisterToken(@CurrentUser() user: User, @Param("token") token: string) {
    return this.notificationService.unregisterToken(user.id, token);
  }
}
