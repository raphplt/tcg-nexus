import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateCollectionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsString()
  @IsOptional()
  masterSetId?: string;

  /**
   * Owner sent by existing clients.
   *
   * NOTE: accepted but never read — the owner comes from the access token, so
   * the body cannot file a collection under someone else's account. It was a
   * required field before, which meant any caller omitting it got a 400; it
   * stays whitelisted so already-loaded pages keep working.
   */
  @IsNumber()
  @IsOptional()
  userId?: number;
}
