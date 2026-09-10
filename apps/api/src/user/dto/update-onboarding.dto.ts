import { ApiProperty } from "@nestjs/swagger";
import { Equals, IsIn, IsInt } from "class-validator";
import {
  CURRENT_ONBOARDING_VERSION,
  OnboardingStatus,
} from "../user-onboarding.constants";

/** Records a terminal outcome for the current product-onboarding version. */
export class UpdateOnboardingDto {
  @ApiProperty({ example: CURRENT_ONBOARDING_VERSION })
  @IsInt()
  @Equals(CURRENT_ONBOARDING_VERSION)
  version: number;

  @ApiProperty({
    enum: [OnboardingStatus.COMPLETED, OnboardingStatus.SKIPPED],
  })
  @IsIn([OnboardingStatus.COMPLETED, OnboardingStatus.SKIPPED])
  status: OnboardingStatus.COMPLETED | OnboardingStatus.SKIPPED;
}
