import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { ResetMatchDto } from "./match-operations.dto";

describe("Match operation DTOs", () => {
  it("requires a meaningful reset reason", () => {
    const validDto = plainToInstance(ResetMatchDto, {
      reason: "Erreur de saisie du score",
    });
    expect(validateSync(validDto)).toHaveLength(0);

    const missingReason = plainToInstance(ResetMatchDto, {});
    expect(validateSync(missingReason).length).toBeGreaterThan(0);

    const tooLongReason = plainToInstance(ResetMatchDto, {
      reason: "x".repeat(301),
    });
    expect(validateSync(tooLongReason).length).toBeGreaterThan(0);
  });
});
