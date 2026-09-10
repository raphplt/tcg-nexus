import { describe, expect, it, vi } from "vitest";
import {
  CURRENT_ONBOARDING_VERSION,
  onboardingService,
} from "@/services/onboarding.service";
import { authedFetch } from "@/utils/fetch";

vi.mock("@/utils/fetch", () => ({
  authedFetch: vi.fn(),
}));

describe("onboardingService", () => {
  it("loads the authenticated user's onboarding state", async () => {
    const state = { version: 0, status: "pending", updatedAt: null } as const;
    vi.mocked(authedFetch).mockResolvedValueOnce(state);

    await expect(onboardingService.getState()).resolves.toEqual(state);
    expect(authedFetch).toHaveBeenCalledWith("GET", "/users/me/onboarding");
  });

  it("persists a terminal outcome for the current version", async () => {
    const state = {
      version: CURRENT_ONBOARDING_VERSION,
      status: "skipped",
      updatedAt: "2026-09-10T08:00:00.000Z",
    } as const;
    vi.mocked(authedFetch).mockResolvedValueOnce(state);

    await expect(onboardingService.updateState("skipped")).resolves.toEqual(
      state,
    );
    expect(authedFetch).toHaveBeenCalledWith("PATCH", "/users/me/onboarding", {
      data: {
        version: CURRENT_ONBOARDING_VERSION,
        status: "skipped",
      },
    });
  });
});
