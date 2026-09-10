import { PartialType } from "@nestjs/swagger";
import { CreateArticleDto } from "./create-article.dto";

/**
 * Payload used to update an existing article.
 */
export class UpdateArticleDto extends PartialType(CreateArticleDto) {}
