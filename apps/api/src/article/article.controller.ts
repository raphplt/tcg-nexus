import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "src/auth/decorators/public.decorator";
import { ArticleService } from "./article.service";
import { CreateArticleDto } from "./dto/create-article.dto";
import { Roles } from "src/auth/decorators/roles.decorator";
import { RolesGuard } from "src/auth/guards/roles.guard";
import { UserRole } from "src/common/enums/user";
import { UpdateArticleDto } from "./dto/update-article.dto";

@ApiTags("articles")
@Controller("articles")
@UseGuards(RolesGuard)
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Post()
  @Roles(UserRole.ADMIN, "pro")
  create(@Body() createArticleDto: CreateArticleDto) {
    return this.articleService.create(createArticleDto);
  }

  @Get()
  @Public()
  findAll() {
    return this.articleService.findAll();
  }

  @Get(":id")
  @Public()
  findOne(@Param("id") id: string) {
    return this.articleService.findOne(+id);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN, "pro")
  update(@Param("id") id: string, @Body() updateArticleDto: UpdateArticleDto) {
    return this.articleService.update(+id, updateArticleDto);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  remove(@Param("id") id: string) {
    return this.articleService.remove(+id);
  }
}
