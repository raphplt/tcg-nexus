import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

/**
 * Payload for creating a new user collection or tracking a master set.
 */
export class CreateCollectionDto {
  @ApiPropertyOptional({
    description: "Display name of the collection",
    example: "Base Set Binder",
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: "Description of the collection purpose",
    example: "Complete vintage collection in near mint condition",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: "Whether the collection is publicly visible to other users",
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: "Associated catalog set identifier if tracking a set",
    example: "base1",
  })
  @IsString()
  @IsOptional()
  masterSetId?: string;

  @ApiPropertyOptional({
    description: "Completion tracking policy ('base' or 'master')",
    example: "base",
  })
  @IsString()
  @IsOptional()
  completionPolicy?: string;

  /**
   * Owner sent by existing clients.
   *
   * NOTE: accepted but never read — the owner comes from the access token, so
   * the body cannot file a collection under someone else's account. It was a
   * required field before, which meant any caller omitting it got a 400; it
   * stays whitelisted so already-loaded pages keep working.
   */
  @ApiPropertyOptional({
    description: "Legacy owner identifier (overridden by authenticated user)",
  })
  @IsNumber()
  @IsOptional()
  userId?: number;
}
