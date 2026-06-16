import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../user/entities/user.entity";
import { UserFollow } from "./entities/user-follow.entity";
import { UserFollowController } from "./user-follow.controller";
import { UserFollowService } from "./user-follow.service";

@Module({
  imports: [TypeOrmModule.forFeature([UserFollow, User])],
  controllers: [UserFollowController],
  providers: [UserFollowService],
  exports: [UserFollowService],
})
export class UserFollowModule {}
