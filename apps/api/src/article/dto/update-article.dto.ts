import { PartialType } from "@nestjs/mapped-types";
import { CreateArticleDto } from "./create-article.dto";

/** Payload used to update an article. */
export class UpdateArticleDto extends PartialType(CreateArticleDto) {}
