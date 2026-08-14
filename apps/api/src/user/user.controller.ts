import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  SerializeOptions,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "src/common/enums/user";
import { SELF_SERIALIZATION_GROUP } from "src/common/serialization-groups";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User } from "./entities/user.entity";
import { UserService } from "./user.service";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @SerializeOptions({ groups: [SELF_SERIALIZATION_GROUP] })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @SerializeOptions({ groups: [SELF_SERIALIZATION_GROUP] })
  findAll() {
    return this.userService.findAll();
  }

  @Get("me")
  @SerializeOptions({ groups: [SELF_SERIALIZATION_GROUP] })
  getProfile(@CurrentUser() user: User) {
    return this.userService.findOne(user.id);
  }

  @Public()
  @Get(":id/public")
  getPublicProfile(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() currentUser?: User,
  ) {
    return this.userService.findPublicProfile(id, currentUser?.id);
  }

  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @SerializeOptions({ groups: [SELF_SERIALIZATION_GROUP] })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }

  @Patch("me")
  @SerializeOptions({ groups: [SELF_SERIALIZATION_GROUP] })
  updateProfile(
    @CurrentUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(user.id, updateUserDto);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN)
  @SerializeOptions({ groups: [SELF_SERIALIZATION_GROUP] })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.userService.remove(id);
  }
}
