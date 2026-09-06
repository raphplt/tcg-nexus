import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { ClaimCategory } from "src/common/enums/claim-category";

/**
 * Payload for opening an item-specific claim or dispute.
 */
export class CreateClaimDto {
  @IsEnum(ClaimCategory)
  claimCategory: ClaimCategory;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
