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
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UserRole } from "../common/enums/user";
import { User } from "../user/entities/user.entity";
import { ArticleService } from "./article.service";
import { AdminArticleQueryDto, ArticleQueryDto } from "./dto/article-query.dto";
import { CreateArticleDto } from "./dto/create-article.dto";
import { UpdateArticleDto } from "./dto/update-article.dto";

/**
 * Controller exposing public reading routes and role-protected editorial routes for articles.
 */
@ApiTags("articles")
@Controller("articles")
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  /**
   * Creates an editorial news or blog article.
   *
   * @param createArticleDto Article creation payload.
   * @param user Current authenticated author.
   * @returns Newly created article entity.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create an editorial article" })
  create(
    @Body() createArticleDto: CreateArticleDto,
    @CurrentUser() user: User,
  ) {
    return this.articleService.create(createArticleDto, user.id);
  }

  /**
   * Lists published articles matching optional search and locale filters.
   *
   * @param query Search, pagination, and locale query parameters.
   * @returns Paginated list of published articles.
   */
  @Get()
  @Public()
  @ApiOperation({ summary: "List published articles" })
  findAll(@Query() query: ArticleQueryDto) {
    return this.articleService.findAll(query);
  }

  /**
   * Lists all articles (including drafts) for editors and moderators.
   *
   * @param query Editorial filter and pagination query parameters.
   * @returns Paginated list of all articles.
   */
  @Get("admin")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all articles including drafts (Staff)" })
  findAllAdmin(@Query() query: AdminArticleQueryDto) {
    return this.articleService.findAllAdmin(query);
  }

  /**
   * Finds any article by ID for editors (including drafts).
   *
   * @param id Article identifier.
   * @returns Article entity.
   */
  @Get("admin/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Retrieve an article by ID for editors" })
  @ApiParam({ name: "id", description: "Article ID" })
  findOneAdmin(@Param("id", ParseIntPipe) id: number) {
    return this.articleService.findOne(id);
  }

  /**
   * Finds a published article by its URL slug.
   *
   * @param slug URL slug identifier.
   * @param locale Optional locale filter.
   * @returns Published article entity.
   */
  @Get("slug/:slug")
  @Public()
  @ApiOperation({ summary: "Retrieve a published article by slug" })
  @ApiParam({ name: "slug", description: "Article URL slug" })
  @ApiQuery({ name: "locale", required: false, type: String, example: "en" })
  findBySlug(@Param("slug") slug: string, @Query("locale") locale?: string) {
    return this.articleService.findBySlug(slug, locale);
  }

  /**
   * Finds a published article by its numeric identifier.
   *
   * @param id Article identifier.
   * @returns Published article entity.
   */
  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Retrieve a published article by ID" })
  @ApiParam({ name: "id", description: "Article ID" })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.articleService.findPublishedById(id);
  }

  /**
   * Updates an existing editorial article.
   *
   * @param id Article identifier.
   * @param updateArticleDto Updated fields.
   * @returns Updated article entity.
   */
  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update an editorial article" })
  @ApiParam({ name: "id", description: "Article ID" })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateArticleDto: UpdateArticleDto,
  ) {
    return this.articleService.update(id, updateArticleDto);
  }

  /**
   * Deletes an editorial article.
   *
   * @param id Article identifier.
   * @returns Deletion confirmation.
   */
  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete an editorial article" })
  @ApiParam({ name: "id", description: "Article ID" })
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.articleService.remove(id);
  }
}
