import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";

/**
 * Filter modes for retrieving user notifications.
 */
export enum NotificationFilter {
  ALL = "all",
  READ = "read",
  UNREAD = "unread",
}

/**
 * Query parameters for paginating and filtering notifications.
 */
export class GetNotificationsQueryDto {
  @ApiPropertyOptional({
    description: "Page index (1-based)",
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Maximum notifications per page",
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: "Read status filter",
    enum: NotificationFilter,
    default: NotificationFilter.ALL,
  })
  @IsOptional()
  @IsEnum(NotificationFilter)
  filter?: NotificationFilter = NotificationFilter.ALL;
}
