import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { UpdateOnboardingDto } from "./update-onboarding.dto";

describe("UpdateOnboardingDto", () => {
  it.each(["completed", "skipped"])("accepts the %s outcome", (status) => {
    const dto = plainToInstance(UpdateOnboardingDto, { version: 1, status });
    expect(validateSync(dto)).toHaveLength(0);
  });

  it.each([
    { version: 1, status: "pending" },
    { version: 1, status: "unknown" },
    { version: 2, status: "completed" },
  ])("rejects an unsupported state %#", (value) => {
    const dto = plainToInstance(UpdateOnboardingDto, value);
    expect(validateSync(dto).length).toBeGreaterThan(0);
  });
});
