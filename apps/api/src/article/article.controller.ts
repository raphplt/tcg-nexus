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
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { Public } from "src/auth/decorators/public.decorator";
import { Roles } from "src/auth/decorators/roles.decorator";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { RolesGuard } from "src/auth/guards/roles.guard";
import { UserRole } from "src/common/enums/user";
import { User } from "src/user/entities/user.entity";
import { ArticleService } from "./article.service";
import { AdminArticleQueryDto, ArticleQueryDto } from "./dto/article-query.dto";
import { CreateArticleDto } from "./dto/create-article.dto";
import { UpdateArticleDto } from "./dto/update-article.dto";

/** Exposes public reading routes and role-protected editorial routes. */
@ApiTags("articles")
@Controller("articles")
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  /** Creates an editorial article. */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  create(
    @Body() createArticleDto: CreateArticleDto,
    @CurrentUser() user: User,
  ) {
    return this.articleService.create(createArticleDto, user.id);
  }

  /** Lists published articles. */
  @Get()
  @Public()
  findAll(@Query() query: ArticleQueryDto) {
    return this.articleService.findAll(query);
  }

  /** Lists articles for editors, including drafts. */
  @Get("admin")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  findAllAdmin(@Query() query: AdminArticleQueryDto) {
    return this.articleService.findAllAdmin(query);
  }

  /** Finds any article for editors. */
  @Get("admin/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  findOneAdmin(@Param("id", ParseIntPipe) id: number) {
    return this.articleService.findOne(id);
  }

  /** Finds a published article by slug. */
  @Get("slug/:slug")
  @Public()
  findBySlug(@Param("slug") slug: string, @Query("locale") locale?: string) {
    return this.articleService.findBySlug(slug, locale);
  }

  /** Finds a published article by its legacy identifier. */
  @Get(":id")
  @Public()
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.articleService.findPublishedById(id);
  }

  /** Updates an editorial article. */
  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateArticleDto: UpdateArticleDto,
  ) {
    return this.articleService.update(id, updateArticleDto);
  }

  /** Deletes an editorial article. */
  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.articleService.remove(id);
  }
}
