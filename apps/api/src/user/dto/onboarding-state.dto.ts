import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { OnboardingStatus } from "../user-onboarding.constants";

/** Current persisted product-onboarding state for an authenticated user. */
export class OnboardingStateDto {
  @ApiProperty({ example: 1 })
  version: number;

  @ApiProperty({ enum: OnboardingStatus })
  status: OnboardingStatus;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  updatedAt: Date | null;
}
