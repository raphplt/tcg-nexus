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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { UserRole } from "../common/enums/user";
import { SELF_SERIALIZATION_GROUP } from "../common/serialization-groups";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateUserDto } from "./dto/create-user.dto";
import { AdminUpdateUserDto } from "./dto/admin-update-user.dto";
import { UpdateMyProfileDto } from "./dto/update-my-profile.dto";
import { UpdateOnboardingDto } from "./dto/update-onboarding.dto";
import { User } from "./entities/user.entity";
import { UserService } from "./user.service";
import { UserJourneyService } from "./user-journey.service";

/**
 * Controller exposing user management, personal profile, and user journey endpoints.
 */
@ApiTags("users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("users")
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly journeyService: UserJourneyService,
  ) {}

  /**
   * Administratively creates a new user account.
   *
   * @param createUserDto User account creation payload.
   * @returns Newly created user entity.
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @SerializeOptions({ groups: [SELF_SERIALIZATION_GROUP] })
  @ApiOperation({ summary: "Create a new user (Admin only)" })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  /**
   * Retrieves a paginated/full list of all registered users.
   *
   * @returns Array of user entities.
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @SerializeOptions({ groups: [SELF_SERIALIZATION_GROUP] })
  @ApiOperation({ summary: "Retrieve all users (Admin and Moderator)" })
  findAll() {
    return this.userService.findAll();
  }

  /**
   * Retrieves the authenticated user's own profile.
   *
   * @param user Current authenticated user.
   * @returns User profile entity.
   */
  @Get("me")
  @SerializeOptions({ groups: [SELF_SERIALIZATION_GROUP] })
  @ApiOperation({ summary: "Retrieve current user profile" })
  getProfile(@CurrentUser() user: User) {
    return this.userService.findOne(user.id);
  }

  /**
   * Retrieves actionable task items for the authenticated user's journey.
   *
   * @param user Current authenticated user.
   * @returns Aggregated actionable journey steps.
   */
  @Get("me/journey/next-actions")
  @ApiOperation({ summary: "Retrieve pending user journey actions" })
  getMyJourneyNextActions(@CurrentUser() user: User) {
    return this.journeyService.getNextActions(user);
  }

  /**
   * Retrieves the authenticated user's product-onboarding state.
   *
   * @param user Current authenticated user.
   * @returns Persisted onboarding state.
   */
  @Get("me/onboarding")
  @ApiOperation({ summary: "Retrieve current user onboarding state" })
  getMyOnboarding(@CurrentUser() user: User) {
    return this.userService.getOnboardingState(user.id);
  }

  /**
   * Records completion or dismissal of the current product onboarding.
   *
   * @param user Current authenticated user.
   * @param updateOnboardingDto Terminal onboarding outcome.
   * @returns Updated onboarding state.
   */
  @Patch("me/onboarding")
  @ApiOperation({ summary: "Update current user onboarding state" })
  updateMyOnboarding(
    @CurrentUser() user: User,
    @Body() updateOnboardingDto: UpdateOnboardingDto,
  ) {
    return this.userService.updateOnboardingState(user.id, updateOnboardingDto);
  }

  /**
   * Retrieves public profile and gameplay stats for a specified user ID.
   *
   * @param id Target user unique identifier.
   * @param currentUser Optional authenticated user to determine follow status.
   * @returns Public user profile data.
   */
  @Public()
  @Get(":id/public")
  @ApiOperation({ summary: "Retrieve public user profile and stats" })
  @ApiParam({ name: "id", type: Number, description: "Target user ID" })
  getPublicProfile(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() currentUser?: User,
  ) {
    return this.userService.findPublicProfile(id, currentUser?.id);
  }

  /**
   * Retrieves detailed user entity by unique identifier.
   *
   * @param id Target user unique identifier.
   * @returns User profile entity.
   */
  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @SerializeOptions({ groups: [SELF_SERIALIZATION_GROUP] })
  @ApiOperation({
    summary: "Retrieve user details by ID (Admin and Moderator)",
  })
  @ApiParam({ name: "id", type: Number, description: "Target user ID" })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }

  /**
   * Updates the personal profile attributes of the authenticated user.
   *
   * @param user Current authenticated user.
   * @param updateMyProfileDto Profile update payload.
   * @returns Updated user profile entity.
   */
  @Patch("me")
  @SerializeOptions({ groups: [SELF_SERIALIZATION_GROUP] })
  @ApiOperation({ summary: "Update authenticated user personal profile" })
  updateProfile(
    @CurrentUser() user: User,
    @Body() updateMyProfileDto: UpdateMyProfileDto,
  ) {
    return this.userService.updateOwnProfile(user.id, updateMyProfileDto);
  }

  /**
   * Administratively updates user attributes and permissions by ID.
   *
   * @param id Target user unique identifier.
   * @param adminUpdateUserDto Administrative update payload.
   * @returns Updated user entity.
   */
  @Patch(":id")
  @Roles(UserRole.ADMIN)
  @SerializeOptions({ groups: [SELF_SERIALIZATION_GROUP] })
  @ApiOperation({ summary: "Administratively update user by ID (Admin only)" })
  @ApiParam({ name: "id", type: Number, description: "Target user ID" })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() adminUpdateUserDto: AdminUpdateUserDto,
  ) {
    return this.userService.update(id, adminUpdateUserDto);
  }

  /**
   * Administratively removes a user account by ID.
   *
   * @param id Target user unique identifier.
   * @returns Deletion confirmation result.
   */
  @Delete(":id")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Administratively delete user by ID (Admin only)" })
  @ApiParam({ name: "id", type: Number, description: "Target user ID" })
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.userService.remove(id);
  }
}
