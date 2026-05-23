import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { User } from "../user/entities/user.entity";
import { UserFollowService } from "./user-follow.service";

@ApiTags("user-follow")
@Controller("users")
export class UserFollowController {
  constructor(private readonly followService: UserFollowService) {}

  @Post(":id/follow")
  @ApiBearerAuth()
  follow(
    @CurrentUser() currentUser: User,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.followService.follow(currentUser.id, id);
  }

  @Delete(":id/follow")
  @ApiBearerAuth()
  @HttpCode(204)
  async unfollow(
    @CurrentUser() currentUser: User,
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.followService.unfollow(currentUser.id, id);
  }

  @Public()
  @Get(":id/followers")
  getFollowers(@Param("id", ParseIntPipe) id: number) {
    return this.followService.listFollowers(id);
  }

  @Public()
  @Get(":id/following")
  getFollowing(@Param("id", ParseIntPipe) id: number) {
    return this.followService.listFollowing(id);
  }
}
