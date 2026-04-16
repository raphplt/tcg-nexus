import {
  Controller,
  Get,
  Param,
  Patch,
  Request,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { NotificationService } from "./notification.service";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async findAll(@Request() req) {
    return this.notificationService.findAllForUser(req.user.id);
  }

  @Patch(":id/read")
  async markAsRead(@Param("id") id: string, @Request() req) {
    return this.notificationService.markAsRead(+id, req.user.id);
  }
}
