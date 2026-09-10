import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../user/entities/user.entity";
import { UserFollowService } from "./user-follow.service";

/**
 * Controller managing social graph connections (following and followers) between users.
 */
@ApiTags("user-follow")
@Controller("users")
export class UserFollowController {
  constructor(private readonly followService: UserFollowService) {}

  /**
   * Follows a target user.
   *
   * @param currentUser Authenticated follower user.
   * @param id Target user ID to follow.
   * @returns Created follow relationship entity.
   */
  @Post(":id/follow")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Follow a user" })
  @ApiParam({ name: "id", description: "Target user ID to follow" })
  @ApiResponse({ status: 201, description: "Successfully followed user" })
  follow(
    @CurrentUser() currentUser: User,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.followService.follow(currentUser.id, id);
  }

  /**
   * Unfollows a target user.
   *
   * @param currentUser Authenticated follower user.
   * @param id Target user ID to unfollow.
   */
  @Delete(":id/follow")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOperation({ summary: "Unfollow a user" })
  @ApiParam({ name: "id", description: "Target user ID to unfollow" })
  @ApiResponse({ status: 204, description: "Successfully unfollowed user" })
  async unfollow(
    @CurrentUser() currentUser: User,
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.followService.unfollow(currentUser.id, id);
  }

  /**
   * Retrieves the list of followers for a given user.
   *
   * @param id User ID.
   * @returns Array of follower profiles.
   */
  @Public()
  @Get(":id/followers")
  @ApiOperation({ summary: "List followers of a user" })
  @ApiParam({ name: "id", description: "User ID" })
  getFollowers(@Param("id", ParseIntPipe) id: number) {
    return this.followService.listFollowers(id);
  }

  /**
   * Retrieves the list of users followed by a given user.
   *
   * @param id User ID.
   * @returns Array of followed user profiles.
   */
  @Public()
  @Get(":id/following")
  @ApiOperation({ summary: "List users followed by a user" })
  @ApiParam({ name: "id", description: "User ID" })
  getFollowing(@Param("id", ParseIntPipe) id: number) {
    return this.followService.listFollowing(id);
  }
}
